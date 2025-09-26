// src/routes/AppRoutes.tsx
import { createBrowserRouter } from "react-router-dom";

import AuthCallback from "@/features/auth/hooks/AuthCallback";
import NotFoundPage from "@/pages/NotFoundPage";
import ResetPassword from "@/pages/ResetPassword";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminAppointments from "@/pages/admin/AdminAppointments";
import AdminServicesAndStylists from "@/pages/admin/AdminServicesAndStylists";
import { PaginationProvider } from "@/public-context/PaginationContext";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import AdminPackages from "@/pages/admin/AdminPackages";

import AdminLayout from "@/layouts/AdminLayout";

import CustomerLogin from "@/pages/customer/CustomerLogin";
import CustomerSignUp from "@/pages/customer/CustomerSignUp";
import CustomerAppointments from "@/pages/customer/CustomerAppointments";
import CustomerFeedback from "@/pages/customer/CustomerFeedback";
import CustomerProfile from "@/pages/customer/CustomerProfile";
import CustomerPromos from "@/pages/customer/CustomerPromos";
import CustomerLayout from "@/layouts/CustomerLayout";

import RootLayout from "@/layouts/RootLayout";
import RoleProtectedRoute from "@/public-components/RoleProtectedRoute";
import { ServicesAndStylistProvider } from "@/features/servicesAndStylist/contexts/ServicesAndStylistContext";
import { PromoManagementProvider } from "@/features/promo-management/context/promoManagementContext";
import { AppointmentProvider } from "@/features/appointments/context/AppointmentContext";
import { FeedbackProvider } from "@/features/feedback/context/FeedbackContext";
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // Public auth routes
      { path: "auth/callback", element: <AuthCallback /> },
      { path: "customer/login", element: <CustomerLogin /> },
      { path: "customer/signup", element: <CustomerSignUp /> },
      { path: "customer/resetPassword", element: <ResetPassword /> },
      { path: "admin/login", element: <AdminLogin /> },

      // Admin routes (protected)
      {
        path: "admin",
        element: (
          <RoleProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </RoleProtectedRoute>
        ),
        children: [
          {
            path: "appointments",
            element: (
              <PromoManagementProvider>
                <FeedbackProvider>
                  <AppointmentProvider>
                    <ServicesAndStylistProvider>
                      <AdminAppointments />
                    </ServicesAndStylistProvider>
                  </AppointmentProvider>
                </FeedbackProvider>
              </PromoManagementProvider>
            ),
          },
          {
            path: "services&stylists",
            element: (
              <ServicesAndStylistProvider>
                <AdminServicesAndStylists />
              </ServicesAndStylistProvider>
            ),
          },
          {
            path: "customers",
            element: (
              <PaginationProvider>
                <AdminCustomers />
              </PaginationProvider>
            ),
          },
          {
            path: "feedback",
            element: (
              <FeedbackProvider>
                <AdminFeedback />
              </FeedbackProvider>
            ),
          },
          { path: "inventory", element: <NotFoundPage /> }, // Need to update element
          {
            path: "promoManagement",
            element: (
              <PromoManagementProvider>
                <ServicesAndStylistProvider>
                  <AdminPackages />
                </ServicesAndStylistProvider>
              </PromoManagementProvider>
            ),
          },
        ],
      },

      // Customer routes (protected)
      {
        path: "customer",
        element: (
          <RoleProtectedRoute allowedRoles={["customer"]}>
            <CustomerLayout />
          </RoleProtectedRoute>
        ), // uses <Outlet />
        children: [
          {
            path: "appointments",
            element: (
              <AppointmentProvider>
                <PromoManagementProvider>
                  <ServicesAndStylistProvider>
                    <CustomerAppointments />
                  </ServicesAndStylistProvider>
                </PromoManagementProvider>
              </AppointmentProvider>
            ),
          },
          { path: "feedback", element: <CustomerFeedback /> },
          { path: "profile", element: <CustomerProfile /> },
          { path: "promos", element: <CustomerPromos /> },
        ],
      },

      // 404 fallback
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default router;
