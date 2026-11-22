import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { QuickShipmentInput } from '../components/QuickShipmentModal';
import {
  INITIAL_DOCKS,
  INITIAL_SHIPMENTS,
  INITIAL_TRUCKS,
} from '../data/initialWarehouseData';
import { Dock, Shipment, Truck, TruckStatus } from '../types/warehouse';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreError';

function sanitizeIdPart(raw: string, fallback: string, maxLen = 24): string {
  const cleaned = raw.replace(/[^A-Z0-9-]/gi, '').toUpperCase().slice(0, maxLen);
  return cleaned.length >= 3 ? cleaned : fallback;
}

function sanitizeHubCode(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
  return cleaned.length >= 2 ? cleaned : 'HUB';
}

function clampString(val: string, minFallback: string, maxLen: number): string {
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : minFallback;
}

function clampInt(val: number, min: number, max: number): number {
  const rounded = Math.round(Number.isFinite(val) ? val : min);
  return Math.max(min, Math.min(max, rounded));
}

export function makeDocId(uid: string, code: string): string {
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  return `${safeUid}_${safeCode}`;
}

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const displayName = clampString(user.displayName || 'Dispatcher', 'Dispatcher', 80);
    const email = clampString(user.email || 'dispatcher@fieldline.local', 'dispatcher@fieldline.local', 160);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        hubName: 'Newark Distribution Hub',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName,
        hubName: snap.data().hubName || 'Newark Distribution Hub',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedWarehouseDataIfEmpty(uid: string): Promise<boolean> {
  try {
    const docksQuery = query(collection(db, 'docks'), where('ownerId', '==', uid));
    const existingDocks = await getDocs(docksQuery);
    if (!existingDocks.empty) {
      return false;
    }

    const batch = writeBatch(db);

    for (const dock of INITIAL_DOCKS) {
      const dockRef = doc(db, 'docks', makeDocId(uid, `DOCK-${dock.number}`));
      batch.set(dockRef, {
        ownerId: uid,
        number: dock.number,
        label: dock.label,
        zone: dock.zone,
        bayType: dock.bayType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const truck of INITIAL_TRUCKS) {
      const truckRef = doc(db, 'trucks', makeDocId(uid, truck.id));
      batch.set(truckRef, {
        ownerId: uid,
        truckId: truck.id,
        plateNumber: truck.plateNumber,
        vehicleType: truck.vehicleType,
        imageKey: truck.imageKey,
        status: truck.status,
        inWarehouse: truck.inWarehouse,
        dockNumber: truck.dockNumber,
        driverName: truck.driverName,
        driverPhone: truck.driverPhone,
        originCode: truck.originCode,
        destinationCode: truck.destinationCode,
        destinationCity: truck.destinationCity,
        maxCapacityKg: truck.maxCapacityKg,
        arrivedAt: truck.arrivedAt,
        scheduledDeparture: truck.scheduledDeparture,
        dockLead: truck.dockLead,
        sealNumber: truck.sealNumber ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const shp of INITIAL_SHIPMENTS) {
      const shpRef = doc(db, 'shipments', makeDocId(uid, shp.id));
      batch.set(shpRef, {
        ownerId: uid,
        shipmentId: shp.id,
        reference: shp.reference,
        customer: shp.customer,
        originCode: shp.originCode,
        destinationCode: shp.destinationCode,
        destinationCity: shp.destinationCity,
        cargoDescription: shp.cargoDescription,
        weightKg: shp.weightKg,
        pallets: shp.pallets,
        priority: shp.priority,
        truckId: shp.truckId,
        loadedPercent: shp.loadedPercent,
        scheduledDeparture: shp.scheduledDeparture,
        createdAtLabel: shp.createdAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'docks,trucks,shipments');
  }
}

export interface WarehouseRealtimeHandlers {
  onDocks: (docks: Dock[]) => void;
  onTrucks: (trucks: Truck[]) => void;
  onShipments: (shipments: Shipment[]) => void;
  onError: (err: Error) => void;
}

export function subscribeWarehouseData(
  uid: string,
  handlers: WarehouseRealtimeHandlers
): () => void {
  const docksQ = query(collection(db, 'docks'), where('ownerId', '==', uid));
  const trucksQ = query(collection(db, 'trucks'), where('ownerId', '==', uid));
  const shipmentsQ = query(collection(db, 'shipments'), where('ownerId', '==', uid));

  const unsubDocks = onSnapshot(
    docksQ,
    (snapshot) => {
      const list: Dock[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            number: Number(data.number),
            label: String(data.label),
            zone: data.zone as Dock['zone'],
            bayType: data.bayType as Dock['bayType'],
          };
        })
        .sort((a, b) => a.number - b.number);
      handlers.onDocks(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'docks');
      } catch (e) {
        handlers.onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  const unsubTrucks = onSnapshot(
    trucksQ,
    (snapshot) => {
      const list: Truck[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data.truckId),
            plateNumber: String(data.plateNumber),
            vehicleType: data.vehicleType as Truck['vehicleType'],
            imageKey: data.imageKey as Truck['imageKey'],
            status: data.status as Truck['status'],
            inWarehouse: Boolean(data.inWarehouse),
            dockNumber: Number(data.dockNumber),
            driverName: String(data.driverName),
            driverPhone: String(data.driverPhone),
            originCode: String(data.originCode),
            destinationCode: String(data.destinationCode),
            destinationCity: String(data.destinationCity),
            maxCapacityKg: Number(data.maxCapacityKg),
            arrivedAt: String(data.arrivedAt),
            scheduledDeparture: String(data.scheduledDeparture),
            dockLead: String(data.dockLead),
            sealNumber: data.sealNumber ? String(data.sealNumber) : undefined,
          };
        })
        .sort((a, b) => a.dockNumber - b.dockNumber);
      handlers.onTrucks(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'trucks');
      } catch (e) {
        handlers.onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  const unsubShipments = onSnapshot(
    shipmentsQ,
    (snapshot) => {
      const list: Shipment[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data.shipmentId),
            reference: String(data.reference),
            customer: String(data.customer),
            originCode: String(data.originCode),
            destinationCode: String(data.destinationCode),
            destinationCity: String(data.destinationCity),
            cargoDescription: String(data.cargoDescription),
            weightKg: Number(data.weightKg),
            pallets: Number(data.pallets),
            priority: data.priority as Shipment['priority'],
            truckId: data.truckId ? String(data.truckId) : null,
            loadedPercent: Number(data.loadedPercent),
            scheduledDeparture: String(data.scheduledDeparture),
            createdAt: String(data.createdAtLabel || '14:00'),
          };
        })
        .sort((a, b) => {
          const aNum = Number.parseInt(a.id.replace(/\D/g, ''), 10) || 0;
          const bNum = Number.parseInt(b.id.replace(/\D/g, ''), 10) || 0;
          return bNum - aNum;
        });
      handlers.onShipments(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'shipments');
      } catch (e) {
        handlers.onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  return () => {
    unsubDocks();
    unsubTrucks();
    unsubShipments();
  };
}

export async function createQuickShipmentInCloud(
  uid: string,
  input: QuickShipmentInput,
  shipmentId: string,
  reference: string,
  createdAtLabel: string,
  targetTruck: Truck | undefined
): Promise<void> {
  const safeShipmentId = sanitizeIdPart(shipmentId, 'SHP-5000');
  const docId = makeDocId(uid, safeShipmentId);
  const path = `shipments/${docId}`;

  try {
    const batch = writeBatch(db);
    const shpRef = doc(db, 'shipments', docId);
    const safeDestCode = sanitizeHubCode(input.destinationCode);

    batch.set(shpRef, {
      ownerId: uid,
      shipmentId: safeShipmentId,
      reference: clampString(reference, 'PO-77900', 32),
      customer: clampString(input.customer, 'Regional Partner', 100),
      originCode: 'NY',
      destinationCode: safeDestCode,
      destinationCity: clampString(input.destinationCity, 'Newark, NJ', 80),
      cargoDescription: clampString(
        input.cargoDescription,
        'Palletized outbound commercial freight',
        160
      ),
      weightKg: clampInt(input.weightKg, 1, 50000),
      pallets: clampInt(input.pallets, 1, 100),
      priority: input.priority,
      truckId: input.truckId ? sanitizeIdPart(input.truckId, 'TRK-204') : null,
      loadedPercent: 0,
      scheduledDeparture: '17:30',
      createdAtLabel: clampString(createdAtLabel, '14:00', 16),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (
      targetTruck &&
      targetTruck.inWarehouse &&
      (targetTruck.status === 'Ready' || targetTruck.status === 'Completed')
    ) {
      const truckRef = doc(db, 'trucks', makeDocId(uid, targetTruck.id));
      batch.update(truckRef, {
        status: 'Loading',
        sealNumber: '',
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTruckStatusInCloud(
  uid: string,
  truck: Truck,
  newStatus: TruckStatus,
  assignedShipments: Shipment[]
): Promise<void> {
  const docId = makeDocId(uid, truck.id);
  const path = `trucks/${docId}`;
  try {
    const batch = writeBatch(db);
    const sealNumber =
      newStatus === 'Ready' || newStatus === 'Completed'
        ? truck.sealNumber || `SL-${Math.floor(884215 + Math.random() * 700)}`
        : '';

    batch.update(doc(db, 'trucks', docId), {
      status: newStatus,
      sealNumber,
      updatedAt: serverTimestamp(),
    });

    for (const shp of assignedShipments) {
      let nextPct = shp.loadedPercent;
      if (newStatus === 'Not started') nextPct = 0;
      else if (newStatus === 'Ready' || newStatus === 'Completed') nextPct = 100;
      else if (newStatus === 'Loading' && (shp.loadedPercent === 0 || shp.loadedPercent === 100)) {
        nextPct = 45;
      }

      if (nextPct !== shp.loadedPercent) {
        batch.update(doc(db, 'shipments', makeDocId(uid, shp.id)), {
          loadedPercent: nextPct,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function advanceTruckLoadInCloud(
  uid: string,
  truck: Truck,
  deltaPercent: number,
  assignedShipments: Shipment[]
): Promise<void> {
  if (assignedShipments.length === 0) return;
  const docId = makeDocId(uid, truck.id);
  const path = `trucks/${docId}`;

  try {
    const batch = writeBatch(db);
    let allComplete = true;

    for (const shp of assignedShipments) {
      const nextPct = clampInt(shp.loadedPercent + deltaPercent, 0, 100);
      if (nextPct < 100) allComplete = false;
      batch.update(doc(db, 'shipments', makeDocId(uid, shp.id)), {
        loadedPercent: nextPct,
        updatedAt: serverTimestamp(),
      });
    }

    batch.update(doc(db, 'trucks', docId), {
      status: allComplete ? 'Ready' : 'Loading',
      sealNumber: allComplete ? truck.sealNumber || 'SL-884302' : truck.sealNumber || '',
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function changeTruckDockInCloud(
  uid: string,
  truckId: string,
  newDockNumber: number
): Promise<void> {
  const docId = makeDocId(uid, truckId);
  const path = `trucks/${docId}`;
  try {
    await updateDoc(doc(db, 'trucks', docId), {
      dockNumber: clampInt(newDockNumber, 1, 50),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function assignShipmentInCloud(
  uid: string,
  shipmentId: string,
  targetTruck: Truck
): Promise<void> {
  const docId = makeDocId(uid, shipmentId);
  const path = `shipments/${docId}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'shipments', docId), {
      truckId: targetTruck.id,
      loadedPercent: 0,
      updatedAt: serverTimestamp(),
    });

    if (
      targetTruck.inWarehouse &&
      (targetTruck.status === 'Ready' || targetTruck.status === 'Completed')
    ) {
      batch.update(doc(db, 'trucks', makeDocId(uid, targetTruck.id)), {
        status: 'Loading',
        sealNumber: '',
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function unassignShipmentInCloud(
  uid: string,
  shipmentId: string
): Promise<void> {
  const docId = makeDocId(uid, shipmentId);
  const path = `shipments/${docId}`;
  try {
    await updateDoc(doc(db, 'shipments', docId), {
      truckId: null,
      loadedPercent: 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function dispatchTruckInCloud(
  uid: string,
  truckId: string
): Promise<void> {
  const docId = makeDocId(uid, truckId);
  const path = `trucks/${docId}`;
  try {
    await updateDoc(doc(db, 'trucks', docId), {
      inWarehouse: false,
      status: 'Completed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resetWarehouseDataInCloud(uid: string): Promise<void> {
  try {
    const [docksSnap, trucksSnap, shipmentsSnap] = await Promise.all([
      getDocs(query(collection(db, 'docks'), where('ownerId', '==', uid))),
      getDocs(query(collection(db, 'trucks'), where('ownerId', '==', uid))),
      getDocs(query(collection(db, 'shipments'), where('ownerId', '==', uid))),
    ]);

    const deleteBatch = writeBatch(db);
    docksSnap.forEach((d) => deleteBatch.delete(d.ref));
    trucksSnap.forEach((d) => deleteBatch.delete(d.ref));
    shipmentsSnap.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    await seedWarehouseDataIfEmpty(uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'docks,trucks,shipments');
  }
}
