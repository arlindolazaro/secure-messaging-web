import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import { settingsService } from "../api/settingsService";

export const SettingsPage = () => {
  const { user } = useAuth();
  const defaultSettings = {
    hashAlgorithm: "SHA-256", // or SHA3-512
    pgpCipher: "AES-128", // AES-128, AES-256
    signMessages: true,
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      // try backend if user authenticated
      if (user && user.id) {
        try {
          const backend = await settingsService.getSettings(user.id);
          if (backend) {
            const parsed =
              typeof backend === "string" ? JSON.parse(backend) : backend;
            setSettings({
              hashAlgorithm: "SHA-256",
              pgpCipher: "AES-128",
              signMessages: true,
              ...parsed,
            });
            return;
          }
        } catch {
          console.warn(
            "Could not load settings from backend, falling back to localStorage"
          );
        }
      }

      const saved = localStorage.getItem("userSettings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings({
            hashAlgorithm: "SHA-256",
            pgpCipher: "AES-128",
            signMessages: true,
            ...parsed,
          });
        } catch {
          console.warn("Invalid userSettings in localStorage, ignoring.");
        }
      }
    };

    load();
  }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      // validação simples
      if (!settings.hashAlgorithm || !settings.pgpCipher) {
        alert("Preencha todas as opções antes de guardar");
        setSaving(false);
        return;
      }

      localStorage.setItem("userSettings", JSON.stringify(settings));

      if (user && user.id) {
        // enviar ao backend
        try {
          const res = await settingsService.updateSettings(user.id, settings);
          if (res && res.success) {
            alert("✅ Definições guardadas no servidor com sucesso!");
          } else {
            console.warn("Resposta inesperada do servidor:", res);
            alert(
              "⚠️ Definições guardadas localmente — resposta inesperada do servidor"
            );
          }
        } catch (err) {
          console.error("Erro ao guardar definições no servidor:", err);
          const serverMsg =
            err?.response?.data?.error || err.message || "Erro na comunicação";
          alert(
            `⚠️ Definições guardadas localmente. Falha ao enviar ao servidor: ${serverMsg}`
          );
        }
      } else {
        alert("✅ Definições guardadas localmente");
      }
    } catch (error) {
      console.error("Erro ao guardar definições:", error);
      alert("❌ Erro ao guardar definições");
    } finally {
      setSaving(false);
    }
  };

  const appVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";
  const systemSpecs = {
    platform: navigator.platform || "n/a",
    userAgent: navigator.userAgent || "n/a",
    language: navigator.language || "n/a",
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4">
      {/* Cabeçalho simplificado: título removido para visual mais limpo */}

      <div className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Algoritmo de Hash
          </label>
          <select
            value={settings.hashAlgorithm}
            onChange={(e) =>
              setSettings({ ...settings, hashAlgorithm: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="SHA-256">SHA-256</option>
            <option value="SHA3-512">SHA3-512</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Escolha o hash usado para assinaturas e verificação de integridade.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modo de cifra PGP (simétrica)
          </label>
          <select
            value={settings.pgpCipher}
            onChange={(e) =>
              setSettings({ ...settings, pgpCipher: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="AES-128">AES-128</option>
            <option value="AES-192">AES-192</option>
            <option value="AES-256">AES-256</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Modo de cifra usado para encriptar o payload simétrico dentro do
            envelope PGP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="signMessages"
            type="checkbox"
            checked={settings.signMessages}
            onChange={(e) =>
              setSettings({ ...settings, signMessages: e.target.checked })
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="signMessages" className="text-sm text-gray-700">
            Assinar mensagens
          </label>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={saveSettings}
            loading={saving}
            className="flex items-center gap-2 px-6"
          >
            <Save className="h-4 w-4" />
            <span>Guardar</span>
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-medium mb-2">Sobre</h3>
        <p className="text-xs text-gray-600">
          Versão da aplicação: <strong>{appVersion}</strong>
        </p>
        <p className="text-xs text-gray-600">
          Plataforma: {systemSpecs.platform}
        </p>
        <p className="text-xs text-gray-600">
          Navegador/UA: {systemSpecs.userAgent}
        </p>
        <p className="text-xs text-gray-600">Idioma: {systemSpecs.language}</p>
        <p className="text-xs text-gray-500 mt-2">
          As definições são guardadas localmente no browser. Se precisar que
          sejam enviadas ao servidor, implemente um endpoint /user/settings no
          backend e atualize esta página para chamar essa API.
        </p>
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium text-red-600 mb-2">Conta</h4>
          <p className="text-xs text-gray-500 mb-2">
            Pode remover a sua conta permanentemente. Esta ação é irreversível.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                if (!user || !user.id) {
                  alert("Utilizador não autenticado");
                  return;
                }
                // Não perguntar: executar eliminação imediatamente
                try {
                  const { userService } = await import("../api/userService");
                  await userService.deleteAccount(user.id);
                  // limpar sessão local
                  localStorage.removeItem("jwt_token");
                  localStorage.removeItem("auth_user");
                  localStorage.removeItem("userSettings");
                  alert("Conta eliminada. A aplicação será recarregada.");
                  window.location.reload();
                } catch (err) {
                  console.error("Erro ao eliminar conta:", err);
                  alert("Falha ao eliminar conta: " + (err.message || "Erro"));
                }
              }}
              className="bg-red-600 text-white"
            >
              Eliminar conta
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
