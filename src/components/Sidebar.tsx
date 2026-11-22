import {
  BarChart3,
  Download,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Route,
  Search,
  Truck as TruckIcon,
  Warehouse,
  X,
} from 'lucide-react';
import { RefObject } from 'react';
import { NavSection } from '../types/warehouse';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  sidebarSearch: string;
  onSidebarSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  unassignedCount: number;
  trucksInsideCount: number;
  onExportCsv: () => void;
  onResetDemo: () => void;
  userDisplayName: string | null;
  userEmail: string | null;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
}

export function Sidebar({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  sidebarSearch,
  onSidebarSearchChange,
  searchInputRef,
  unassignedCount,
  trucksInsideCount,
  onExportCsv,
  onResetDemo,
  userDisplayName,
  userEmail,
  signingIn,
  onSignIn,
  onSignOut,
}: SidebarProps) {
  const coreNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fleet', label: 'Fleet', icon: TruckIcon, count: trucksInsideCount },
    { id: 'shipments', label: 'Shipments', icon: Package, count: unassignedCount },
  ];

  const opsNav: NavItem[] = [
    { id: 'warehouse', label: 'Warehouse Operations', icon: Warehouse },
    { id: 'routes', label: 'Route Planning', icon: Route },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const handleNavClick = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavClick(item.id)}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`group flex w-full items-center gap-2.5 rounded-lg text-left text-[13.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338] ${
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
        } ${
          isActive
            ? 'bg-[#ECF5F0] text-[#114630] font-semibold'
            : 'text-[#4B5953] hover:bg-[#F3F5F4] hover:text-[#141C18]'
        }`}
      >
        <Icon
          className={`h-[17px] w-[17px] shrink-0 transition-colors ${
            isActive ? 'text-[#145338]' : 'text-[#6A7871] group-hover:text-[#141C18]'
          }`}
          aria-hidden="true"
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  isActive ? 'text-[#145338]' : 'text-[#73827B]'
                }`}
              >
                {item.count}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const sidebarContent = (isMobileDrawer: boolean) => {
    const isNarrow = !isMobileDrawer && collapsed;

    return (
      <div className="flex h-full flex-col bg-white">
        {/* Brand Row */}
        <div
          className={`flex h-15 shrink-0 items-center border-b border-[#E5EAE7] ${
            isNarrow ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <button
            type="button"
            onClick={() => handleNavClick('warehouse')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338] rounded-md"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#145338] text-white">
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 5.5C3 4.67157 3.67157 4 4.5 4H15.5C16.3284 4 17 4.67157 17 5.5V7.5H7.25V9.5H14.5C15.3284 9.5 16 10.1716 16 11V12.5H7.25V16H4.5C3.67157 16 3 15.3284 3 14.5V5.5Z"
                  fill="currentColor"
                />
                <rect x="11.5" y="13.5" width="5.5" height="2.5" rx="0.75" fill="#8CD7B2" />
              </svg>
            </span>
            {!isNarrow && (
              <span className="font-display text-[17px] font-bold tracking-tight text-[#111916] whitespace-nowrap">
                Fieldline
              </span>
            )}
          </button>

          {isMobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5C6B64] hover:bg-[#F3F5F4] hover:text-[#141C18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : !isNarrow ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#6A7871] hover:bg-[#F3F5F4] hover:text-[#141C18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338]"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Expand button when collapsed on desktop */}
        {isNarrow && (
          <div className="flex justify-center border-b border-[#EDF1EF] py-2.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#6A7871] hover:bg-[#F3F5F4] hover:text-[#141C18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338]"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Sidebar Search */}
        {!isNarrow && (
          <div className="px-3.5 pt-3.5 pb-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7A8982]"
                aria-hidden="true"
              />
              <input
                ref={isMobileDrawer ? undefined : searchInputRef}
                type="text"
                value={sidebarSearch}
                onChange={(e) => onSidebarSearchChange(e.target.value)}
                placeholder="Find truck ID..."
                aria-label="Quick search by truck ID"
                className="h-9 w-full rounded-lg border border-[#E2E7E4] bg-[#F7F9F8] pl-8 pr-8 text-[13px] text-[#141C18] placeholder:text-[#7F8E87] transition-colors focus:border-[#145338] focus:bg-white focus:outline-none"
              />
              {sidebarSearch ? (
                <button
                  type="button"
                  onClick={() => onSidebarSearchChange('')}
                  aria-label="Clear sidebar search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#7A8982] hover:text-[#141C18]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#8B9992]">
                  /
                </kbd>
              )}
            </div>
          </div>
        )}

        {/* Grouped Navigation */}
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-2.5 py-3">
          <div className="space-y-5">
            <div>
              {!isNarrow && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-[#7E8D86]">
                  Overview
                </p>
              )}
              <div className="space-y-0.5">{coreNav.map(renderNavButton)}</div>
            </div>

            <div>
              {!isNarrow && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-[#7E8D86]">
                  Dispatch &amp; Yard
                </p>
              )}
              <div className="space-y-0.5">{opsNav.map(renderNavButton)}</div>
            </div>
          </div>
        </nav>

        {/* Bottom Utility Actions & Dispatcher Account */}
        <div className="shrink-0 border-t border-[#E5EAE7] p-2.5 space-y-2">
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={onExportCsv}
              title={isNarrow ? 'Export manifest CSV' : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg text-[13px] font-medium text-[#4B5953] transition-colors hover:bg-[#F3F5F4] hover:text-[#141C18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338] ${
                isNarrow ? 'justify-center px-2 py-2' : 'px-3 py-1.5'
              }`}
            >
              <Download className="h-4 w-4 shrink-0 text-[#6A7871]" aria-hidden="true" />
              {!isNarrow && <span className="truncate whitespace-nowrap">Export manifest CSV</span>}
            </button>
            <button
              type="button"
              onClick={onResetDemo}
              title={isNarrow ? 'Reset demo data' : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg text-[13px] font-medium text-[#4B5953] transition-colors hover:bg-[#F3F5F4] hover:text-[#141C18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145338] ${
                isNarrow ? 'justify-center px-2 py-2' : 'px-3 py-1.5'
              }`}
            >
              <RotateCcw className="h-4 w-4 shrink-0 text-[#6A7871]" aria-hidden="true" />
              {!isNarrow && <span className="truncate whitespace-nowrap">Reset demo data</span>}
            </button>
          </div>

          <div className="border-t border-[#EDF1EF] pt-2">
            {userEmail ? (
              <div className={isNarrow ? 'flex justify-center' : 'px-2 py-1'}>
                {!isNarrow && (
                  <div className="mb-1.5">
                    <p className="truncate text-[12.5px] font-semibold text-[#141C18]">
                      {userDisplayName || 'Dispatcher'}
                    </p>
                    <p className="truncate text-[11px] text-[#66756E]">{userEmail}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onSignOut}
                  title={isNarrow ? 'Sign out' : undefined}
                  className={`flex w-full items-center gap-2 rounded-lg text-[12.5px] font-medium text-[#4B5953] hover:bg-[#F3F5F4] hover:text-[#141C18] transition-colors ${
                    isNarrow ? 'justify-center px-2 py-2' : 'px-2 py-1.5'
                  }`}
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0 text-[#6A7871]" aria-hidden="true" />
                  {!isNarrow && <span>Sign out</span>}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={onSignIn}
                title={isNarrow ? 'Sign in with Google' : undefined}
                className={`flex w-full items-center gap-2 rounded-lg border border-[#DCE2DF] bg-[#F7F9F8] text-[12.5px] font-semibold text-[#114630] hover:border-[#145338] hover:bg-[#ECF5F0] transition-colors disabled:opacity-60 ${
                  isNarrow ? 'justify-center px-2 py-2' : 'justify-center px-3 py-2'
                }`}
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {!isNarrow && (
                  <span className="truncate whitespace-nowrap">
                    {signingIn ? 'Signing in...' : 'Sign in to sync'}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 border-r border-[#E2E7E4] bg-white transition-[width] duration-200 ${
          collapsed ? 'w-[68px]' : 'w-[244px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent(false)}</div>
      </aside>

      {/* Mobile / Tablet Collapsible Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-[#101915]/35 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[264px] max-w-[85vw] border-r border-[#E2E7E4] bg-white shadow-xl">
            {sidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
