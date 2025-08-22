// AdminSidebar.tsx
import { useState, useEffect } from "react";
import { CiCalendar } from "react-icons/ci";
import { LuMessageSquareText, LuPercent } from "react-icons/lu";
import { FaUserCog, FaUsers, FaBoxOpen } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import { HiChevronLeft, HiChevronRight, HiMenu } from "react-icons/hi";
import { Link } from "react-router-dom";
import useAuth from "@/features/auth/hooks/UseAuth";
import useUserProfile from "@/features/auth/hooks/UseUserProfile";

const EXPANDED_W = 256; // w-64
const COLLAPSED_W = 80; // w-20

type AdminSidebarProps = {
  onWidthChange?: (px: number) => void; // 👈 NEW
};

const AdminSidebar = ({ onWidthChange }: AdminSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { signOut } = useAuth();
  const { userProfile } = useUserProfile();

  const sidebarWidth = isCollapsed ? COLLAPSED_W : EXPANDED_W;

  const toggleSidebar = () => setIsCollapsed((p) => !p);
  const toggleMobileSidebar = () => setIsMobileOpen((p) => !p);

  // Tell parent the current effective width
  useEffect(() => {
    const compute = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      // On desktop: use real width; On mobile or when overlay is open: 0
      const px = isDesktop && !isMobileOpen ? sidebarWidth : 0;
      onWidthChange?.(px);
    };
    compute();
    const onResize = () => compute();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sidebarWidth, isMobileOpen, onWidthChange]);

  const SidebarContent = (
    <div
      className="bg-white text-gray-800 h-full shadow-md border-r border-gray-200 transition-all duration-300 flex flex-col relative"
      style={{ width: sidebarWidth }}
    >
      {/* Top logo */}
      <div className="p-4 border-b border-gray-200 relative flex justify-center">
        {!isCollapsed && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[#FFB030] leading-tight">
              MERLAX
            </h1>
            <p className="text-xs text-gray-500 mt-1">Admin Page</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-5 bg-white border border-gray-300 rounded-full p-1 shadow hidden md:block"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <HiChevronRight size={20} />
          ) : (
            <HiChevronLeft size={20} />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col space-y-3 px-4 pt-4 text-base font-medium">
        <NavItem
          to="/admin/appointments"
          icon={<CiCalendar size={22} />}
          label="Appointments"
          collapsed={isCollapsed}
        />
        <NavItem
          to="/admin/services&stylists"
          icon={<FaUserCog size={22} />}
          label="Services and Stylist"
          collapsed={isCollapsed}
        />
        <NavItem
          to="/admin/customers"
          icon={<FaUsers size={22} />}
          label="Customers"
          collapsed={isCollapsed}
        />
        <NavItem
          to="/admin/feedback"
          icon={<LuMessageSquareText size={22} />}
          label="Feedback"
          collapsed={isCollapsed}
        />
        <NavItem
          to="/admin/inventory"
          icon={<FaBoxOpen size={22} />}
          label="Inventory"
          collapsed={isCollapsed}
        />
        <NavItem
          to="/admin/promoManagement"
          icon={<LuPercent size={22} />}
          label="Prices and Discounts"
          collapsed={isCollapsed}
        />
      </nav>

      {/* Bottom */}
      <div className="px-4 py-6 border-t border-gray-200 mt-auto">
        {!isCollapsed && (
          <div className="mb-4">
            <p className="font-semibold text-sm">{userProfile?.firstName}</p>
            <p className="text-xs text-gray-500">{userProfile?.email}</p>
          </div>
        )}
        <button
          className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-black hover:bg-gray-300 rounded font-semibold transition w-full text-sm"
          onClick={signOut}
        >
          <MdLogout size={18} />
          {!isCollapsed && "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Burger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-gray-300 p-2 rounded-full shadow"
        onClick={toggleMobileSidebar}
        aria-label="Open sidebar"
      >
        <HiMenu size={24} />
      </button>

      {/* Desktop fixed sidebar */}
      <aside
        className="hidden md:flex md:fixed md:inset-y-0 md:left-0"
        style={{ zIndex: 40 }}
      >
        {SidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="h-full">{SidebarContent}</div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />
        </div>
      )}
    </>
  );
};

type NavItemProps = {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  to: string;
};

const NavItem = ({ icon, label, collapsed, to }: NavItemProps) => (
  <Link
    to={to}
    className="flex items-center gap-4 p-2 cursor-pointer transition hover:font-semibold text-sm hover:text-[#FFB030]"
  >
    {icon}
    {!collapsed && <span>{label}</span>}
  </Link>
);

export default AdminSidebar;
