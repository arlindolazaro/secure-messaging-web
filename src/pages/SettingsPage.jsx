import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Settings,
  Save,
  Shield,
  Bell,
  Lock,
  User,
  Eye,
  EyeOff,
  Mail,
  Globe,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";

export const SettingsPage = () => {
  useAuth();
  const [settings, setSettings] = useState({
    security: {
      autoLock: true,
      sessionTimeout: 30,
      requirePasswordChange: false,
      twoFactorAuth: false,
    },
    notifications: {
      newMessage: true,
      messageRead: false,
      securityAlerts: true,
      keyExpiry: true,
    },
    privacy: {
      showOnlineStatus: true,
      allowReadReceipts: true,
      encryptAllMessages: false,
    },
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem("userSettings", JSON.stringify(settings));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("✅ Definições guardadas com sucesso!");
    } catch (error) {
      console.error("Erro ao guardar definições:", error);
      alert("❌ Erro ao guardar definições");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("❌ As passwords não coincidem");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert("❌ A nova password deve ter pelo menos 8 caracteres");
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      alert("✅ Password alterada com sucesso!");
    } catch (error) {
      console.error("Erro ao alterar password:", error);
      alert("❌ Erro ao alterar password");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.autoLock}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        autoLock: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Bloqueio automático
                  </span>
                  <p className="text-xs text-gray-500">
                    Bloqueia a sessão após inatividade
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorAuth}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        twoFactorAuth: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Autenticação de dois fatores
                  </span>
                  <p className="text-xs text-gray-500">
                    Maior segurança no login
                  </p>
                </div>
              </label>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout de sessão (minutos)
                </label>
                <select
                  value={settings.security.sessionTimeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        sessionTimeout: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-600" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.newMessage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        newMessage: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Novas mensagens
                  </span>
                  <p className="text-xs text-gray-500">
                    Notificar quando receber mensagens
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.securityAlerts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        securityAlerts: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Alertas de segurança
                  </span>
                  <p className="text-xs text-gray-500">
                    Alertas importantes do sistema
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.keyExpiry}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        keyExpiry: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Expiração de chaves
                  </span>
                  <p className="text-xs text-gray-500">
                    Avisos sobre chaves próximas de expirar
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Privacidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.showOnlineStatus}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        showOnlineStatus: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Mostrar estado online
                  </span>
                  <p className="text-xs text-gray-500">
                    Outros utilizadores veem quando está online
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.allowReadReceipts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        allowReadReceipts: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Confirmações de leitura
                  </span>
                  <p className="text-xs text-gray-500">
                    Enviar confirmações quando ler mensagens
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer md:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.privacy.encryptAllMessages}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        encryptAllMessages: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Encriptar todas as mensagens
                  </span>
                  <p className="text-xs text-gray-500">
                    Encriptação automática para todas as conversas
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Alterar Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-600" />
              Alterar Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Atual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Password
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Password
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-end">
                <Button onClick={changePassword} className="w-full">
                  Alterar Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão de Guardar */}
        <div className="flex justify-center">
          <Button
            onClick={saveSettings}
            loading={saving}
            className="flex items-center gap-2 px-8"
          >
            <Save className="h-4 w-4" />
            <span>Guardar Definições</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
