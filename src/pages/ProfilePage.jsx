// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Key,
  MessageSquare,
  Download,
  Settings,
  FileText,
  Copy,
  Share2,
  Lock,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { userService } from "../api/userService";

export const ProfilePage = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Carrega estatísticas do utilizador (definido antes dos useEffect para evitar TDZ)
  const loadUserStats = React.useCallback(async () => {
    try {
      if (user?.id) {
        const stats = await userService.getUserStatistics(user.id);
        setUserStats(stats);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      // Fallback para dados básicos
      setUserStats({
        hasPublicKey: user?.publicKey != null,
        hasDhKeys: true,
        certificateCount: 0,
        keyPairCount: 1,
        sentMessageCount: 0,
        receivedMessageCount: 0,
        createdAt: user?.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Quando o componente monta ou o utilizador muda, carregar estatísticas
    loadUserStats();
  }, [user, loadUserStats]);

  // atualizar estatísticas quando outras ações mudarem o estado do utilizador
  useEffect(() => {
    const handler = () => loadUserStats();
    window.addEventListener("userStatsUpdated", handler);
    return () => window.removeEventListener("userStatsUpdated", handler);
  }, [loadUserStats]);

  const exportKey = async (format) => {
    setExporting(true);
    try {
      // Exporta apenas a chave pública sem senha
      const publicKey = await userService.getUserPublicKey(user.id);

      if (!publicKey) {
        alert("❌ Não possui chave pública configurada");
        return;
      }

      let keyData;
      switch (format) {
        case "pem":
          keyData = userService.formatAsPEM({
            publicKey,
            username: user.username,
            algorithm: "RSA",
            keySize: 1024,
            exportedAt: new Date().toISOString(),
          });
          break;
        case "json":
          keyData = userService.formatAsJSON({
            publicKey,
            username: user.username,
            algorithm: "RSA",
            keySize: 1024,
            exportedAt: new Date().toISOString(),
          });
          break;
        case "txt":
          keyData = userService.formatAsTXT({
            publicKey,
            username: user.username,
            algorithm: "RSA",
            keySize: 1024,
            exportedAt: new Date().toISOString(),
          });
          break;
        default:
          throw new Error("Formato não suportado");
      }

      const blob = new Blob([keyData.content], { type: keyData.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = keyData.filename;
      a.click();
      URL.revokeObjectURL(url);

      setShowExportMenu(false);
      alert(`✅ Chave pública exportada em formato ${format.toUpperCase()}!`);
    } catch (error) {
      console.error("Erro ao exportar chave:", error);
      alert("❌ Erro ao exportar chave pública");
    } finally {
      setExporting(false);
    }
  };

  const copyPublicKey = async () => {
    try {
      const publicKey = await userService.getUserPublicKey(user.id);
      if (!publicKey) {
        alert("❌ Não possui chave pública configurada");
        return;
      }

      await navigator.clipboard.writeText(publicKey);
      alert("✅ Chave pública copiada para a área de transferência!");
    } catch (error) {
      console.error("Erro ao copiar chave:", error);
      alert("❌ Erro ao copiar chave");
    }
  };

  const sharePublicKey = async () => {
    try {
      const publicKey = await userService.getUserPublicKey(user.id);
      if (!publicKey) {
        alert("❌ Não possui chave pública configurada");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: `Chave Pública - ${user.username}`,
          text: `Chave pública RSA de ${user.username}`,
          url: `data:text/plain;base64,${btoa(publicKey)}`,
        });
      } else {
        await navigator.clipboard.writeText(publicKey);
        alert("✅ Chave pública copiada! Compartilhe com quem precisar.");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  const exportAllKeys = async () => {
    setExporting(true);
    try {
      // Para backup completo, ainda podemos tentar a API se existir
      let keys;
      try {
        keys = await userService.exportUserKeys(user.id);
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // Se a API falhar, criar um backup básico com chave pública
        const publicKey = await userService.getUserPublicKey(user.id);
        keys = {
          publicKey: publicKey,
          privateKey: null, // Por segurança, não exportamos privada sem senha
          dhParams: null,
        };
      }

      // Criar pacote completo
      const packageData = {
        user: {
          username: user.username,
          email: user.email,
          exportedAt: new Date().toISOString(),
        },
        keys: keys,
        metadata: {
          version: "1.0",
          format: "SecureMessaging Key Package",
          note: "Contém apenas chave pública por questões de segurança",
        },
      };

      const blob = new Blob([JSON.stringify(packageData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-chaves-${user.username}-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert("✅ Backup das chaves públicas exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar chaves:", error);
      alert("❌ Erro ao exportar chaves");
    } finally {
      setExporting(false);
    }
  };

  const setupDiffieHellman = async () => {
    try {
      await userService.setupDiffieHellman(user.id);
      await loadUserStats();
      alert("✅ Diffie-Hellman configurado com sucesso!");
    } catch (error) {
      console.error("Erro ao configurar Diffie-Hellman:", error);
      alert("❌ Erro ao configurar Diffie-Hellman");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">A carregar perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Utilizador */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="h-4 w-4" />
                    Username
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {user?.username}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {user?.email}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4" />
                    Conta criada em
                  </label>
                  <p className="text-gray-900">
                    {new Date(userStats?.createdAt).toLocaleDateString("pt-PT")}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4" />
                    Último login
                  </label>
                  <p className="text-gray-900">
                    {new Date(userStats?.lastLogin).toLocaleDateString("pt-PT")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  icon={MessageSquare}
                  value={userStats?.sentMessageCount || 0}
                  label="Mensagens Env."
                  color="blue"
                />
                <StatCard
                  icon={MessageSquare}
                  value={userStats?.receivedMessageCount || 0}
                  label="Mensagens Rec."
                  color="green"
                />
                <StatCard
                  icon={Key}
                  value={userStats?.certificateCount || 0}
                  label="Certificados"
                  color="purple"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estado de Segurança e Ações */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Estado de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecurityStatus
                label="Chave RSA"
                active={userStats?.hasPublicKey}
              />
              <SecurityStatus
                label="Diffie-Hellman"
                active={userStats?.hasDhKeys}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Certificados
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                  {userStats?.certificateCount || 0} activos
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas Modernizadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Gestão de Chaves
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Ações Rápidas */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={copyPublicKey}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-10"
                  disabled={exporting}
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>

                <Button
                  onClick={sharePublicKey}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-10"
                  disabled={exporting}
                >
                  <Share2 className="h-4 w-4" />
                  Partilhar
                </Button>
              </div>

              {/* Menu de Exportação */}
              <div className="relative">
                <Button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={exporting}
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {exporting ? "A exportar..." : "Exportar Chave Pública"}
                  </span>
                </Button>

                {showExportMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2 space-y-1">
                    <button
                      onClick={() => exportKey("pem")}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      disabled={exporting}
                    >
                      <FileText className="h-4 w-4" />
                      Formato PEM
                    </button>
                    <button
                      onClick={() => exportKey("json")}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      disabled={exporting}
                    >
                      <FileText className="h-4 w-4" />
                      Formato JSON
                    </button>
                    <button
                      onClick={() => exportKey("txt")}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      disabled={exporting}
                    >
                      <FileText className="h-4 w-4" />
                      Texto Simples
                    </button>
                  </div>
                )}
              </div>

              {/* Backup Completo */}
              <Button
                onClick={exportAllKeys}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                disabled={exporting}
              >
                <Key className="h-4 w-4" />
                <span>{exporting ? "A processar..." : "Backup Chaves"}</span>
              </Button>

              <Button
                onClick={setupDiffieHellman}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                disabled={exporting}
              >
                <Key className="h-4 w-4" />
                <span>Configurar DH</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Componente StatCard
// eslint-disable-next-line no-unused-vars
const StatCard = ({ icon: Icon, value, label, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className={`text-center p-4 ${colorClasses[color]} rounded-lg`}>
      <Icon className="h-8 w-8 mx-auto mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
};

// Componente Status de Segurança
const SecurityStatus = ({ label, active }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        active ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100"
      }`}
    >
      {active ? "✅ Configurado" : "❌ Ausente"}
    </span>
  </div>
);

export default ProfilePage;
