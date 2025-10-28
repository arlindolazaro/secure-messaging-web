/* eslint-disable no-unused-vars */
// src/pages/UsersPage.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  Key,
  Mail,
  MessageSquare,
  Shield,
  CheckCircle,
  XCircle,
} from "lucide-react";
import DHResultModal from "../components/DHResultModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { userService } from "../api/userService";
import { useAuth } from "../contexts/AuthContext";

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dhResult, setDhResult] = useState(null);
  const [showDhModal, setShowDhModal] = useState(false);

  const loadUsers = React.useCallback(async () => {
    try {
      const usersData = await userService.getAllUsers();
      const filteredUsers = usersData.filter((u) => u.id !== currentUser.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Erro ao carregar utilizadores:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadUsers();
    const handler = () => loadUsers();
    window.addEventListener("usersUpdated", handler);
    return () => window.removeEventListener("usersUpdated", handler);
  }, [loadUsers]);

  const handleViewKeys = async (userId) => {
    try {
      const publicKey = await userService.getUserPublicKey(userId);
      if (publicKey) {
        alert(
          `Chave Pública do Utilizador:\n\n${publicKey.substring(0, 100)}...`
        );
      } else {
        alert("Utilizador não possui chave pública");
      }
    } catch (error) {
      console.error("Erro ao obter chave pública:", error);
      alert("Erro ao obter chave pública");
    }
  };

  const handleKeyExchange = async (targetUserId) => {
    try {
      // Verificar se ambos os utilizadores têm chaves DH configuradas
      const myDh = await userService
        .getUserDHPublicKey(currentUser.id)
        .catch(() => null);
      const targetDh = await userService
        .getUserDHPublicKey(targetUserId)
        .catch(() => null);

      // Se faltar a chave DH do utilizador atual, configurar automaticamente
      if (!myDh) {
        await userService.setupDiffieHellman(currentUser.id);
        // Re-obter a chave
      }

      // Se faltar a chave DH do utilizador alvo, tentar configurar também (pode falhar por permissões)
      if (!targetDh) {
        try {
          await userService.setupDiffieHellman(targetUserId);
        } catch (e) {
          // Se não for possível configurar para o outro utilizador, informar e abortar
          alert(
            "❌ O utilizador alvo não possui chaves DH configuradas. Peça ao utilizador para configurar DH antes de tentar novamente."
          );
          return;
        }
      }

      // Tentar novamente a troca de chaves
      const result = await userService.performKeyExchange(
        currentUser.id,
        targetUserId
      );

      if (result && result.success) {
        setDhResult(result);
        setShowDhModal(true);
      } else {
        alert(
          "❌ Erro no acordo de chaves: " +
            (result?.error || JSON.stringify(result))
        );
      }
    } catch (error) {
      console.error("Erro no acordo de chaves:", error);
      alert(
        "❌ Erro no acordo de chaves: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const closeDhModal = () => {
    setShowDhModal(false);
    setDhResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">A carregar utilizadores...</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length + 1;
  const usersWithKeys = users.filter((u) => u.publicKey).length;
  const totalCertificates = users.reduce(
    (acc, u) => acc + (u.certificateCount || 0),
    0
  );
  const totalKeyPairs = users.reduce(
    (acc, u) => acc + (u.keyPairCount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho simplificado: título removido, manter apenas resumo */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mt-1">
          {totalUsers} utilizadores registados
        </p>
      </div>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {/* Título compacto: removidos ícone e texto grande */}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              value={totalUsers}
              label="Utilizadores"
              color="blue"
            />
            <StatCard
              icon={Key}
              value={usersWithKeys}
              label="Com Chaves"
              color="green"
            />
            <StatCard
              icon={Mail}
              value={totalCertificates}
              label="Certificados"
              color="purple"
            />
            <StatCard
              icon={MessageSquare}
              value={totalKeyPairs}
              label="Pares de Chaves"
              color="orange"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Utilizadores */}
      {users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum outro utilizador encontrado
            </h3>
            <p className="text-gray-600">
              Ainda não existem outros utilizadores registados no sistema.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onViewKeys={handleViewKeys}
              onKeyExchange={handleKeyExchange}
            />
          ))}
        </div>
      )}
      <DHResultModal
        isOpen={showDhModal}
        onClose={closeDhModal}
        result={dhResult}
      />
    </div>
  );
};

// Componente StatCard corrigido
const StatCard = ({ icon: Icon, value, label, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className={`text-center p-4 ${colorClasses[color]} rounded-lg`}>
      <Icon className="h-8 w-8 mx-auto mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
};

// Componente UserCard
const UserCard = ({ user, onViewKeys, onKeyExchange }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
          {user.username?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {user.username}
          </h3>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-3 mb-4">
        <InfoRow
          icon={Key}
          label="Chave Pública"
          value={user.publicKey ? "Disponível" : "Indisponível"}
          status={user.publicKey ? "success" : "error"}
        />

        <InfoRow
          label="Certificados"
          value={user.certificateCount || 0}
          color="blue"
        />

        <InfoRow
          label="Pares de Chaves"
          value={user.keyPairCount || 0}
          color="purple"
        />

        <InfoRow
          label="Estado"
          value={user.enabled ? "activo" : "Inactivo"}
          status={user.enabled ? "success" : "error"}
        />
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => onKeyExchange(user.id)}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Key className="h-4 w-4" />
            Acordo DH
          </Button>
          <Button
            variant="outline"
            onClick={() => onViewKeys(user.id)}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Ver Chaves
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Componente InfoRow
const InfoRow = ({ icon: Icon, label, value, status, color }) => {
  const statusConfig = {
    success: { color: "text-green-600", icon: CheckCircle },
    error: { color: "text-red-600", icon: XCircle },
  };

  const colorConfig = {
    blue: "text-blue-600",
    purple: "text-purple-600",
  };

  const StatusIcon = status ? statusConfig[status].icon : null;
  const textColor = status
    ? statusConfig[status].color
    : colorConfig[color] || "text-gray-900";

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}:
      </span>
      <span className={`font-medium ${textColor} flex items-center gap-1`}>
        {StatusIcon && <StatusIcon className="h-4 w-4" />}
        {value}
      </span>
    </div>
  );
};
