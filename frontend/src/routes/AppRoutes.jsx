import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RouteGuard from "../components/RouteGuard";
import Layout from "../components/Layout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Membership from "../pages/Membership";
import AddMember from "../pages/AddMember";
import EditMember from "../pages/EditMember";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected administrative routes */}
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
      </Route>

      {/* Catch-all route to redirect back to base */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
