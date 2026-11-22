import {
  ArrowRight,
  Download,
  Package,
  Plus,
  Truck as TruckIcon,
} from 'lucide-react';
import { useState } from 'react';
import {
  Dock,
  NavSection,
  OverviewMetrics,
  Shipment,
  Truck,
} from '../types/warehouse';
import { formatWeight, getTruckLoadSummary } from '../utils/warehouseMetrics';
import { StatusBadge } from './StatusBadge';

interface SecondaryViewsProps {
  section: Exclude<NavSection, 'warehouse'>;
  trucks: Truck[];
  shipments: Shipment[];
  docks: Dock[];
  metrics: OverviewMetrics;
  onSelectTruck: (truckId: string) => void;
  onAssignShipment: (shipmentId: string, truckId: string) => void;
  onOpenQuickShipment: () => void;
  onGoToWarehouse: () => void;
  onExportCsv: () => void;
}

export function SecondaryViews({
  section,
  trucks,
  shipments,
  docks,
  metrics,
  onSelectTruck,
  onAssignShipment,
  onOpenQuickShipment,
  onGoToWarehouse,
  onExportCsv,
}: SecondaryViewsProps) {
  const [shipmentTab, setShipmentTab] = useState<'unassigned' | 'assigned' | 'all'>(
    'unassigned'
  );

  const onSiteTrucks = trucks.filter((t) => t.inWarehouse);

  if (section === 'dashboard') {
    const dockOccupancyMap = new Map<number, Truck>();
    onSiteTrucks.forEach((t) => dockOccupancyMap.set(t.dockNumber, t));

    return (
      <div className="space-y-5">
        {/* Dock Bay Occupancy Strip */}
        <section className="rounded-xl border border-[#E2E7E4] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#EDF1EF]">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-[#111916]">
                Loading bay map
              </h2>
              <p className="text-[12.5px] text-[#66756E]">
                {metrics.activeLoadingDocks} of {metrics.totalDocks} docks currently occupied across North, Central, and South bays.
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToWarehouse}
              className="text-[13px] font-medium text-[#145338] hover:underline"
            >
              Open warehouse floor →
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {docks.map((dock) => {
              const truck = dockOccupancyMap.get(dock.number);
              return (
                <button
                  key={dock.number}
                  type="button"
                  disabled={!truck}
                  onClick={() => truck && onSelectTruck(truck.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    truck
                      ? 'border-[#DCE2DF] bg-[#F8FAF9] hover:border-[#145338] cursor-pointer'
                      : 'border-dashed border-[#DCE2DF] bg-white text-[#7A8982] cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-semibold text-[#111916]">
                      {dock.label}
                    </span>
                    <span className="text-[10.5px] text-[#6B7A73]">{dock.zone.split(' ')[0]}</span>
                  </div>
                  {truck ? (
                    <div className="mt-2 space-y-1.5">
                      <p className="font-mono text-[13px] font-semibold text-[#145338]">
                        {truck.id}
                      </p>
                      <StatusBadge status={truck.status} compact />
                    </div>
                  ) : (
                    <p className="mt-3 text-[12px] text-[#7D8C85]">Open bay</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Ready to Depart Queue */}
        <section className="rounded-xl border border-[#E2E7E4] bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#EDF1EF] px-5 py-3.5">
            <h2 className="font-display text-[15px] font-semibold text-[#111916]">
              Cleared for departure
            </h2>
            <span className="font-mono text-[12px] text-[#66756E] tabular-nums">
              {metrics.readyTrucksCount} trucks
            </span>
          </div>
          <div className="divide-y divide-[#EDF1EF]">
            {onSiteTrucks
              .filter((t) => t.status === 'Ready' || t.status === 'Completed')
              .map((truck) => {
                const summary = getTruckLoadSummary(truck, shipments);
                return (
                  <div
                    key={truck.id}
                    onClick={() => onSelectTruck(truck.id)}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#F7F9F8] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13.5px] font-semibold text-[#111916]">
                        {truck.id}
                      </span>
                      <StatusBadge status={truck.status} compact />
                      <span className="text-[13px] text-[#4B5953]">
                        {truck.originCode} → {truck.destinationCode} · {truck.driverName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-[12.5px] text-[#324039] tabular-nums">
                      <span>Dock #{truck.dockNumber}</span>
                      <span>{formatWeight(summary.loadedWeightKg)}</span>
                      <span>Departs {truck.scheduledDeparture}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    );
  }

  if (section === 'shipments') {
    const filteredShipments = shipments.filter((s) => {
      if (shipmentTab === 'unassigned') return s.truckId === null;
      if (shipmentTab === 'assigned') return s.truckId !== null;
      return true;
    });

    return (
      <section className="rounded-xl border border-[#E2E7E4] bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF1EF] px-5 py-3.5">
          <div className="flex items-center gap-1 rounded-lg bg-[#F3F5F4] p-1">
            {(
              [
                ['unassigned', `Unassigned (${metrics.unassignedShipments})`],
                ['assigned', `Assigned (${shipments.length - metrics.unassignedShipments})`],
                ['all', `All (${shipments.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setShipmentTab(key)}
                className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors whitespace-nowrap ${
                  shipmentTab === key
                    ? 'bg-white text-[#111916] shadow-xs'
                    : 'text-[#5B6A63] hover:text-[#111916]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenQuickShipment}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-[#145338] px-3 text-[12.5px] font-semibold text-white hover:bg-[#0E3E29]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New shipment</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#EDF1EF] bg-[#F8FAF9] text-[12px] font-medium text-[#5E6D66]">
                <th className="py-2.5 pl-5 pr-3">Shipment</th>
                <th className="px-3 py-2.5">Consignee &amp; Cargo</th>
                <th className="px-3 py-2.5">Route</th>
                <th className="px-3 py-2.5 text-right">Weight</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="py-2.5 pl-3 pr-5">Truck assignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1EF]">
              {filteredShipments.map((shp) => (
                <tr key={shp.id} className="hover:bg-[#F8FAF9]">
                  <td className="py-3 pl-5 pr-3 align-top">
                    <p className="font-mono font-semibold text-[#111916]">{shp.id}</p>
                    <p className="font-mono text-[11.5px] text-[#6B7A73]">{shp.reference}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium text-[#1F2A24]">{shp.customer}</p>
                    <p className="text-[12px] text-[#66756E]">{shp.cargoDescription}</p>
                  </td>
                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-display font-semibold text-[#141C18]">
                      {shp.originCode}
                      <ArrowRight className="h-3 w-3 text-[#7A8982]" />
                      {shp.destinationCode}
                    </span>
                    <span className="block text-[11.5px] text-[#6B7A73]">
                      {shp.destinationCity}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right align-top font-mono tabular-nums whitespace-nowrap">
                    <p className="font-medium text-[#111916]">{formatWeight(shp.weightKg)}</p>
                    <p className="text-[11.5px] text-[#6B7A73]">{shp.pallets} pallets</p>
                  </td>
                  <td className="px-3 py-3 align-top text-[12.5px] text-[#4B5953]">
                    {shp.priority}
                  </td>
                  <td className="py-3 pl-3 pr-5 align-top">
                    {shp.truckId ? (
                      <button
                        type="button"
                        onClick={() => onSelectTruck(shp.truckId!)}
                        className="font-mono text-[12.5px] font-semibold text-[#145338] hover:underline"
                      >
                        {shp.truckId} ({shp.loadedPercent}%)
                      </button>
                    ) : (
                      <select
                        aria-label={`Assign truck for ${shp.id}`}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onAssignShipment(shp.id, e.target.value);
                          }
                        }}
                        className="h-8 rounded-md border border-[#DCE2DF] bg-white px-2 text-[12px] text-[#141C18] focus:border-[#145338] focus:outline-none"
                      >
                        <option value="">Assign to truck...</option>
                        {onSiteTrucks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} · Dock #{t.dockNumber} ({t.originCode}→{t.destinationCode})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[#66756E]">
                    <Package className="mx-auto mb-2 h-6 w-6 text-[#8C9B94]" />
                    No shipments in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (section === 'fleet') {
    return (
      <section className="rounded-xl border border-[#E2E7E4] bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EDF1EF] px-5 py-3.5">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-[#111916]">
              Fleet roster
            </h2>
            <p className="text-[12.5px] text-[#66756E]">
              {onSiteTrucks.length} vehicles on yard · {trucks.length - onSiteTrucks.length} dispatched
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#EDF1EF] bg-[#F8FAF9] text-[12px] font-medium text-[#5E6D66]">
                <th className="py-2.5 pl-5 pr-3">Truck ID</th>
                <th className="px-3 py-2.5">Type &amp; Plate</th>
                <th className="px-3 py-2.5">Driver</th>
                <th className="px-3 py-2.5">Location</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Max Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1EF]">
              {trucks.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => t.inWarehouse && onSelectTruck(t.id)}
                  className={t.inWarehouse ? 'cursor-pointer hover:bg-[#F8FAF9]' : 'opacity-65'}
                >
                  <td className="py-3 pl-5 pr-3 font-mono font-semibold text-[#111916]">
                    {t.id}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[#1F2A24]">{t.vehicleType}</span>
                    <span className="ml-1.5 font-mono text-[12px] text-[#6B7A73]">
                      · {t.plateNumber}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[#1F2A24]">{t.driverName}</span>
                    <span className="block font-mono text-[11.5px] text-[#6B7A73]">
                      {t.driverPhone}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12.5px] text-[#324039]">
                    {t.inWarehouse ? `Dock #${t.dockNumber}` : 'Departed gate'}
                  </td>
                  <td className="px-3 py-3">
                    {t.inWarehouse ? (
                      <StatusBadge status={t.status} compact />
                    ) : (
                      <span className="text-[12px] font-medium text-[#5B6A63]">In transit</span>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right font-mono tabular-nums text-[#324039]">
                    {formatWeight(t.maxCapacityKg)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (section === 'routes') {
    const laneMap = new Map<
      string,
      {
        code: string;
        city: string;
        trucks: Truck[];
        totalWeightKg: number;
        unassignedCount: number;
      }
    >();

    onSiteTrucks.forEach((t) => {
      const summary = getTruckLoadSummary(t, shipments);
      const existing = laneMap.get(t.destinationCode) ?? {
        code: t.destinationCode,
        city: t.destinationCity,
        trucks: [],
        totalWeightKg: 0,
        unassignedCount: 0,
      };
      existing.trucks.push(t);
      existing.totalWeightKg += summary.plannedWeightKg;
      laneMap.set(t.destinationCode, existing);
    });

    shipments
      .filter((s) => s.truckId === null)
      .forEach((s) => {
        const existing = laneMap.get(s.destinationCode) ?? {
          code: s.destinationCode,
          city: s.destinationCity,
          trucks: [],
          totalWeightKg: 0,
          unassignedCount: 0,
        };
        existing.unassignedCount += 1;
        existing.totalWeightKg += s.weightKg;
        laneMap.set(s.destinationCode, existing);
      });

    const lanes = Array.from(laneMap.values()).sort(
      (a, b) => b.totalWeightKg - a.totalWeightKg
    );

    return (
      <section className="rounded-xl border border-[#E2E7E4] bg-white overflow-hidden">
        <div className="border-b border-[#EDF1EF] px-5 py-3.5">
          <h2 className="font-display text-[15px] font-semibold text-[#111916]">
            Active outbound corridors
          </h2>
          <p className="text-[12.5px] text-[#66756E]">
            Aggregated freight weight and staging trucks per destination lane from Newark Hub (NY).
          </p>
        </div>
        <div className="divide-y divide-[#EDF1EF]">
          {lanes.map((lane) => (
            <div
              key={lane.code}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#F8FAF9]"
            >
              <div>
                <p className="flex items-center gap-1.5 font-display text-[14px] font-semibold text-[#111916]">
                  <span>NY</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#7A8982]" />
                  <span>{lane.code}</span>
                  <span className="font-sans text-[12.5px] font-normal text-[#617069]">
                    · {lane.city}
                  </span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[#5B6A63]">
                  {lane.trucks.length > 0 ? (
                    lane.trucks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelectTruck(t.id)}
                        className="font-mono font-medium text-[#145338] hover:underline"
                      >
                        {t.id} (Dock #{t.dockNumber})
                      </button>
                    ))
                  ) : (
                    <span>No truck assigned yet</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 text-right font-mono text-[12.5px] tabular-nums">
                <div>
                  <p className="text-[11px] font-sans text-[#6B7A73]">Total lane weight</p>
                  <p className="font-semibold text-[#111916]">
                    {formatWeight(lane.totalWeightKg)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-sans text-[#6B7A73]">Pending shipments</p>
                  <p className="font-semibold text-[#145338]">{lane.unassignedCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Reports View
  const totalLoadedKg = onSiteTrucks.reduce(
    (sum, t) => sum + getTruckLoadSummary(t, shipments).loadedWeightKg,
    0
  );
  const totalPlannedKg = onSiteTrucks.reduce(
    (sum, t) => sum + getTruckLoadSummary(t, shipments).plannedWeightKg,
    0
  );
  const avgProgress =
    onSiteTrucks.length > 0
      ? Math.round(
          onSiteTrucks.reduce(
            (sum, t) => sum + getTruckLoadSummary(t, shipments).progressPercent,
            0
          ) / onSiteTrucks.length
        )
      : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#E2E7E4] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF1EF] pb-4">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-[#111916]">
              Shift operational report
            </h2>
            <p className="text-[12.5px] text-[#66756E]">
              Live summary calculated from current dock assignments and shipment weights.
            </p>
          </div>
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#145338] px-3.5 text-[13px] font-semibold text-white hover:bg-[#0E3E29]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download manifest CSV</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#EDF1EF] bg-[#F8FAF9] p-4">
            <p className="text-[12px] text-[#66756E]">On-site cargo loaded</p>
            <p className="mt-1 font-mono text-[22px] font-semibold text-[#111916] tabular-nums">
              {formatWeight(totalLoadedKg)}
            </p>
            <p className="mt-1 text-[12px] text-[#6B7A73] tabular-nums">
              of {formatWeight(totalPlannedKg)} planned
            </p>
          </div>
          <div className="rounded-lg border border-[#EDF1EF] bg-[#F8FAF9] p-4">
            <p className="text-[12px] text-[#66756E]">Mean loading completion</p>
            <p className="mt-1 font-mono text-[22px] font-semibold text-[#145338] tabular-nums">
              {avgProgress}%
            </p>
            <p className="mt-1 text-[12px] text-[#6B7A73]">
              Across {onSiteTrucks.length} staged vehicles
            </p>
          </div>
          <div className="rounded-lg border border-[#EDF1EF] bg-[#F8FAF9] p-4">
            <p className="text-[12px] text-[#66756E]">Dock utilization</p>
            <p className="mt-1 font-mono text-[22px] font-semibold text-[#111916] tabular-nums">
              {metrics.dockUsagePercent}%
            </p>
            <p className="mt-1 text-[12px] text-[#6B7A73] tabular-nums">
              {metrics.activeLoadingDocks} active / {metrics.totalDocks} total bays
            </p>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="mb-3 font-display text-[13.5px] font-semibold text-[#111916]">
            Load completion by vehicle
          </h3>
          <div className="space-y-3">
            {onSiteTrucks.map((t) => {
              const summary = getTruckLoadSummary(t, shipments);
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTruck(t.id)}
                  className="cursor-pointer rounded-lg p-2 hover:bg-[#F7F9F8]"
                >
                  <div className="mb-1 flex items-center justify-between text-[12.5px]">
                    <div className="flex items-center gap-2">
                      <TruckIcon className="h-3.5 w-3.5 text-[#6B7A73]" />
                      <span className="font-mono font-semibold text-[#111916]">{t.id}</span>
                      <span className="text-[#66756E]">
                        {t.originCode} → {t.destinationCode} · Dock #{t.dockNumber}
                      </span>
                    </div>
                    <span className="font-mono font-medium text-[#111916] tabular-nums">
                      {summary.progressPercent}% ({formatWeight(summary.loadedWeightKg)})
                    </span>
                  </div>
                  <div className="progress-track-hatched h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-[#145338]"
                      style={{ width: `${summary.progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
