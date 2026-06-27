import { Routes, Route, Navigate } from "react-router-dom";
import RouteGuard from "../components/RouteGuard";
import Layout from "../components/Layout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Membership from "../pages/Membership";
import AddMember from "../pages/AddMember";
import EditMember from "../pages/EditMember";
import FixedDepositsDashboard from "../pages/FixedDepositsDashboard";
import AddFixedDeposit from "../pages/AddFixedDeposit";
import FixedDepositDetails from "../pages/FixedDepositDetails";
import FinancialAccounts from "../pages/FinancialAccounts";
import FinancialDashboard from "../pages/FinancialDashboard";
import CashBook from "../pages/CashBook";
import ReceiptsModule from "../pages/ReceiptsModule";
import PaymentsModule from "../pages/PaymentsModule";
import EventsModule from "../pages/EventsModule";
import EventDetails from "../pages/EventDetails";
import ReportsModule from "../pages/ReportsModule";
import FinanceSettings from "../pages/FinanceSettings";
import Ordination from "../pages/Ordination";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RouteGuard>
            <Layout />
          </RouteGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="membership" element={<Membership />} />
        <Route path="membership/add" element={<AddMember />} />
        <Route path="membership/edit/:id" element={<EditMember />} />
        <Route path="membership/edit" element={<EditMember />} />
        <Route path="ordination" element={<Ordination />} />
        
        <Route path="events" element={<EventsModule />} />
        <Route path="events/:eventId" element={<EventDetails />} />
        
        <Route path="financial-accounts" element={<FinancialAccounts />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FinancialDashboard />} />
          <Route path="cash-book" element={<CashBook />} />
          <Route path="receipts" element={<ReceiptsModule />} />
          <Route path="payments" element={<PaymentsModule />} />
          <Route path="reports" element={<ReportsModule />} />
          <Route path="fixed-deposits" element={<FixedDepositsDashboard />} />
          <Route path="fixed-deposits/new" element={<AddFixedDeposit />} />
          <Route path="fixed-deposits/:fdId" element={<FixedDepositDetails />} />
          <Route path="settings" element={<FinanceSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
