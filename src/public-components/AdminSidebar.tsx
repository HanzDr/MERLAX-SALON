// AdminSidebar.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { FaRegCalendar } from "react-icons/fa6";
import { LuMessageSquareText, LuPercent } from "react-icons/lu";
import { FaUserCog, FaUsers, FaBoxOpen, FaChartLine } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import { HiChevronLeft, HiChevronRight, HiMenu } from "react-icons/hi";
import useAuth from "@/features/auth/hooks/UseAuth";
import useUserProfile from "@/features/auth/hooks/UseUserProfile";
import type { Customer } from "@/features/auth/types/AuthTypes";

const EXPANDED_W = 272;
const COLLAPSED_W = 80;

type AdminSidebarProps = {
  onWidthChange?: (px: number) => void;
};

type Item = {
  to: string;
  label: string;
  icon: ReactNode;
};

const NAV_ITEMS: Item[] = [
  {
    to: "/admin/analytics",
    label: "Analytics",
    icon: <FaChartLine size={20} />,
  },
  {
    to: "/admin/appointments",
    label: "Appointments",
    icon: <FaRegCalendar size={20} />,
  },
  {
    to: "/admin/services&stylists",
    label: "Services & Stylists",
    icon: <FaUserCog size={20} />,
  },
  { to: "/admin/customers", label: "Customers", icon: <FaUsers size={20} /> },
  {
    to: "/admin/feedback",
    label: "Feedback",
    icon: <LuMessageSquareText size={20} />,
  },
  { to: "/admin/inventory", label: "Inventory", icon: <FaBoxOpen size={20} /> },
  {
    to: "/admin/promoManagement",
    label: "Prices & Discounts",
    icon: <LuPercent size={20} />,
  },
];

function getInitials(user?: Partial<Customer>) {
  const a = user?.firstName?.trim();
  const b = user?.lastName?.trim();
  const initials = [a?.[0], b?.[0]].filter(Boolean).join("").toUpperCase();
  return initials || "ML";
}

function getFullName(user?: Partial<Customer>) {
  const parts = [user?.firstName, user?.middleName, user?.lastName]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  return parts.join(" ");
}

const AdminSidebar = ({ onWidthChange }: AdminSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { signOut } = useAuth();
  const { userProfile } = useUserProfile() as { userProfile?: Customer | null };

  const sidebarWidth = isCollapsed ? COLLAPSED_W : EXPANDED_W;

  const fullName = useMemo(
    () => getFullName(userProfile || undefined),
    [userProfile]
  );
  const initials = useMemo(
    () => getInitials(userProfile || undefined),
    [userProfile]
  );

  const toggleSidebar = () => setIsCollapsed((p) => !p);
  const toggleMobileSidebar = () => setIsMobileOpen((p) => !p);

  useEffect(() => {
    const compute = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      const px = isDesktop && !isMobileOpen ? sidebarWidth : 0;
      onWidthChange?.(px);
    };
    compute();
    const onResize = () => compute();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sidebarWidth, isMobileOpen, onWidthChange]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-gray-300 p-2 rounded-full shadow-sm"
        onClick={toggleMobileSidebar}
        aria-label="Open sidebar"
      >
        <HiMenu size={22} />
      </button>

      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex md:fixed md:inset-y-0 md:left-0"
        style={{ zIndex: 40, width: sidebarWidth }}
        aria-label="Admin navigation"
      >
        <SidebarShell
          isCollapsed={isCollapsed}
          sidebarWidth={sidebarWidth}
          onToggle={toggleSidebar}
          initials={initials}
          userName={fullName}
          email={userProfile?.email || ""}
          onSignOut={signOut}
        />
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full transition-transform duration-300">
            <SidebarShell
              isCollapsed={false}
              sidebarWidth={EXPANDED_W}
              onToggle={() => setIsMobileOpen(false)}
              initials={initials}
              userName={fullName}
              email={userProfile?.email || ""}
              onSignOut={() => {
                setIsMobileOpen(false);
                signOut();
              }}
              isMobile
            />
          </div>
          <button
            className="flex-1 bg-black/50"
            aria-label="Close sidebar"
            onClick={() => setIsMobileOpen(false)}
          />
        </div>
      )}
    </>
  );
};

function SidebarShell({
  isCollapsed,
  sidebarWidth,
  onToggle,
  initials,
  userName,
  email,
  onSignOut,
  isMobile,
}: {
  isCollapsed: boolean;
  sidebarWidth: number;
  onToggle: () => void;
  initials: string;
  userName?: string | null;
  email?: string | null;
  onSignOut: () => void;
  isMobile?: boolean;
}) {
  return (
    <div
      className="h-full flex flex-col bg-white border-r border-gray-200 shadow-md transition-[width] duration-300"
      style={{ width: sidebarWidth }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        {!isCollapsed && (
          <div className="leading-tight">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[#FFB030] to-[#FFCC6A] bg-clip-text text-transparent">
                MERLAX
              </span>
            </h1>
            <p className="text-[11px] text-gray-500">Admin Console</p>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="ml-auto -mr-2 bg-white border border-gray-300 rounded-full p-1.5 shadow-sm hover:shadow transition hidden md:inline-flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <HiChevronRight size={18} />
            ) : (
              <HiChevronLeft size={18} />
            )}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto bg-white">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} item={item} collapsed={isCollapsed} />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto p-3 border-t border-gray-200 bg-white">
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#FFB030] text-white grid place-items-center text-sm font-bold shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {userName || "Administrator"}
              </p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
          </div>
        )}

        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#FFB030]/50"
          aria-label="Sign out"
          title="Sign out"
        >
          <MdLogout size={18} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

function NavItem({ item, collapsed }: { item: Item; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition select-none",
          "hover:bg-[#FFF4E0]",
          isActive ? "text-[#FFB030] bg-[#FFF4E0]" : "text-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-[#FFB030]/50",
        ].join(" ")
      }
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
    >
      <div
        className={[
          "shrink-0 grid place-items-center rounded-md h-8 w-8 border border-gray-200 bg-white shadow-sm group-hover:border-[#FFD699] transition",
        ].join(" ")}
      >
        {item.icon}
      </div>

      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export default AdminSidebar;
