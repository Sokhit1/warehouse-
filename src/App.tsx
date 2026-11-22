/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CheckCircle2,
  LayoutGrid,
  List,
  LogIn,
  Search,
  Truck as TruckIcon,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  QuickShipmentInput,
  QuickShipmentModal,
} from './components/QuickShipmentModal';
import { SecondaryViews } from './components/SecondaryViews';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TruckCard, TruckListRow } from './components/TruckCard';
import { TruckDetailPanel } from './components/TruckDetailPanel';
import { WarehouseOverview } from './components/WarehouseOverview';
import { useAuth } from './contexts/AuthContext';
import {
  INITIAL_DOCKS,
  INITIAL_SHIPMENTS,
  INITIAL_TRUCKS,
} from './data/initialWarehouseData';
import {
  advanceTruckLoadInCloud,
  assignShipmentInCloud,
  changeTruckDockInCloud,
  createQuickShipmentInCloud,
  dispatchTruckInCloud,
  ensureUserProfile,
  resetWarehouseDataInCloud,
  seedWarehouseDataIfEmpty,
  subscribeWarehouseData,
  unassignShipmentInCloud,
  updateTruckStatusInCloud,
} from './lib/warehouseStore';
import {
  FilterState,
  NavSection,
  Shipment,
  TruckStatus,
  ViewMode,
  WarehouseState,
} from './types/warehouse';
import {
  computeOverviewMetrics,
  exportManifestCsv,
  filterTrucks,
  getTruckLoadSummary,
} from './utils/warehouseMetrics';

const STORAGE_KEY = 'fieldline_warehouse_ops_v1';

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  fleet: 'Fleet',
  shipments: 'Shipments',
  warehouse: 'Warehouse Operations',
  routes: 'Route Planning',
  reports: 'Reports',
};

function createInitialState(): WarehouseState {
  return {
    trucks: INITIAL_TRUCKS,
    shipments: INITIAL_SHIPMENTS,
    docks: INITIAL_DOCKS,
    lastUpdatedIso: new Date().toISOString(),
  };
}

function loadLocalState(): WarehouseState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<WarehouseState>;
    if (
      Array.isArray(parsed.trucks) &&
      Array.isArray(parsed.shipments) &&
      Array.isArray(parsed.docks)
    ) {
      return {
        trucks: parsed.trucks,
        shipments: parsed.shipments,
        docks: parsed.docks,
        lastUpdatedIso:
          typeof parsed.lastUpdatedIso === 'string'
            ? parsed.lastUpdatedIso
            : new Date().toISOString(),
      };
    }
  } catch {
    // Fall back to default seeded state if localStorage is unavailable
  }
  return createInitialState();
}

export default function App() {
  const { user, authReady, signingIn, authError, signInWithGoogle, signOutUser, clearAuthError } =
    useAuth();

  const [state, setState] = useState<WarehouseState>(loadLocalState);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('warehouse');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    dock: 'all',
    vehicleType: 'all',
  });
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [quickShipmentOpen, setQuickShipmentOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sidebarSearchRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Surface Firestore errors cleanly to React ErrorBoundary
  if (fatalError) {
    throw fatalError;
  }

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Persist local demo state when signed out
  useEffect(() => {
    if (user) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state, user]);

  // Attach Firestore real-time listeners only when auth is ready and user is signed in
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setCloudLoading(false);
      setState(loadLocalState());
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    setCloudLoading(true);

    async function initCloudWorkspace(activeUser: NonNullable<typeof user>) {
      try {
        await ensureUserProfile(activeUser);
        await seedWarehouseDataIfEmpty(activeUser.uid);
        if (cancelled) return;

        let docksLoaded = false;
        let trucksLoaded = false;
        let shipmentsLoaded = false;

        const markReadyIfAllLoaded = () => {
          if (docksLoaded && trucksLoaded && shipmentsLoaded) {
            setCloudLoading(false);
          }
        };

        unsubscribe = subscribeWarehouseData(activeUser.uid, {
          onDocks: (docks) => {
            docksLoaded = true;
            setState((prev) => ({
              ...prev,
              docks: docks.length > 0 ? docks : INITIAL_DOCKS,
              lastUpdatedIso: new Date().toISOString(),
            }));
            markReadyIfAllLoaded();
          },
          onTrucks: (trucks) => {
            trucksLoaded = true;
            setState((prev) => ({
              ...prev,
              trucks,
              lastUpdatedIso: new Date().toISOString(),
            }));
            markReadyIfAllLoaded();
          },
          onShipments: (shipments) => {
            shipmentsLoaded = true;
            setState((prev) => ({
              ...prev,
              shipments,
              lastUpdatedIso: new Date().toISOString(),
            }));
            markReadyIfAllLoaded();
          },
          onError: (err) => {
            if (!cancelled) {
              setFatalError(err);
            }
          },
        });
      } catch (err) {
        if (!cancelled) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    void initCloudWorkspace(user);

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [authReady, user]);

  // Keyboard shortcut `/` to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !quickShipmentOpen &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        sidebarSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickShipmentOpen]);

  const metrics = useMemo(
    () => computeOverviewMetrics(state.trucks, state.shipments, state.docks),
    [state.trucks, state.shipments, state.docks]
  );

  const filteredTrucks = useMemo(
    () => filterTrucks(state.trucks, filters),
    [state.trucks, filters]
  );

  const occupiedDockNumbers = useMemo(
    () =>
      new Set(
        state.trucks.filter((t) => t.inWarehouse).map((t) => t.dockNumber)
      ),
    [state.trucks]
  );

  const unassignedShipments = useMemo(
    () => state.shipments.filter((s) => s.truckId === null),
    [state.shipments]
  );

  const selectedTruck = useMemo(
    () => state.trucks.find((t) => t.id === selectedTruckId && t.inWarehouse) ?? null,
    [state.trucks, selectedTruckId]
  );

  const selectedTruckSummary = useMemo(
    () => (selectedTruck ? getTruckLoadSummary(selectedTruck, state.shipments) : null),
    [selectedTruck, state.shipments]
  );

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.status !== 'all' ||
    filters.dock !== 'all' ||
    filters.vehicleType !== 'all';

  const clearAllFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      dock: 'all',
      vehicleType: 'all',
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        lastUpdatedIso: new Date().toISOString(),
      }));
      setIsRefreshing(false);
      showToast('Warehouse data refreshed.');
    }, 220);
  };

  const handleSidebarSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    if (value.trim() && activeSection !== 'warehouse') {
      setActiveSection('warehouse');
    }
  };

  const handleSaveQuickShipment = async (input: QuickShipmentInput) => {
    const nextNum =
      state.shipments.reduce((max, shp) => {
        const numeric = Number.parseInt(shp.id.replace(/\D/g, ''), 10);
        return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
      }, 4827) + 1;

    const now = new Date();
    const createdAt = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const shipmentId = `SHP-${nextNum}`;
    const reference = `PO-${77400 + (nextNum % 900)}`;

    if (user) {
      try {
        const targetTruck = input.truckId
          ? state.trucks.find((t) => t.id === input.truckId)
          : undefined;
        await createQuickShipmentInCloud(
          user.uid,
          input,
          shipmentId,
          reference,
          createdAt,
          targetTruck
        );
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    } else {
      const newShipment: Shipment = {
        id: shipmentId,
        reference,
        customer: input.customer,
        originCode: 'NY',
        destinationCode: input.destinationCode,
        destinationCity: input.destinationCity,
        cargoDescription: input.cargoDescription,
        weightKg: input.weightKg,
        pallets: input.pallets,
        priority: input.priority,
        truckId: input.truckId,
        loadedPercent: 0,
        scheduledDeparture: '17:30',
        createdAt,
      };

      setState((prev) => {
        const updatedTrucks = prev.trucks.map((truck) => {
          if (input.truckId && truck.id === input.truckId) {
            if (truck.status === 'Completed' || truck.status === 'Ready') {
              return { ...truck, status: 'Loading' as TruckStatus };
            }
          }
          return truck;
        });

        return {
          ...prev,
          trucks: updatedTrucks,
          shipments: [newShipment, ...prev.shipments],
          lastUpdatedIso: new Date().toISOString(),
        };
      });
    }

    if (input.truckId) {
      showToast(`Saved ${shipmentId} and assigned to ${input.truckId}.`);
    } else {
      showToast(`Saved unassigned shipment ${shipmentId} (${input.destinationCode}).`);
    }
  };

  const handleUpdateTruckStatus = async (truckId: string, newStatus: TruckStatus) => {
    const truck = state.trucks.find((t) => t.id === truckId);
    if (!truck) return;

    if (user) {
      try {
        const assigned = state.shipments.filter((s) => s.truckId === truckId);
        await updateTruckStatusInCloud(user.uid, truck, newStatus, assigned);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    } else {
      setState((prev) => {
        const updatedShipments = prev.shipments.map((shp) => {
          if (shp.truckId !== truckId) return shp;
          if (newStatus === 'Not started') return { ...shp, loadedPercent: 0 };
          if (newStatus === 'Ready' || newStatus === 'Completed') {
            return { ...shp, loadedPercent: 100 };
          }
          if (newStatus === 'Loading' && (shp.loadedPercent === 0 || shp.loadedPercent === 100)) {
            return { ...shp, loadedPercent: 45 };
          }
          return shp;
        });

        const updatedTrucks = prev.trucks.map((t) => {
          if (t.id !== truckId) return t;
          const sealNumber =
            newStatus === 'Ready' || newStatus === 'Completed'
              ? t.sealNumber || `SL-${Math.floor(884215 + Math.random() * 700)}`
              : undefined;
          return { ...t, status: newStatus, sealNumber };
        });

        return {
          ...prev,
          trucks: updatedTrucks,
          shipments: updatedShipments,
          lastUpdatedIso: new Date().toISOString(),
        };
      });
    }
    showToast(`${truckId} status updated to ${newStatus}.`);
  };

  const handleAdvanceLoad = async (truckId: string, deltaPercent: number) => {
    const truck = state.trucks.find((t) => t.id === truckId);
    const assigned = state.shipments.filter((s) => s.truckId === truckId);
    if (!truck || assigned.length === 0) return;

    if (user) {
      try {
        await advanceTruckLoadInCloud(user.uid, truck, deltaPercent, assigned);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
      return;
    }

    setState((prev) => {
      let allComplete = true;
      const updatedShipments = prev.shipments.map((shp) => {
        if (shp.truckId !== truckId) return shp;
        const nextPct = Math.min(100, shp.loadedPercent + deltaPercent);
        if (nextPct < 100) allComplete = false;
        return { ...shp, loadedPercent: nextPct };
      });

      const updatedTrucks = prev.trucks.map((t) => {
        if (t.id !== truckId) return t;
        return {
          ...t,
          status: allComplete ? ('Ready' as TruckStatus) : ('Loading' as TruckStatus),
          sealNumber: allComplete ? t.sealNumber || 'SL-884302' : t.sealNumber,
        };
      });

      return {
        ...prev,
        trucks: updatedTrucks,
        shipments: updatedShipments,
        lastUpdatedIso: new Date().toISOString(),
      };
    });
  };

  const handleChangeDock = async (truckId: string, newDockNumber: number) => {
    if (user) {
      try {
        await changeTruckDockInCloud(user.uid, truckId, newDockNumber);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    } else {
      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === truckId ? { ...t, dockNumber: newDockNumber } : t
        ),
        lastUpdatedIso: new Date().toISOString(),
      }));
    }
    showToast(`Moved ${truckId} to Dock #${newDockNumber}.`);
  };

  const handleAssignShipment = async (shipmentId: string, truckId: string) => {
    const targetTruck = state.trucks.find((t) => t.id === truckId);
    if (!targetTruck) return;

    if (user) {
      try {
        await assignShipmentInCloud(user.uid, shipmentId, targetTruck);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    } else {
      setState((prev) => {
        const updatedShipments = prev.shipments.map((s) =>
          s.id === shipmentId ? { ...s, truckId, loadedPercent: 0 } : s
        );
        const updatedTrucks = prev.trucks.map((t) => {
          if (t.id !== truckId) return t;
          if (t.status === 'Ready' || t.status === 'Completed') {
            return { ...t, status: 'Loading' as TruckStatus };
          }
          return t;
        });
        return {
          ...prev,
          trucks: updatedTrucks,
          shipments: updatedShipments,
          lastUpdatedIso: new Date().toISOString(),
        };
      });
    }
    showToast(`Assigned ${shipmentId} to ${truckId}.`);
  };

  const handleUnassignShipment = async (shipmentId: string) => {
    if (user) {
      try {
        await unassignShipmentInCloud(user.uid, shipmentId);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    } else {
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((s) =>
          s.id === shipmentId ? { ...s, truckId: null, loadedPercent: 0 } : s
        ),
        lastUpdatedIso: new Date().toISOString(),
      }));
    }
    showToast(`Returned ${shipmentId} to unassigned queue.`);
  };

  const handleDispatchTruck = async (truckId: string) => {
    if (user) {
      try {
        await dispatchTruckInCloud(user.uid, truckId);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    } else {
      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === truckId ? { ...t, inWarehouse: false, status: 'Completed' } : t
        ),
        lastUpdatedIso: new Date().toISOString(),
      }));
    }
    setSelectedTruckId(null);
    showToast(`${truckId} dispatched from dock.`);
  };

  const handleResetDemo = async () => {
    clearAllFilters();
    setSelectedTruckId(null);

    if (user) {
      setCloudLoading(true);
      try {
        await resetWarehouseDataInCloud(user.uid);
        showToast('Cloud warehouse data restored to defaults.');
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setCloudLoading(false);
      }
      return;
    }

    const fresh = createInitialState();
    setState(fresh);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    showToast('Demo warehouse data restored to defaults.');
  };

  const handleExportCsv = () => {
    exportManifestCsv(state.trucks, state.shipments);
    showToast('Exported warehouse manifest CSV.');
  };

  return (
    <div className="flex min-h-screen bg-[#F3F5F4] text-[#141C18]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        sidebarSearch={filters.search}
        onSidebarSearchChange={handleSidebarSearchChange}
        searchInputRef={sidebarSearchRef}
        unassignedCount={metrics.unassignedShipments}
        trucksInsideCount={metrics.trucksInside}
        onExportCsv={handleExportCsv}
        onResetDemo={() => void handleResetDemo()}
        userDisplayName={user?.displayName ?? null}
        userEmail={user?.email ?? null}
        signingIn={signingIn}
        onSignIn={() => void signInWithGoogle()}
        onSignOut={() => void signOutUser()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={SECTION_TITLES[activeSection]}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing || cloudLoading}
          filters={filters}
          onFiltersChange={setFilters}
          docks={state.docks}
          onOpenQuickShipment={() => setQuickShipmentOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-5 p-4 sm:p-6">
          {/* Account Sync Prompt when not signed in */}
          {authReady && !user && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE5E0] bg-white px-4 py-3">
              <div className="text-[13px] text-[#35443D]">
                <span className="font-semibold text-[#111916]">Cloud sync ready.</span>{' '}
                Sign in with Google to save trucks, docks, and shipments to your persistent workspace.
              </div>
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void signInWithGoogle()}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-[#145338] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#0E3E29] transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}

          {authError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800"
            >
              <span>{authError}</span>
              <button
                type="button"
                onClick={clearAuthError}
                aria-label="Dismiss sign-in error"
                className="rounded p-1 hover:bg-red-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Warehouse Overview Summary Panel */}
          <WarehouseOverview
            metrics={metrics}
            lastUpdatedIso={state.lastUpdatedIso}
            onExportCsv={handleExportCsv}
            onResetDemo={() => void handleResetDemo()}
            onInspectUnassigned={() => setActiveSection('shipments')}
            onFilterReady={() => {
              setActiveSection('warehouse');
              setFilters((prev) => ({
                ...prev,
                status: prev.status === 'Ready' ? 'all' : 'Ready',
              }));
            }}
          />

          {/* Primary Warehouse Operations View */}
          {activeSection === 'warehouse' ? (
            <section aria-label="Trucks currently in warehouse" className="space-y-4">
              {/* Toolbar Row */}
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-baseline gap-2.5">
                  <h2 className="font-display text-[15.5px] font-semibold text-[#111916]">
                    Trucks currently in warehouse
                  </h2>
                  <span className="font-mono text-[12px] text-[#6A7871] tabular-nums">
                    {filteredTrucks.length === metrics.trucksInside
                      ? `${metrics.trucksInside} on site`
                      : `${filteredTrucks.length} of ${metrics.trucksInside} shown`}
                  </span>
                </div>

                {/* Search + Status Filter + Dock Filter + Grid/List Toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Truck ID Search */}
                  <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-[228px]">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7A8982]"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                      placeholder="Search by truck ID..."
                      aria-label="Search trucks by ID"
                      className="h-9 w-full rounded-lg border border-[#DCE2DF] bg-white pl-8.5 pr-8 text-[13px] text-[#141C18] placeholder:text-[#7F8E87] transition-colors focus:border-[#145338] focus:outline-none"
                    />
                    {filters.search && (
                      <button
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#7A8982] hover:text-[#111916]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <select
                    aria-label="Filter by status"
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: e.target.value as TruckStatus | 'all',
                      }))
                    }
                    className={`h-9 rounded-lg border px-3 text-[13px] font-medium transition-colors focus:border-[#145338] focus:outline-none ${
                      filters.status !== 'all'
                        ? 'border-[#145338] bg-[#ECF5F0] text-[#114630]'
                        : 'border-[#DCE2DF] bg-white text-[#2C3732]'
                    }`}
                  >
                    <option value="all">All statuses</option>
                    <option value="Not started">Not started</option>
                    <option value="Loading">Loading</option>
                    <option value="Ready">Ready</option>
                    <option value="Completed">Completed</option>
                  </select>

                  {/* Dock Filter */}
                  <select
                    aria-label="Filter by dock"
                    value={filters.dock === 'all' ? 'all' : String(filters.dock)}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dock: e.target.value === 'all' ? 'all' : Number(e.target.value),
                      }))
                    }
                    className={`h-9 rounded-lg border px-3 text-[13px] font-medium transition-colors focus:border-[#145338] focus:outline-none ${
                      filters.dock !== 'all'
                        ? 'border-[#145338] bg-[#ECF5F0] text-[#114630]'
                        : 'border-[#DCE2DF] bg-white text-[#2C3732]'
                    }`}
                  >
                    <option value="all">All docks</option>
                    {state.docks.map((dock) => (
                      <option key={dock.number} value={dock.number}>
                        {dock.label}
                      </option>
                    ))}
                  </select>

                  {/* Clear Filters link when active */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="h-9 px-2 text-[12.5px] font-medium text-[#145338] hover:underline whitespace-nowrap"
                    >
                      Reset
                    </button>
                  )}

                  {/* Grid / List View Toggle */}
                  <div
                    role="group"
                    aria-label="Switch view layout"
                    className="inline-flex h-9 items-center rounded-lg border border-[#DCE2DF] bg-white p-0.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-pressed={viewMode === 'grid'}
                      className={`inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors whitespace-nowrap ${
                        viewMode === 'grid'
                          ? 'bg-[#ECF5F0] text-[#114630]'
                          : 'text-[#5B6A63] hover:text-[#141C18]'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-pressed={viewMode === 'list'}
                      className={`inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors whitespace-nowrap ${
                        viewMode === 'list'
                          ? 'bg-[#ECF5F0] text-[#114630]'
                          : 'text-[#5B6A63] hover:text-[#141C18]'
                      }`}
                    >
                      <List className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>List</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading Skeleton while seeding/loading cloud workspace */}
              {cloudLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-[264px] animate-pulse rounded-xl border border-[#E2E7E4] bg-white"
                    />
                  ))}
                </div>
              ) : filteredTrucks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E7E4] bg-white px-6 py-14 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3F5F4] text-[#66756E]">
                    <TruckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 font-display text-[15px] font-semibold text-[#111916]">
                    No matching trucks on site
                  </h3>
                  <p className="mt-1 max-w-sm text-[13px] text-[#66756E]">
                    {hasActiveFilters
                      ? 'No vehicles match the active truck ID, status, or dock filters.'
                      : 'All trucks have been dispatched from the yard.'}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-4 h-9 rounded-lg border border-[#DCE2DF] bg-white px-4 text-[13px] font-medium text-[#145338] hover:bg-[#F7F9F8]"
                    >
                      Clear active filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleResetDemo()}
                      className="mt-4 h-9 rounded-lg bg-[#145338] px-4 text-[13px] font-medium text-white hover:bg-[#0E3E29]"
                    >
                      Restore demo yard
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTrucks.map((truck) => (
                    <TruckCard
                      key={truck.id}
                      truck={truck}
                      loadSummary={getTruckLoadSummary(truck, state.shipments)}
                      isSelected={truck.id === selectedTruckId}
                      onSelect={setSelectedTruckId}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[#E2E7E4] bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#EDF1EF] bg-[#F8FAF9] text-[12px] font-medium text-[#5E6D66]">
                          <th className="py-2.5 pl-4 pr-3">Truck</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Route</th>
                          <th className="hidden px-3 py-2.5 md:table-cell">
                            Driver &amp; Dock
                          </th>
                          <th className="px-3 py-2.5 text-right">Load weight</th>
                          <th className="hidden px-3 py-2.5 sm:table-cell">
                            Load progress
                          </th>
                          <th className="w-10 py-2.5 pl-2 pr-4">
                            <span className="sr-only">Inspect</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrucks.map((truck) => (
                          <TruckListRow
                            key={truck.id}
                            truck={truck}
                            loadSummary={getTruckLoadSummary(truck, state.shipments)}
                            isSelected={truck.id === selectedTruckId}
                            onSelect={setSelectedTruckId}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <SecondaryViews
              section={activeSection}
              trucks={state.trucks}
              shipments={state.shipments}
              docks={state.docks}
              metrics={metrics}
              onSelectTruck={setSelectedTruckId}
              onAssignShipment={(shpId, trkId) => void handleAssignShipment(shpId, trkId)}
              onOpenQuickShipment={() => setQuickShipmentOpen(true)}
              onGoToWarehouse={() => setActiveSection('warehouse')}
              onExportCsv={handleExportCsv}
            />
          )}
        </main>
      </div>

      {/* Truck Detail Slide-Over Panel */}
      <TruckDetailPanel
        truck={selectedTruck}
        loadSummary={selectedTruckSummary}
        dock={
          selectedTruck
            ? state.docks.find((d) => d.number === selectedTruck.dockNumber)
            : undefined
        }
        allDocks={state.docks}
        occupiedDockNumbers={occupiedDockNumbers}
        unassignedShipments={unassignedShipments}
        onClose={() => setSelectedTruckId(null)}
        onUpdateStatus={(id, status) => void handleUpdateTruckStatus(id, status)}
        onAdvanceLoad={(id, delta) => void handleAdvanceLoad(id, delta)}
        onChangeDock={(id, dockNum) => void handleChangeDock(id, dockNum)}
        onAssignShipment={(shpId, trkId) => void handleAssignShipment(shpId, trkId)}
        onUnassignShipment={(shpId) => void handleUnassignShipment(shpId)}
        onDispatchTruck={(id) => void handleDispatchTruck(id)}
      />

      {/* Quick Shipment Modal */}
      <QuickShipmentModal
        open={quickShipmentOpen}
        onClose={() => setQuickShipmentOpen(false)}
        onSave={(input) => void handleSaveQuickShipment(input)}
        trucks={state.trucks}
        shipments={state.shipments}
      />

      {/* Subtle Action Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-[#145338]/20 bg-[#112A1E] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 text-[#7AE0AE] shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
