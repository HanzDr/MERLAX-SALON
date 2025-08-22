import CustomerNavbar from "@/public-components/CustomerNavbar";
import { Outlet } from "react-router-dom";
const CustomerLayout = () => {
  return (
    <div>
      <CustomerNavbar />
      <Outlet />
    </div>
  );
};

export default CustomerLayout;
