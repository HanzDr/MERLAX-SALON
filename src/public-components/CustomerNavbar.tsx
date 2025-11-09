// components/CustomerNavbar.tsx
import { useState } from "react";
import { FaRegCalendar } from "react-icons/fa6";
import { LuMessageSquareText } from "react-icons/lu";
import { CgProfile } from "react-icons/cg";
import { MdLogout } from "react-icons/md";
import { HiMenu, HiX } from "react-icons/hi";
import { Link, NavLink } from "react-router-dom";
import useAuth from "@/features/auth/hooks/UseAuth";

const CustomerNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();

  const toggle = () => setIsOpen((s) => !s);

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* CHANGED: use py-3 + min-h-16 for a bit more vertical space */}
        <div className="py-3 min-h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="group flex flex-col items-center">
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[#FFB030] to-[#FFCC6A] bg-clip-text text-transparent">
                MERLAX
              </span>
            </h1>
            <p className="text-[11px] text-gray-500">Customer</p>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 text-[15px] font-medium text-gray-700">
            <NavItem
              to="/customer/appointments"
              label="Appointments"
              icon={<FaRegCalendar size={18} />}
            />
            <NavItem
              to="/customer/feedback"
              label="Feedback"
              icon={<LuMessageSquareText size={18} />}
            />
            <NavItem
              to="/customer/profile"
              label="Profile"
              icon={<CgProfile size={18} />}
            />
          </div>

          {/* Logout */}
          <div className="hidden md:flex">
            {/* CHANGED: py-2.5 for slightly taller button */}
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 hover:bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 transition focus:outline-none focus:ring-2 focus:ring-[#FFB030]/50"
            >
              <MdLogout size={18} />
              Logout
            </button>
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden -mr-1.5">
            <button
              onClick={toggle}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              className="inline-flex items-center justify-center rounded-lg p-2.5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFB030]/50"
            >
              {isOpen ? (
                <HiX className="size-6" />
              ) : (
                <HiMenu className="size-6" />
              )}
              <span className="sr-only">Toggle menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`md:hidden transition-[max-height,opacity] duration-200 ease-out ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <div className="mx-3 mt-2 rounded-xl border border-gray-200 bg-white shadow-md">
          <div className="px-2 py-3 space-y-1">
            <MobileNavItem
              to="/customer/appointments"
              label="Appointments"
              icon={<FaRegCalendar size={18} />}
              onClick={() => setIsOpen(false)}
            />
            <MobileNavItem
              to="/customer/feedback"
              label="Feedback"
              icon={<LuMessageSquareText size={18} />}
              onClick={() => setIsOpen(false)}
            />
            <MobileNavItem
              to="/customer/profile"
              label="Profile"
              icon={<CgProfile size={18} />}
              onClick={() => setIsOpen(false)}
            />
          </div>
          <div className="px-2 pb-3">
            <button
              onClick={signOut}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 hover:bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 transition focus:outline-none focus:ring-2 focus:ring-[#FFB030]/50"
            >
              <MdLogout size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

/* ============= Subcomponents ============= */

const baseLink =
  // CHANGED: py-2.5 for a bit more vertical padding on links
  "inline-flex items-center gap-2 rounded-md px-3 py-2.5 transition select-none focus:outline-none focus:ring-2 focus:ring-[#FFB030]/50";

const activeLink = "text-[#FFB030] bg-[#FFF4E0] font-semibold shadow-sm";
const inactiveLink = "text-gray-700 hover:text-[#FFB030] hover:bg-[#FFF4E0]/80";

function NavItem({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [baseLink, isActive ? activeLink : inactiveLink].join(" ")
      }
    >
      <div className="grid place-items-center border border-gray-200 rounded-md bg-white w-8 h-8 shadow-sm group-hover:border-[#FFD699] transition">
        {icon}
      </div>
      <span>{label}</span>
    </NavLink>
  );
}

function MobileNavItem({
  to,
  label,
  icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          // CHANGED: py-2.5 here too
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition select-none",
          isActive
            ? "text-[#FFB030] bg-[#FFF4E0]"
            : "text-gray-700 hover:text-[#FFB030] hover:bg-[#FFF4E0]/80",
        ].join(" ")
      }
    >
      <div className="grid place-items-center border border-gray-200 rounded-md bg-white w-8 h-8 shadow-sm group-hover:border-[#FFD699] transition">
        {icon}
      </div>
      <span>{label}</span>
    </NavLink>
  );
}

export default CustomerNavbar;
