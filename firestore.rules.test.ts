/**
 * Security Rules Specification Verification Suite
 * Maps the 12 "Dirty Dozen" adversarial payloads from security_spec.md
 * to expected PERMISSION_DENIED outcomes against firestore.rules.
 */

export interface SecurityTestCase {
  id: string;
  name: string;
  collection: 'users' | 'docks' | 'trucks' | 'shipments';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  documentId: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
  enforcedBy: string;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 'DD-01',
    name: 'Unauthenticated list scrape on trucks',
    collection: 'trucks',
    operation: 'list',
    auth: null,
    documentId: '*',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isVerifiedUser() && resource.data.ownerId == request.auth.uid',
  },
  {
    id: 'DD-02',
    name: 'Cross-tenant PII read on another dispatcher user profile',
    collection: 'users',
    operation: 'get',
    auth: { uid: 'attacker_uid', email_verified: true },
    documentId: 'victim_uid',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isOwner(userId)',
  },
  {
    id: 'DD-03',
    name: 'Identity spoofing on shipment create',
    collection: 'shipments',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'user_a_SHP-9001',
    payload: { ownerId: 'user_b', shipmentId: 'SHP-9001' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidShipment(incoming()): data.ownerId == request.auth.uid',
  },
  {
    id: 'DD-04',
    name: 'Shadow field injection on create (isAdmin ghost field)',
    collection: 'shipments',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'user_a_SHP-9002',
    payload: { ownerId: 'user_a', shipmentId: 'SHP-9002', isAdmin: true },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidShipment(incoming()): data.keys().hasOnly([...])',
  },
  {
    id: 'DD-05',
    name: 'Shadow field injection on update',
    collection: 'trucks',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'user_a_TRK-204',
    payload: { status: 'Ready', verifiedBySystem: true },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidTruck(incoming()) && affectedKeys().hasOnly(...)',
  },
  {
    id: 'DD-06',
    name: 'Value poisoning on allowed status key',
    collection: 'trucks',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'user_a_TRK-204',
    payload: { status: 'HACKED_STATE' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: "isValidTruck(incoming()): data.status in ['Not started', 'Loading', 'Ready', 'Completed']",
  },
  {
    id: 'DD-07',
    name: 'Client timestamp forgery on create',
    collection: 'shipments',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'user_a_SHP-9003',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().createdAt == request.time && incoming().updatedAt == request.time',
  },
  {
    id: 'DD-08',
    name: 'Immutable ownerId tampering on shipment update',
    collection: 'shipments',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'user_a_SHP-4801',
    payload: { ownerId: 'user_b' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().ownerId == existing().ownerId && affectedKeys().hasOnly(...)',
  },
  {
    id: 'DD-09',
    name: 'Terminal state mutation on already dispatched truck',
    collection: 'trucks',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'user_a_TRK-551',
    payload: { status: 'Loading', inWarehouse: true },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'existing().inWarehouse == true',
  },
  {
    id: 'DD-10',
    name: 'Premature dispatch shortcut while status is Loading',
    collection: 'trucks',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'user_a_TRK-204',
    payload: { inWarehouse: false, status: 'Completed' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: "(existing().status == 'Ready' || existing().status == 'Completed')",
  },
  {
    id: 'DD-11',
    name: 'ID poisoning with oversized/malformed path ID',
    collection: 'shipments',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    documentId: 'A'.repeat(200),
    payload: { ownerId: 'user_a' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidId(shipmentDocId)',
  },
  {
    id: 'DD-12',
    name: 'Unverified email spoofing write attempt',
    collection: 'shipments',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: false },
    documentId: 'user_a_SHP-9004',
    payload: { ownerId: 'user_a' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isVerifiedUser(): request.auth.token.email_verified == true',
  },
];
