# Warehouse Operations Security Specification

## 1. Data Invariants

1. **Dispatcher Isolation (Zero-Trust Ownership)**: Every `/users/{userId}`, `/docks/{dockDocId}`, `/trucks/{truckDocId}`, and `/shipments/{shipmentDocId}` document is strictly scoped to a single verified dispatcher (`request.auth.uid`). Non-owners are denied all `get`, `list`, `create`, `update`, and `delete` operations.
2. **PII Protection**: Dispatcher `email` (in `/users/{userId}`) and driver `driverPhone` (in `/trucks/{truckDocId}`) are never readable by other authenticated or unauthenticated users.
3. **Strict Schema & No Shadow Fields**: Every create operation enforces exact required keys (`hasAll`) and allowed keys (`hasOnly`), strict types, string length bounds, enum allowlists, and regex checks on IDs.
4. **Action-Based Updates & Immutability**: Every update operation begins with `isValid[Entity](incoming())`, protects immutable fields (`ownerId`, `truckId`/`shipmentId`, `createdAt`), requires server timestamp `updatedAt == request.time`, and restricts mutated keys via `affectedKeys().hasOnly(...)`.
5. **Terminal State Locking**: Once a truck has been dispatched (`inWarehouse == false`), no further updates are permitted on that truck document.
6. **Verified Identity**: All read/write mutations require `request.auth != null && request.auth.token.email_verified == true`.
7. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid` directly without any `get()` or `exists()` calls.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated List Scrape**: Unauthenticated `list` on `/trucks` -> MUST return `PERMISSION_DENIED`.
2. **Cross-Tenant Read (PII Leak)**: User B attempts `get` on User A's `/users/{userA}` or `/trucks/{userA_TRK-204}` (contains `driverPhone`) -> MUST return `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: User A attempts `create` on `/shipments/{id}` with `ownerId: "user_b"` -> MUST return `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: User A creates a shipment with extra ghost field `isAdmin: true` -> MUST return `PERMISSION_DENIED`.
5. **Shadow Field Injection on Update**: User A updates truck status and injects ghost field `verifiedBySystem: true` -> MUST return `PERMISSION_DENIED`.
6. **Value Poisoning on Allowed Key**: User A updates truck `status` to `"HACKED"` or a 200-char string -> MUST return `PERMISSION_DENIED`.
7. **Client Timestamp Forgery**: User A creates a shipment with client-chosen `createdAt` instead of `request.time` -> MUST return `PERMISSION_DENIED`.
8. **Immutable Owner Tampering**: User A updates a shipment attempting to reassign `ownerId` -> MUST return `PERMISSION_DENIED`.
9. **Terminal State Mutation**: User A attempts to update `status` or `dockNumber` on a truck where `inWarehouse == false` -> MUST return `PERMISSION_DENIED`.
10. **Premature Dispatch Shortcut**: User A attempts to set `inWarehouse: false` while `existing().status == 'Loading'` -> MUST return `PERMISSION_DENIED`.
11. **ID Poisoning / Oversized Path ID**: User A attempts to write to `/shipments/${'A'.repeat(200)}` or invalid characters `../hack` -> MUST return `PERMISSION_DENIED`.
12. **Unverified Email Spoofing**: Authenticated user with `email_verified: false` attempts to create or update a shipment -> MUST return `PERMISSION_DENIED`.
