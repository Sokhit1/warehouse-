import {
  CheckCircle2,
  Container,
  Download,
  MoreVertical,
  Package,
  RotateCcw,
  Truck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { OverviewMetrics } from '../types/warehouse';
import { formatLastUpdated } from '../utils/warehouseMetrics';

interface WarehouseOverviewProps {
  metrics: OverviewMetrics;
  lastUpdatedIso: string;
  onExportCsv: () => void;
  onResetDemo: () => void;
  onInspectUnassigned: () => void;
  onFilterReady: () => void;
}

export function WarehouseOverview({
  metrics,
  lastUpdatedIso,
  onExportCsv,
  onResetDemo,
  onInspectUnassigned,
  onFilterReady,
}: WarehouseOverviewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const openDocks = Math.max(0, metrics.totalDocks - metrics.activeLoadingDocks);

  return (
    <section
      aria-label="Warehouse overview"
      className="rounded-xl border border-[#E2E7E4] bg-white"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF1EF] px-5 py-3.5">
        <h2 className="font-display text-[15px] font-semibold text-[#111916]">
          Warehouse overview
        </h2>
        <div className="flex items-center gap-2">
          <p className="text-[12.5px] text-[#66756E] tabular-nums">
            Last updated:{' '}
            <span className="font-mono text-[12px] font-medium text-[#324039]">
              {formatLastUpdated(lastUpdatedIso)}
            </span>
          </p>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Overview options"
              aria-expanded={menuOpen}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#66756E] hover:bg-[#F3F5F4] hover:text-[#141C18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338]"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1.5 w-48 rounded-lg border border-[#DCE2DF] bg-white py-1 shadow-md">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportCsv();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#2C3732] hover:bg-[#F3F5F4]"
                >
                  <Download className="h-3.5 w-3.5 text-[#5D6C65]" />
                  <span>Export manifest CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onResetDemo();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#2C3732] hover:bg-[#F3F5F4]"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#5D6C65]" />
                  <span>Reset demo data</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Four Computed Metric Columns */}
      <div className="grid grid-cols-2 divide-y divide-[#EDF1EF] lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {/* Metric 1: Trucks inside */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#5E6D66]">
            <Truck className="h-3.5 w-3.5 text-[#6E7E77]" aria-hidden="true" />
            <span>Trucks inside</span>
          </div>
          <p
            data-testid="metric-trucks-inside"
            className="mt-2 font-display text-[28px] font-bold leading-none tracking-tight text-[#111916] tabular-nums"
          >
            {metrics.trucksInside}
          </p>
          <p className="mt-1.5 text-[12px] text-[#6B7A73]">
            {metrics.loadingCount} loading · {metrics.readyTrucksCount} cleared
          </p>
        </div>

        {/* Metric 2: Unassigned shipments */}
        <div className="border-l border-[#EDF1EF] px-5 py-4 lg:border-l-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#5E6D66]">
              <Package className="h-3.5 w-3.5 text-[#6E7E77]" aria-hidden="true" />
              <span>Unassigned shipments</span>
            </div>
            <button
              type="button"
              onClick={onInspectUnassigned}
              className="text-[11.5px] font-medium text-[#145338] hover:underline whitespace-nowrap"
            >
              View
            </button>
          </div>
          <p
            data-testid="metric-unassigned-shipments"
            className="mt-2 font-display text-[28px] font-bold leading-none tracking-tight text-[#111916] tabular-nums"
          >
            {metrics.unassignedShipments}
          </p>
          <p className="mt-1.5 text-[12px] text-[#6B7A73]">Pending dock assignment</p>
        </div>

        {/* Metric 3: Active loading docks */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#5E6D66]">
            <Container className="h-3.5 w-3.5 text-[#6E7E77]" aria-hidden="true" />
            <span>Active loading docks</span>
          </div>
          <p
            data-testid="metric-active-docks"
            className="mt-2 font-display text-[28px] font-bold leading-none tracking-tight text-[#111916] tabular-nums"
          >
            {metrics.activeLoadingDocks}
            <span className="text-[20px] font-semibold text-[#7A8982]">
              /{metrics.totalDocks}
            </span>
          </p>
          <p className="mt-1.5 text-[12px] text-[#6B7A73] tabular-nums">
            {metrics.dockUsagePercent}% bay usage · {openDocks} open
          </p>
        </div>

        {/* Metric 4: Shipments ready for dispatch */}
        <div className="border-l border-[#EDF1EF] px-5 py-4 lg:border-l-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#5E6D66]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#145338]" aria-hidden="true" />
              <span>Ready for dispatch</span>
            </div>
            <button
              type="button"
              onClick={onFilterReady}
              className="text-[11.5px] font-medium text-[#145338] hover:underline whitespace-nowrap"
            >
              Filter
            </button>
          </div>
          <p
            data-testid="metric-ready-dispatch"
            className="mt-2 font-display text-[28px] font-bold leading-none tracking-tight text-[#145338] tabular-nums"
          >
            {String(metrics.shipmentsReadyForDispatch).padStart(2, '0')}
          </p>
          <p className="mt-1.5 text-[12px] text-[#6B7A73]">
            Shipments across {metrics.readyTrucksCount}{' '}
            {metrics.readyTrucksCount === 1 ? 'truck' : 'trucks'}
          </p>
        </div>
      </div>
    </section>
  );
}
