import React from "react";
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
        
        <Route path="financial-accounts" element={<FinancialAccounts />} />
        <Route path="financial-accounts/fixed-deposits" element={<FixedDepositsDashboard />} />
        <Route path="financial-accounts/fixed-deposits/new" element={<AddFixedDeposit />} />
        <Route path="financial-accounts/fixed-deposits/:fdId" element={<FixedDepositDetails />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
