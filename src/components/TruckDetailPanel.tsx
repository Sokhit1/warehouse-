import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  Plus,
  Send,
  Truck as TruckIcon,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { TRUCK_IMAGES } from '../data/initialWarehouseData';
import {
  Dock,
  Shipment,
  Truck,
  TruckLoadSummary,
  TruckStatus,
} from '../types/warehouse';
import { formatWeight } from '../utils/warehouseMetrics';
import { StatusBadge } from './StatusBadge';

interface TruckDetailPanelProps {
  truck: Truck | null;
  loadSummary: TruckLoadSummary | null;
  dock: Dock | undefined;
  allDocks: Dock[];
  occupiedDockNumbers: Set<number>;
  unassignedShipments: Shipment[];
  onClose: () => void;
  onUpdateStatus: (truckId: string, status: TruckStatus) => void;
  onAdvanceLoad: (truckId: string, deltaPercent: number) => void;
  onChangeDock: (truckId: string, newDockNumber: number) => void;
  onAssignShipment: (shipmentId: string, truckId: string) => void;
  onUnassignShipment: (shipmentId: string) => void;
  onDispatchTruck: (truckId: string) => void;
}

const ALL_STATUSES: TruckStatus[] = ['Not started', 'Loading', 'Ready', 'Completed'];

export function TruckDetailPanel({
  truck,
  loadSummary,
  dock,
  allDocks,
  occupiedDockNumbers,
  unassignedShipments,
  onClose,
  onUpdateStatus,
  onAdvanceLoad,
  onChangeDock,
  onAssignShipment,
  onUnassignShipment,
  onDispatchTruck,
}: TruckDetailPanelProps) {
  const [selectedPendingId, setSelectedPendingId] = useState<string>('');
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setSelectedPendingId('');
    setImgFailed(false);
  }, [truck?.id]);

  useEffect(() => {
    if (!truck) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [truck, onClose]);

  if (!truck || !loadSummary) return null;

  const img = TRUCK_IMAGES[truck.imageKey];
  const sortedPending = [...unassignedShipments].sort((a, b) => {
    const aMatches = a.destinationCode === truck.destinationCode ? 0 : 1;
    const bMatches = b.destinationCode === truck.destinationCode ? 0 : 1;
    return aMatches - bMatches;
  });

  const canDispatch = truck.status === 'Ready' || truck.status === 'Completed';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="truck-detail-heading"
    >
      <div
        className="fixed inset-0 bg-[#101915]/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 flex h-full w-full max-w-[490px] flex-col border-l border-[#DCE2DF] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E5EAE7] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2
              id="truck-detail-heading"
              className="font-mono text-[18px] font-semibold tracking-tight text-[#111916]"
            >
              {truck.id}
            </h2>
            <StatusBadge status={truck.status} compact />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close truck detail panel"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5B6A63] hover:bg-[#F3F5F4] hover:text-[#111916] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Vehicle Visual + Capacity Strip */}
          <div className="overflow-hidden rounded-xl border border-[#E5EAE7] bg-[#F7F9F8]">
            <div className="flex h-[148px] items-center justify-center px-6 py-3">
              {imgFailed ? (
                <div className="flex flex-col items-center text-[#5B6A63]">
                  <TruckIcon className="h-10 w-10" />
                  <span className="mt-1 text-xs">{truck.vehicleType}</span>
                </div>
              ) : (
                <img
                  src={img.src}
                  alt={img.alt}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full max-h-[126px] w-full object-contain mix-blend-multiply"
                />
              )}
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#E5EAE7] border-t border-[#E5EAE7] bg-white px-2 py-2.5 text-center">
              <div>
                <p className="text-[11px] text-[#6B7A73]">Loaded weight</p>
                <p className="mt-0.5 font-mono text-[13px] font-semibold text-[#111916] tabular-nums">
                  {formatWeight(loadSummary.loadedWeightKg)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#6B7A73]">Planned manifest</p>
                <p className="mt-0.5 font-mono text-[13px] font-semibold text-[#111916] tabular-nums">
                  {formatWeight(loadSummary.plannedWeightKg)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#6B7A73]">Max payload</p>
                <p className="mt-0.5 font-mono text-[13px] font-semibold text-[#111916] tabular-nums">
                  {formatWeight(truck.maxCapacityKg)}
                </p>
              </div>
            </div>
          </div>

          {/* Load Progress & Status Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[13.5px] font-semibold text-[#111916]">
                Loading progress
              </h3>
              <span className="font-mono text-[13px] font-semibold text-[#145338] tabular-nums">
                {loadSummary.progressPercent}% ({loadSummary.totalPallets} pallets)
              </span>
            </div>

            <div className="progress-track-hatched h-2 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[#145338] transition-all duration-300"
                style={{ width: `${loadSummary.progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {ALL_STATUSES.map((status) => {
                const active = truck.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onUpdateStatus(truck.id, status)}
                    className={`rounded-lg border px-2 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'border-[#145338] bg-[#ECF5F0] text-[#114630] font-semibold'
                        : 'border-[#E2E7E4] bg-white text-[#4A5952] hover:bg-[#F7F9F8]'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            {truck.status !== 'Completed' && loadSummary.assignedShipments.length > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onAdvanceLoad(truck.id, 25)}
                  className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[#DCE2DF] bg-[#F7F9F8] px-3 text-[12.5px] font-medium text-[#1F2A24] hover:bg-[#EDF1EF] transition-colors"
                >
                  Log +25% loaded
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(truck.id, 'Ready')}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#BEE6DB] bg-[#E9F7F3] px-3 text-[12.5px] font-medium text-[#0E6455] hover:bg-[#D9F1EA] transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark ready</span>
                </button>
              </div>
            )}
          </div>

          <hr className="border-[#EDF1EF]" />

          {/* Route, Driver & Dock Metadata */}
          <div className="space-y-3">
            <h3 className="font-display text-[13.5px] font-semibold text-[#111916]">
              Dock &amp; dispatch information
            </h3>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <div>
                <dt className="text-[11.5px] text-[#6B7A73]">Outbound route</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-display font-semibold text-[#111916]">
                  <span>{truck.originCode}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#7A8982]" />
                  <span>{truck.destinationCode}</span>
                  <span className="font-sans text-[12px] font-normal text-[#5B6A63]">
                    ({truck.destinationCity})
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-[11.5px] text-[#6B7A73]">Vehicle &amp; plate</dt>
                <dd className="mt-0.5 text-[#141C18]">
                  {truck.vehicleType}{' '}
                  <span className="font-mono text-[12px] text-[#5B6A63]">
                    · {truck.plateNumber}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="flex items-center gap-1 text-[11.5px] text-[#6B7A73]">
                  <User className="h-3 w-3" /> Driver
                </dt>
                <dd className="mt-0.5 font-medium text-[#141C18]">{truck.driverName}</dd>
              </div>

              <div>
                <dt className="flex items-center gap-1 text-[11.5px] text-[#6B7A73]">
                  <Phone className="h-3 w-3" /> Contact
                </dt>
                <dd className="mt-0.5 font-mono text-[12.5px] text-[#324039]">
                  {truck.driverPhone}
                </dd>
              </div>

              <div>
                <dt className="flex items-center gap-1 text-[11.5px] text-[#6B7A73]">
                  <MapPin className="h-3 w-3" /> Assigned dock
                </dt>
                <dd className="mt-1">
                  <select
                    aria-label="Reassign loading dock"
                    value={truck.dockNumber}
                    onChange={(e) => onChangeDock(truck.id, Number(e.target.value))}
                    className="h-8 w-full rounded-md border border-[#DCE2DF] bg-white px-2 font-mono text-[12.5px] text-[#141C18] focus:border-[#145338] focus:outline-none"
                  >
                    {allDocks.map((d) => {
                      const isOccupiedByOther =
                        occupiedDockNumbers.has(d.number) && d.number !== truck.dockNumber;
                      return (
                        <option
                          key={d.number}
                          value={d.number}
                          disabled={isOccupiedByOther}
                        >
                          {d.label} ({d.zone}){isOccupiedByOther ? ' — Occupied' : ''}
                        </option>
                      );
                    })}
                  </select>
                </dd>
              </div>

              <div>
                <dt className="text-[11.5px] text-[#6B7A73]">Bay details</dt>
                <dd className="mt-1 text-[12.5px] text-[#324039]">
                  {dock ? `${dock.zone} · ${dock.bayType}` : `Bay #${truck.dockNumber}`}
                  <span className="block text-[11.5px] text-[#6B7A73]">
                    Lead: {truck.dockLead}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-[11.5px] text-[#6B7A73]">Yard arrival</dt>
                <dd className="mt-0.5 font-mono text-[12.5px] text-[#141C18] tabular-nums">
                  {truck.arrivedAt}
                </dd>
              </div>

              <div>
                <dt className="text-[11.5px] text-[#6B7A73]">Scheduled departure</dt>
                <dd className="mt-0.5 font-mono text-[12.5px] text-[#141C18] tabular-nums">
                  {truck.scheduledDeparture}
                  {truck.sealNumber && (
                    <span className="ml-1.5 text-[11px] text-[#145338]">
                      · Seal {truck.sealNumber}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <hr className="border-[#EDF1EF]" />

          {/* Assigned Shipments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[13.5px] font-semibold text-[#111916]">
                Assigned shipments ({loadSummary.assignedShipments.length})
              </h3>
            </div>

            {loadSummary.assignedShipments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#D3DCD7] bg-[#F8FAF9] px-4 py-5 text-center text-[13px] text-[#66756E]">
                No shipments assigned to {truck.id} yet. Assign one below or create a quick shipment.
              </div>
            ) : (
              <div className="divide-y divide-[#EDF1EF] rounded-lg border border-[#E5EAE7]">
                {loadSummary.assignedShipments.map((shp) => (
                  <div key={shp.id} className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12.5px] font-semibold text-[#111916]">
                            {shp.id}
                          </span>
                          <span className="text-[11.5px] text-[#6B7A73]">
                            {shp.reference} · {shp.priority}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] font-medium text-[#1F2A24]">
                          {shp.customer}
                        </p>
                        <p className="text-[12px] text-[#617069]">{shp.cargoDescription}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUnassignShipment(shp.id)}
                        className="shrink-0 text-[11.5px] font-medium text-[#6B7A73] hover:text-[#B91C1C]"
                      >
                        Unassign
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[12px] text-[#5B6A63] tabular-nums">
                      <span className="font-mono">
                        {formatWeight(shp.weightKg)} · {shp.pallets} pallets
                      </span>
                      <span className="font-mono font-medium text-[#145338]">
                        {shp.loadedPercent}% loaded
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Assign Pending Shipment */}
            {sortedPending.length > 0 && (
              <div className="pt-1">
                <label
                  htmlFor="assign-pending-shipment"
                  className="mb-1.5 block text-[12px] font-medium text-[#54635C]"
                >
                  Assign pending shipment to {truck.id}
                </label>
                <div className="flex gap-2">
                  <select
                    id="assign-pending-shipment"
                    value={selectedPendingId}
                    onChange={(e) => setSelectedPendingId(e.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[#DCE2DF] bg-white px-2.5 text-[12.5px] text-[#141C18] focus:border-[#145338] focus:outline-none"
                  >
                    <option value="">Select unassigned shipment...</option>
                    {sortedPending.map((shp) => (
                      <option key={shp.id} value={shp.id}>
                        {shp.id} · {shp.destinationCode} ({formatWeight(shp.weightKg)}) —{' '}
                        {shp.customer}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedPendingId}
                    onClick={() => {
                      if (!selectedPendingId) return;
                      onAssignShipment(selectedPendingId, truck.id);
                      setSelectedPendingId('');
                    }}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#145338] px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-[#0E3E29] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Assign</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Drawer Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#E5EAE7] bg-[#F8FAF9] px-5 py-3.5">
          <div className="flex items-center gap-2 text-[12px] text-[#5B6A63]">
            <Package className="h-4 w-4 text-[#145338]" aria-hidden="true" />
            <span>
              {canDispatch
                ? 'Cleared for gate departure'
                : 'Complete loading to dispatch'}
            </span>
          </div>
          <button
            type="button"
            disabled={!canDispatch}
            onClick={() => onDispatchTruck(truck.id)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#145338] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#0E3E29] disabled:cursor-not-allowed disabled:bg-[#9FB2A8] whitespace-nowrap shrink-0"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Dispatch truck</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
