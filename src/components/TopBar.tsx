import {
  Check,
  ChevronDown,
  Menu,
  Plus,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dock, FilterState, TruckStatus, TruckType } from '../types/warehouse';

interface TopBarProps {
  title: string;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  docks: Dock[];
  onOpenQuickShipment: () => void;
}

const STATUS_OPTIONS: Array<{ value: TruckStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'Loading', label: 'Loading' },
  { value: 'Not started', label: 'Not started' },
  { value: 'Ready', label: 'Ready' },
  { value: 'Completed', label: 'Completed' },
];

const TYPE_OPTIONS: Array<{ value: TruckType | 'all'; label: string }> = [
  { value: 'all', label: 'All vehicle types' },
  { value: 'Box Truck', label: 'Box Truck' },
  { value: 'Container Freight', label: 'Container Freight' },
  { value: 'Sleeper Semi', label: 'Sleeper Semi' },
  { value: 'Curtainsider', label: 'Curtainsider' },
  { value: 'Cargo Van', label: 'Cargo Van' },
];

export function TopBar({
  title,
  onOpenMobileMenu,
  onRefresh,
  isRefreshing,
  filters,
  onFiltersChange,
  docks,
  onOpenQuickShipment,
}: TopBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.dock !== 'all' ? 1 : 0) +
    (filters.vehicleType !== 'all' ? 1 : 0);

  useEffect(() => {
    if (!filterOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [filterOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-15 items-center justify-between gap-4 border-b border-[#E2E7E4] bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E2E7E4] bg-white text-[#3E4C46] hover:bg-[#F3F5F4] lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338]"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="truncate font-display text-[17px] font-semibold tracking-tight text-[#111916] sm:text-[18px]">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh warehouse data"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE3E0] bg-white px-3 text-[13px] font-medium text-[#2C3732] transition-colors hover:border-[#C5D0CB] hover:bg-[#F7F9F8] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338]"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-[#54635C] ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Top Bar Filter Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            aria-expanded={filterOpen}
            aria-haspopup="dialog"
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338] ${
              activeFilterCount > 0 || filterOpen
                ? 'border-[#145338] bg-[#ECF5F0] text-[#114630]'
                : 'border-[#DDE3E0] bg-white text-[#2C3732] hover:border-[#C5D0CB] hover:bg-[#F7F9F8]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="font-mono text-[11px] font-semibold tabular-nums">
                ({activeFilterCount})
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
          </button>

          {filterOpen && (
            <div
              role="dialog"
              aria-label="Filter warehouse trucks"
              className="absolute right-0 mt-2 w-[290px] rounded-xl border border-[#DCE2DF] bg-white p-4 shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-[13px] font-semibold text-[#111916]">
                  Filter yard view
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        status: 'all',
                        dock: 'all',
                        vehicleType: 'all',
                      })
                    }
                    className="text-xs font-medium text-[#145338] hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-[#54635C]">
                    Loading status
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = filters.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onFiltersChange({ ...filters, status: opt.value })
                          }
                          className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                            active
                              ? 'border-[#145338] bg-[#ECF5F0] text-[#114630]'
                              : 'border-[#E2E7E4] bg-white text-[#415049] hover:bg-[#F7F9F8]'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {active && <Check className="h-3 w-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="topbar-dock-filter"
                    className="mb-1.5 block text-[12px] font-medium text-[#54635C]"
                  >
                    Loading dock
                  </label>
                  <select
                    id="topbar-dock-filter"
                    value={filters.dock === 'all' ? 'all' : String(filters.dock)}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        dock: e.target.value === 'all' ? 'all' : Number(e.target.value),
                      })
                    }
                    className="h-9 w-full rounded-lg border border-[#DCE2DF] bg-white px-2.5 text-[13px] text-[#141C18] focus:border-[#145338] focus:outline-none"
                  >
                    <option value="all">All docks (#1 – #{docks.length})</option>
                    {docks.map((dock) => (
                      <option key={dock.number} value={dock.number}>
                        {dock.label} · {dock.zone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="topbar-type-filter"
                    className="mb-1.5 block text-[12px] font-medium text-[#54635C]"
                  >
                    Vehicle type
                  </label>
                  <select
                    id="topbar-type-filter"
                    value={filters.vehicleType}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        vehicleType: e.target.value as TruckType | 'all',
                      })
                    }
                    className="h-9 w-full rounded-lg border border-[#DCE2DF] bg-white px-2.5 text-[13px] text-[#141C18] focus:border-[#145338] focus:outline-none"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA: + Quick shipment */}
        <button
          type="button"
          onClick={onOpenQuickShipment}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#145338] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0E3E29] active:bg-[#0A3020] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338] focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Quick shipment</span>
        </button>
      </div>
    </header>
  );
}
