export type TruckStatus = 'Not started' | 'Loading' | 'Ready' | 'Completed';

export type TruckType =
  | 'Box Truck'
  | 'Container Freight'
  | 'Sleeper Semi'
  | 'Curtainsider'
  | 'Cargo Van';

export type TruckImageKey = 'box' | 'container' | 'semi' | 'curtainsider' | 'van';

export type NavSection =
  | 'dashboard'
  | 'fleet'
  | 'shipments'
  | 'warehouse'
  | 'routes'
  | 'reports';

export type ViewMode = 'grid' | 'list';

export type ShipmentPriority = 'Standard' | 'Priority' | 'Express';

export interface Dock {
  number: number;
  label: string;
  zone: 'North Bay' | 'Central Bay' | 'South Bay';
  bayType: 'Standard' | 'Refrigerated' | 'Express Van';
}

export interface Shipment {
  id: string;
  reference: string;
  customer: string;
  originCode: string;
  destinationCode: string;
  destinationCity: string;
  cargoDescription: string;
  weightKg: number;
  pallets: number;
  priority: ShipmentPriority;
  truckId: string | null;
  loadedPercent: number;
  scheduledDeparture: string;
  createdAt: string;
}

export interface Truck {
  id: string;
  plateNumber: string;
  vehicleType: TruckType;
  imageKey: TruckImageKey;
  status: TruckStatus;
  inWarehouse: boolean;
  dockNumber: number;
  driverName: string;
  driverPhone: string;
  originCode: string;
  destinationCode: string;
  destinationCity: string;
  maxCapacityKg: number;
  arrivedAt: string;
  scheduledDeparture: string;
  dockLead: string;
  sealNumber?: string;
}

export interface FilterState {
  search: string;
  status: TruckStatus | 'all';
  dock: number | 'all';
  vehicleType: TruckType | 'all';
}

export interface TruckLoadSummary {
  assignedShipments: Shipment[];
  loadedWeightKg: number;
  plannedWeightKg: number;
  progressPercent: number;
  capacityPercent: number;
  totalPallets: number;
}

export interface OverviewMetrics {
  trucksInside: number;
  loadingCount: number;
  readyTrucksCount: number;
  unassignedShipments: number;
  activeLoadingDocks: number;
  totalDocks: number;
  dockUsagePercent: number;
  shipmentsReadyForDispatch: number;
}

export interface WarehouseState {
  trucks: Truck[];
  shipments: Shipment[];
  docks: Dock[];
  lastUpdatedIso: string;
}
