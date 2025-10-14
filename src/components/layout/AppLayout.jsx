// src/components/layout/AppLayout.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  MessageSquare,
  Users,
  Key,
  FileBadge,
  User,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

export const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: "Chat", icon: MessageSquare, path: "/chat" },
    { name: "Utilizadores", icon: Users, path: "/users" },
    { name: "Chaves", icon: Key, path: "/keys" },
    { name: "Certificados", icon: FileBadge, path: "/certificates" },
    // NOTE: 'Pedidos Assinatura' intentionally removed from sidebar. Accessible via Certificates page when needed.
    { name: "Perfil", icon: User, path: "/profile" },
    { name: "Definições", icon: Settings, path: "/settings" },
  ];

  const currentPage =
    menuItems.find((item) => item.path === location.pathname)?.name ||
    "Secure Messaging";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:static top-0 left-0 h-full bg-[#0f172a] text-white transform transition-all duration-300 z-50
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        ${sidebarCollapsed ? "lg:w-20" : "lg:w-64"}
        lg:translate-x-0 lg:flex lg:flex-col border-r border-gray-800
      `}
      >
        {/* Logo */}
        <div
          className={`flex items-center ${
            sidebarCollapsed ? "justify-center px-2" : "px-6"
          } py-4 border-b border-gray-800`}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 flex-1">
              <Shield className="h-5 w-5 text-blue-400" />
              <div>
                <h2 className="text-sm font-semibold">Secure Messaging</h2>
                <p className="text-xs text-gray-400">PKI Completa</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && <Shield className="h-5 w-5 text-blue-400" />}

          {/* Botão para recolher/expandir (apenas desktop) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block p-1 text-gray-400 hover:text-white ml-2"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Botão fechar (apenas mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 mt-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center ${
                    sidebarCollapsed ? "justify-center px-2" : "px-4"
                  } py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`
                }
                title={sidebarCollapsed ? item.name : ""}
              >
                <IconComponent className="h-4 w-4" />
                {!sidebarCollapsed && <span className="ml-3">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div
          className={`p-4 border-t border-gray-800 ${
            sidebarCollapsed ? "text-center" : ""
          }`}
        >
          <div
            className={`${
              sidebarCollapsed
                ? "flex flex-col items-center space-y-2"
                : "flex items-center justify-between"
            } text-xs text-gray-400`}
          >
            {!sidebarCollapsed && (
              <div>
                <p className="mt-1">Todos os direitos reservados.</p>
              </div>
            )}
            <button
              onClick={logout}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Área principal */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-0" : ""
        }`}
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-200 z-30 sticky top-0">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-800">
                  {currentPage}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm hidden sm:inline">
                  {user?.username || "Utilizador"}
                </span>
              </div>

              <button
                onClick={logout}
                className="sm:hidden p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
