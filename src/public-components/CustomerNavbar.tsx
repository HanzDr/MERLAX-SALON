import { useState } from "react";
import { CiCalendar } from "react-icons/ci";
import { LuMessageSquareText } from "react-icons/lu";
import { CgProfile } from "react-icons/cg";
import { RiDiscountPercentLine } from "react-icons/ri";
import { MdLogout } from "react-icons/md";
import { HiMenu, HiX } from "react-icons/hi";
import { Link } from "react-router-dom";
import useAuth from "@/features/auth/hooks/UseAuth";

const CustomerNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <nav className="bg-white shadow-sm px-8 py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <h1 className="text-3xl font-bold text-orange-400 tracking-wide">
          MERLAX
        </h1>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-10 text-base font-semibold text-gray-800">
          <NavItem
            to="/customer/appointments"
            icon={<CiCalendar size={22} />}
            label="Appointment"
          />
          <NavItem
            to="/customer/feedback"
            icon={<LuMessageSquareText size={22} />}
            label="Feedback"
          />
          <NavItem
            to="/customer/profile"
            icon={<CgProfile size={22} />}
            label="Profile"
          />
        </div>

        {/* Logout Button */}
        <div className="hidden md:flex">
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition text-base"
          >
            <MdLogout size={20} />
            Logout
          </button>
        </div>

        {/* Hamburger Menu Icon */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-3xl text-gray-700"
          >
            {isOpen ? <HiX /> : <HiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden mt-4 space-y-4 text-base font-semibold text-gray-800 px-2">
          <NavItem
            to="/customer/appointments"
            icon={<CiCalendar size={20} />}
            label="Appointment"
          />
          <NavItem
            to="/customer/feedback"
            icon={<LuMessageSquareText size={20} />}
            label="Feedback"
          />
          <NavItem
            to="/customer/profile"
            icon={<CgProfile size={20} />}
            label="Profile"
          />

          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition text-base"
          >
            <MdLogout size={20} />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

const NavItem = ({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
}) => (
  <Link
    to={to}
    className="flex items-center gap-3 cursor-pointer hover:text-orange-500 transition"
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default CustomerNavbar;
