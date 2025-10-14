import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoginPage } from "../pages/LoginPage";
import { ChatPage } from "../pages/ChatPage";
import { ProfilePage } from "../pages/ProfilePage";
import { UsersPage } from "../pages/UsersPage";
import { KeysPage } from "../pages/KeysPage";
import { CertificatesPage } from "../pages/CertificatesPage";
import { CSRPage } from "../pages/CSRPage";
import { SettingsPage } from "../pages/SettingsPage";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner text="A carregar..." />;

  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner text="A carregar..." />;

  return !user ? children : <Navigate to="/chat" />;
};

const LoadingSpinner = ({ text }) => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    {text && <p className="ml-2">{text}</p>}
  </div>
);

export const AppRoutes = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      }
    />
    <Route
      path="/chat"
      element={
        <ProtectedRoute>
          <ChatPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/users"
      element={
        <ProtectedRoute>
          <UsersPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/keys"
      element={
        <ProtectedRoute>
          <KeysPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/certificates"
      element={
        <ProtectedRoute>
          <CertificatesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/csrs"
      element={
        <ProtectedRoute>
          <CSRPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      }
    />
    <Route path="/" element={<Navigate to="/chat" />} />
    <Route path="*" element={<Navigate to="/chat" />} />
  </Routes>
);
