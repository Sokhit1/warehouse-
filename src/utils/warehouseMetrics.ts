import {
  Dock,
  FilterState,
  OverviewMetrics,
  Shipment,
  Truck,
  TruckLoadSummary,
} from '../types/warehouse';

export function getTruckLoadSummary(
  truck: Truck,
  shipments: Shipment[]
): TruckLoadSummary {
  const assignedShipments = shipments.filter((s) => s.truckId === truck.id);
  const plannedWeightKg = assignedShipments.reduce((sum, s) => sum + s.weightKg, 0);
  const loadedWeightKg = Math.round(
    assignedShipments.reduce((sum, s) => sum + (s.weightKg * s.loadedPercent) / 100, 0)
  );
  const totalPallets = assignedShipments.reduce((sum, s) => sum + s.pallets, 0);

  let progressPercent = 0;
  if (truck.status === 'Not started') {
    progressPercent = 0;
  } else if (truck.status === 'Completed' || truck.status === 'Ready') {
    progressPercent =
      plannedWeightKg > 0 ? Math.min(100, Math.round((loadedWeightKg / plannedWeightKg) * 100)) : 100;
  } else if (plannedWeightKg > 0) {
    progressPercent = Math.min(100, Math.round((loadedWeightKg / plannedWeightKg) * 100));
  }

  const capacityPercent =
    truck.maxCapacityKg > 0
      ? Math.min(100, Math.round((loadedWeightKg / truck.maxCapacityKg) * 100))
      : 0;

  return {
    assignedShipments,
    loadedWeightKg,
    plannedWeightKg,
    progressPercent,
    capacityPercent,
    totalPallets,
  };
}

export function computeOverviewMetrics(
  trucks: Truck[],
  shipments: Shipment[],
  docks: Dock[]
): OverviewMetrics {
  const onSiteTrucks = trucks.filter((t) => t.inWarehouse);
  const trucksInside = onSiteTrucks.length;

  const loadingCount = onSiteTrucks.filter((t) => t.status === 'Loading').length;
  const readyTrucks = onSiteTrucks.filter(
    (t) => t.status === 'Ready' || t.status === 'Completed'
  );
  const readyTruckIds = new Set(readyTrucks.map((t) => t.id));

  const unassignedShipments = shipments.filter((s) => s.truckId === null).length;

  const occupiedDockNumbers = new Set(onSiteTrucks.map((t) => t.dockNumber));
  const activeLoadingDocks = occupiedDockNumbers.size;
  const totalDocks = docks.length;
  const dockUsagePercent =
    totalDocks > 0 ? Math.round((activeLoadingDocks / totalDocks) * 100) : 0;

  const shipmentsReadyForDispatch = shipments.filter(
    (s) => s.truckId !== null && readyTruckIds.has(s.truckId)
  ).length;

  return {
    trucksInside,
    loadingCount,
    readyTrucksCount: readyTrucks.length,
    unassignedShipments,
    activeLoadingDocks,
    totalDocks,
    dockUsagePercent,
    shipmentsReadyForDispatch,
  };
}

export function filterTrucks(trucks: Truck[], filters: FilterState): Truck[] {
  const query = filters.search.trim().toLowerCase();

  return trucks.filter((truck) => {
    if (!truck.inWarehouse) return false;

    if (filters.status !== 'all' && truck.status !== filters.status) {
      return false;
    }

    if (filters.dock !== 'all' && truck.dockNumber !== filters.dock) {
      return false;
    }

    if (filters.vehicleType !== 'all' && truck.vehicleType !== filters.vehicleType) {
      return false;
    }

    if (query) {
      const searchable = [
        truck.id,
        truck.driverName,
        truck.destinationCode,
        truck.destinationCity,
        `${truck.originCode} ${truck.destinationCode}`,
        `dock ${truck.dockNumber}`,
        `dock #${truck.dockNumber}`,
        truck.vehicleType,
      ]
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function formatWeight(kg: number): string {
  return `${kg.toLocaleString('en-US')} kg`;
}

export function formatLastUpdated(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Today, --:--';
  }
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return isToday
    ? `Today, ${time}`
    : `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

export function exportManifestCsv(trucks: Truck[], shipments: Shipment[]): void {
  const headers = [
    'Truck ID',
    'Status',
    'Vehicle Type',
    'Dock',
    'Driver',
    'Route',
    'Loaded Weight (kg)',
    'Planned Weight (kg)',
    'Progress (%)',
    'Assigned Shipments',
  ];

  const rows = trucks
    .filter((t) => t.inWarehouse)
    .map((truck) => {
      const summary = getTruckLoadSummary(truck, shipments);
      return [
        truck.id,
        truck.status,
        truck.vehicleType,
        `Dock #${truck.dockNumber}`,
        truck.driverName,
        `${truck.originCode} -> ${truck.destinationCode}`,
        String(summary.loadedWeightKg),
        String(summary.plannedWeightKg),
        `${summary.progressPercent}%`,
        summary.assignedShipments.map((s) => s.id).join(' | '),
      ];
    });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `fieldline-warehouse-manifest-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
