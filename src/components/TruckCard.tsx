import { ArrowRight, ChevronRight, Truck as TruckIcon } from 'lucide-react';
import { useState } from 'react';
import { TRUCK_IMAGES } from '../data/initialWarehouseData';
import { Truck, TruckLoadSummary } from '../types/warehouse';
import { formatWeight } from '../utils/warehouseMetrics';
import { StatusBadge } from './StatusBadge';

interface TruckCardProps {
  truck: Truck;
  loadSummary: TruckLoadSummary;
  isSelected: boolean;
  onSelect: (truckId: string) => void;
}

function TruckThumbnail({
  imageKey,
  vehicleType,
  compact = false,
}: {
  imageKey: Truck['imageKey'];
  vehicleType: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const img = TRUCK_IMAGES[imageKey];

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg bg-[#EFF3F1] text-[#5C6B64] ${
          compact ? 'h-12 w-20' : 'h-full w-full'
        }`}
      >
        <TruckIcon className={compact ? 'h-5 w-5' : 'h-8 w-8'} aria-hidden="true" />
        {!compact && <span className="mt-1 text-[11px] font-medium">{vehicleType}</span>}
      </div>
    );
  }

  return (
    <img
      src={img.src}
      alt={img.alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`select-none object-contain mix-blend-multiply transition-transform duration-200 ${
        compact
          ? 'h-12 w-24 object-center'
          : 'h-[112px] w-full object-right group-hover:scale-[1.02]'
      }`}
    />
  );
}

export function TruckCard({
  truck,
  loadSummary,
  isSelected,
  onSelect,
}: TruckCardProps) {
  const progressBarColor =
    truck.status === 'Completed' || truck.status === 'Ready'
      ? 'bg-[#145338]'
      : truck.status === 'Loading'
        ? 'bg-[#1F7A52]'
        : 'bg-[#94A39B]';

  return (
    <article
      onClick={() => onSelect(truck.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(truck.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Inspect ${truck.id}, ${truck.status}, ${truck.originCode} to ${truck.destinationCode}, Dock ${truck.dockNumber}`}
      className={`group flex flex-col overflow-hidden rounded-xl border bg-white text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338] cursor-pointer ${
        isSelected
          ? 'border-[#145338] ring-1 ring-[#145338]/20'
          : 'border-[#E2E7E4] hover:border-[#BCC8C2]'
      }`}
    >
      {/* Top Studio Media Stage */}
      <div className="relative bg-[#F7F9F8] px-4 pt-3.5 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={truck.status} compact />
          <span className="text-[11.5px] font-medium text-[#6B7A73] truncate">
            {truck.vehicleType}
          </span>
        </div>

        {/* Truck ID & Weight anchored left + Side-view Truck Photo anchored right */}
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_58%] items-end gap-2">
          <div className="pb-1">
            <h3 className="font-mono text-[16px] font-semibold tracking-tight text-[#111916]">
              {truck.id}
            </h3>
            <p className="mt-0.5 text-[12.5px] font-medium text-[#4E5D56] tabular-nums">
              {formatWeight(loadSummary.loadedWeightKg)}
              <span className="mx-1 text-[#A4B0AA]">·</span>
              <span className="font-mono text-[12px] text-[#35443D]">
                {loadSummary.progressPercent}%
              </span>
            </p>
          </div>
          <div className="flex h-[108px] items-end justify-end overflow-hidden">
            <TruckThumbnail imageKey={truck.imageKey} vehicleType={truck.vehicleType} />
          </div>
        </div>
      </div>

      {/* Bottom Operational Details */}
      <div className="flex flex-1 flex-col justify-between gap-3 border-t border-[#EDF1EF] px-4 py-3.5">
        {/* Route + Driver + Dock */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-display text-[13.5px] font-semibold text-[#141C18] whitespace-nowrap">
            <span>{truck.originCode}</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#74837C]" aria-hidden="true" />
            <span>{truck.destinationCode}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-[#5B6A63]">
            <span className="truncate">{truck.driverName}</span>
            <span className="text-[#BCC6C1]" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-[12px] font-medium text-[#2C3732] whitespace-nowrap shrink-0">
              Dock #{truck.dockNumber}
            </span>
          </div>
        </div>

        {/* Labeled Load Progress Bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="text-[#66756E]">Load progress</span>
            <span className="font-mono text-[12px] font-medium text-[#1D2823] tabular-nums">
              {loadSummary.progressPercent}%
            </span>
          </div>
          <div
            className="progress-track-hatched h-1.5 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={loadSummary.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Load progress for ${truck.id}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
              style={{ width: `${loadSummary.progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function TruckListRow({
  truck,
  loadSummary,
  isSelected,
  onSelect,
}: TruckCardProps) {
  const progressBarColor =
    truck.status === 'Completed' || truck.status === 'Ready'
      ? 'bg-[#145338]'
      : truck.status === 'Loading'
        ? 'bg-[#1F7A52]'
        : 'bg-[#94A39B]';

  return (
    <tr
      onClick={() => onSelect(truck.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(truck.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Inspect ${truck.id}`}
      className={`cursor-pointer border-b border-[#EDF1EF] transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#145338] ${
        isSelected ? 'bg-[#ECF5F0]/60' : 'hover:bg-[#F7F9F8]'
      }`}
    >
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <div className="hidden h-11 w-20 shrink-0 items-center justify-center rounded-md bg-[#F5F7F6] px-1 sm:flex">
            <TruckThumbnail
              imageKey={truck.imageKey}
              vehicleType={truck.vehicleType}
              compact
            />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[13.5px] font-semibold text-[#111916]">
              {truck.id}
            </p>
            <p className="text-[12px] text-[#66756E]">{truck.vehicleType}</p>
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5">
        <StatusBadge status={truck.status} compact />
      </td>

      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-[#141C18] whitespace-nowrap">
          <span>{truck.originCode}</span>
          <ArrowRight className="h-3 w-3 text-[#7A8982]" aria-hidden="true" />
          <span>{truck.destinationCode}</span>
        </div>
        <p className="text-[11.5px] text-[#6B7A73]">{truck.destinationCity}</p>
      </td>

      <td className="hidden px-3 py-2.5 md:table-cell">
        <p className="text-[13px] text-[#1F2A24]">{truck.driverName}</p>
        <p className="font-mono text-[11.5px] text-[#6B7A73]">
          Dock #{truck.dockNumber}
        </p>
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-[13px] text-[#1F2A24] tabular-nums whitespace-nowrap">
        {formatWeight(loadSummary.loadedWeightKg)}
        <span className="block text-[11px] text-[#73827B]">
          / {formatWeight(loadSummary.plannedWeightKg)}
        </span>
      </td>

      <td className="hidden w-44 px-3 py-2.5 sm:table-cell">
        <div className="mb-1 flex items-center justify-between text-[11.5px]">
          <span className="text-[#66756E]">Load</span>
          <span className="font-mono font-medium text-[#1F2A24] tabular-nums">
            {loadSummary.progressPercent}%
          </span>
        </div>
        <div className="progress-track-hatched h-1.5 w-full overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
            style={{ width: `${loadSummary.progressPercent}%` }}
          />
        </div>
      </td>

      <td className="py-2.5 pl-2 pr-4 text-right text-[#7A8982]">
        <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
      </td>
    </tr>
  );
}
