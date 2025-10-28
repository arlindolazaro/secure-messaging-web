// src/components/layout/AppLayout.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWebSocket } from "../../hooks/useWebSocket";
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
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { registerCallback, unregisterCallback } = useWebSocket(
    user?.id,
    undefined,
    user?.username
  );

  useEffect(() => {}, [user?.id, registerCallback, unregisterCallback]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: "Chat", icon: MessageSquare, path: "/chat" },
    { name: "Utilizadores", icon: Users, path: "/users" },
    { name: "Chaves", icon: Key, path: "/keys" },
    { name: "Certificados", icon: FileBadge, path: "/certificates" },
    { name: "Perfil", icon: User, path: "/profile" },
    { name: "Definições", icon: Settings, path: "/settings" },
  ];

  const currentPage =
    menuItems.find((item) => item.path === location.pathname)?.name ||
    "Secure Messaging";
  const isUserOnline = useMemo(() => {
    if (!user?.id) return false;
    if (!onlineUsers || onlineUsers.length === 0) return false;

    const normalized = onlineUsers
      .map((e) => {
        if (e == null) return null;
        if (typeof e === "number" || typeof e === "string")
          return { userId: String(e) };
        if (typeof e === "object") {
          return {
            userId:
              e.userId ??
              e.id ??
              e.user ??
              e.userID ??
              e.userid ??
              e.user_id ??
              undefined,
            username: e.username ?? e.userName ?? e.name,
          };
        }
        return null;
      })
      .filter(Boolean);

    return normalized.some((o) => Number(o.userId) === Number(user.id));
  }, [onlineUsers, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const normalizeListLocal = (list) => {
      if (!Array.isArray(list)) return [];
      return list
        .map((item) => {
          if (item == null) return null;
          if (typeof item === "number" || typeof item === "string") {
            return { userId: String(item), username: undefined };
          }
          // object
          const userId =
            item.userId ||
            item.id ||
            item.user ||
            (item.username ? undefined : undefined);
          const username = item.username || item.userName || item.name;
          if (userId) return { userId: String(userId), username };
          for (const k of Object.keys(item)) {
            const v = item[k];
            if (typeof v === "number" || typeof v === "string") {
              return { userId: String(v), username };
            }
          }
          return null;
        })
        .filter(Boolean);
    };

    const debugHandler = (payload) => {
      try {
        console.debug("[presence] payload recebido:", payload);
        if (!payload) return;

        if (Array.isArray(payload)) {
          setOnlineUsers(normalizeListLocal(payload));
          return;
        }

        if (Array.isArray(payload.users)) {
          setOnlineUsers(normalizeListLocal(payload.users));
          return;
        }
        if (Array.isArray(payload.onlineUsers)) {
          setOnlineUsers(normalizeListLocal(payload.onlineUsers));
          return;
        }

        if (payload.userId || payload.id) {
          // evento de single presence
          const id = payload.userId || payload.id;
          const username = payload.username;
          setOnlineUsers((prev) => {
            const current = normalizeListLocal(prev);
            if (payload.online === true) {
              const merged = normalizeListLocal(
                current.concat({ userId: id, username })
              );
              const map = new Map();
              merged.forEach((u) => map.set(String(u.userId), u));
              return Array.from(map.values());
            }

            if (payload.online === false) {
              return current.filter((u) => String(u.userId) !== String(id));
            }

            try {
              if (String(id) === String(user?.id)) {
                const merged = normalizeListLocal(
                  current.concat({ userId: id, username })
                );
                const map = new Map();
                merged.forEach((u) => map.set(String(u.userId), u));
                console.debug(
                  "[presence] evento sem 'online' recebido para o próprio user -> assumindo online",
                  id
                );
                return Array.from(map.values());
              }
            } catch {
              /* ignore */
            }

            return current;
          });
          return;
        }
        for (const k of Object.keys(payload)) {
          if (Array.isArray(payload[k])) {
            setOnlineUsers(normalizeListLocal(payload[k]));
            return;
          }
        }
      } catch (err) {
        console.error("[presence] erro ao tratar payload:", err);
      }
    };

    try {
      unregisterCallback("online-users");
    } catch (e) {
      console.debug(
        "[presence] unregister callback falhou (provavelmente não estava registado)",
        e
      );
    }
    registerCallback("online-users", debugHandler);

    return () => {
      try {
        unregisterCallback("online-users");
      } catch (e) {
        console.debug("[presence] unregister callback (cleanup) falhou", e);
      }
    };
  }, [registerCallback, unregisterCallback, user?.id]);

  useEffect(() => {
    try {
      console.debug("[presence] onlineUsers (raw):", onlineUsers);
    } catch {
      /* noop */
    }
  }, [onlineUsers]);

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
                <h1 className="text-lg font-semibold text-gray-800">
                  {currentPage}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-gray-700">
                <User className="h-5 w-5 text-gray-500" />
                {/* Presença à esquerda do nome: badge compacto + username */}
                <div className="flex items-center gap-3">
                  {isUserOnline ? (
                    <span
                      className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-semibold"
                      title="Online"
                      aria-live="polite"
                      aria-label="status-online"
                    >
                      <span className="h-2 w-2 rounded-full bg-green-600 inline-block" />
                      <span className="hidden sm:inline">online</span>
                    </span>
                  ) : (
                    <span
                      className="flex items-center gap-2 text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs"
                      title="Offline"
                      aria-live="polite"
                      aria-label="status-offline"
                    >
                      <span className="h-2 w-2 rounded-full bg-gray-400 inline-block" />
                      <span className="hidden sm:inline">offline</span>
                    </span>
                  )}

                  <span
                    className="text-sm font-medium text-gray-800"
                    aria-label="username"
                  >
                    {user?.username || "Utilizador"}
                  </span>
                </div>
              </div>

              {/* Mobile header logout removed to avoid duplicate logout controls; logout remains in sidebar footer */}
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
