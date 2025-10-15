/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Chat } from "../components/chat/Chat";
import { messageService } from "../api/messageService";
import { userService } from "../api/userService";
import { useWebSocket } from "../hooks/useWebSocket";

export const ChatPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(false);

  const { isConnected, registerCallback, unregisterCallback } = useWebSocket(
    user?.id
  );

  // ✅ CARREGAR USUÁRIOS
  useEffect(() => {
    loadUsers();
  }, []);

  // ✅ CARREGAR CONVERSA QUANDO USUÁRIO SELECIONADO
  useEffect(() => {
    if (selectedUser) {
      loadConversation(selectedUser.id);
    } else {
      setMessages([]);
    }
  }, [selectedUser]);

  // ✅ CONFIGURAR WEBSOCKET PARA NOVAS MENSAGENS
  useEffect(() => {
    if (!user?.id) return;

    const handleNewMessage = (newMessage) => {
      console.log("📨 Nova mensagem recebida via WebSocket:", newMessage);

      setMessages((prev) => {
        // Evitar duplicatas
        const exists = prev.some(
          (msg) =>
            msg.id === newMessage.id ||
            (msg.tempId &&
              newMessage.tempId &&
              msg.tempId === newMessage.tempId)
        );

        if (exists) {
          console.log("⚠️ Mensagem duplicada ignorada");
          return prev;
        }

        const updatedMessages = [...prev, newMessage];

        // Ordenar por data
        return updatedMessages.sort(
          (a, b) =>
            new Date(a.sentAt || a.createdAt) -
            new Date(b.sentAt || b.createdAt)
        );
      });
    };

    // Registrar callback do WebSocket
    registerCallback("new-message", handleNewMessage);

    return () => {
      unregisterCallback("new-message");
    };
  }, [user?.id, selectedUser, registerCallback, unregisterCallback]);

  // ✅ CARREGAR LISTA DE USUÁRIOS
  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log("👥 Carregando lista de usuários...");

      const usersData = await userService.getAllUsers();
      console.log("✅ Usuários carregados:", usersData);

      // Filtrar usuário atual e formatar dados
      const filteredUsers = usersData
        .filter((u) => u.id !== user.id)
        .map((u) => ({
          ...u,
          hasPublicKey: !!u.publicKey && u.publicKey.length > 100,
          username: u.username || "Utilizador",
          email: u.email || "",
        }));

      setUsers(filteredUsers);
      console.log(`✅ ${filteredUsers.length} usuários disponíveis`);
    } catch (error) {
      console.error("❌ Erro ao carregar utilizadores:", error);
      alert("Erro ao carregar lista de usuários: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CARREGAR CONVERSA
  const loadConversation = async (otherUserId) => {
    if (!otherUserId || !user?.id) {
      console.warn("❌ IDs não disponíveis para carregar conversa");
      return;
    }

    try {
      console.log(`💬 Carregando conversa entre ${user.id} e ${otherUserId}`);

      const conversation = await messageService.getConversation(
        user.id,
        otherUserId
      );
      console.log("✅ Conversa carregada:", conversation);

      const messagesArray = Array.isArray(conversation) ? conversation : [];

      const sortedMessages = messagesArray.sort(
        (a, b) =>
          new Date(a.sentAt || a.createdAt) - new Date(b.sentAt || b.createdAt)
      );

      setMessages(sortedMessages);
      console.log(`✅ ${sortedMessages.length} mensagens na conversa`);
    } catch (error) {
      console.error("❌ Erro ao carregar conversa:", error);
      setMessages([]);
    }
  };

  // ✅ ENVIAR MENSAGEM - FLUXO SIMPLIFICADO
  const handleSendMessage = async (content) => {
    if (!selectedUser || !content.trim() || !user?.id) {
      console.warn("❌ Dados insuficientes para enviar mensagem");
      alert("Selecione um usuário e digite uma mensagem");
      return;
    }

    const tempMessageId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // ✅ MENSAGEM TEMPORÁRIA PARA FEEDBACK IMEDIATO
    const tempMessage = {
      tempId: tempMessageId,
      senderId: user.id,
      receiverId: selectedUser.id,
      content: content,
      encrypted: false, // Backend decide automaticamente
      signed: false, // Backend decide automaticamente
      senderUsername: user.username,
      status: "SENDING",
      sentAt: new Date().toISOString(),
      messageType: "TEXT",
    };

    // Adiciona mensagem temporária imediatamente
    setMessages((prev) => {
      const updated = [...prev, tempMessage];
      return updated.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    });

    try {
      console.log("📤 Enviando mensagem para backend...", {
        senderId: user.id,
        receiverId: selectedUser.id,
        contentLength: content.length,
      });

      // ✅ ENVIA PARA BACKEND - ELE DECIDE CRIPTOGRAFIA AUTOMATICAMENTE
      await messageService.sendMessage({
        senderId: user.id,
        receiverId: selectedUser.id,
        content: content,
        messageType: "TEXT",
      });

      console.log("✅ Mensagem enviada com sucesso - aguardando WebSocket");

      // A mensagem real virá via WebSocket - remove a temporária
      setMessages((prev) => prev.filter((msg) => msg.tempId !== tempMessageId));
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);

      // Marca mensagem temporária como falha
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempMessageId
            ? {
                ...msg,
                status: "FAILED",
                error: error.message,
                content: `❌ Falha: ${content}`,
              }
            : msg
        )
      );

      alert(`Erro ao enviar mensagem: ${error.message}`);
    }
  };

  // ✅ DECRIPTAR MENSAGEM - CHAMA BACKEND
  const handleDecryptMessage = async (messageId) => {
    if (!user?.id) {
      console.error("❌ User ID não disponível para decriptação");
      return {
        success: false,
        decryptedContent: "❌ Erro: Utilizador não autenticado",
        error: "User ID não disponível",
      };
    }

    try {
      console.log("🔓 ChatPage: Solicitando decriptação...", {
        messageId,
        userId: user.id,
      });

      const result = await messageService.decryptMessage(messageId, user.id);

      console.log("✅ ChatPage: Resultado da decriptação:", result);
      return result;
    } catch (error) {
      console.error("💥 ChatPage: Erro crítico na decriptação:", error);
      return {
        success: false,
        decryptedContent: `❌ Erro crítico: ${error.message}`,
        error: error.message,
      };
    }
  };

  // ✅ VERIFICAR ASSINATURA (AGORA É UTILIZADA PELO COMPONENTE CHAT)
  const _handleVerifySignature = async (messageId) => {
    if (!user?.id) {
      alert("❌ Utilizador não autenticado");
      return { success: false, signatureValid: false };
    }

    try {
      const result = await messageService.verifySignature(messageId, user.id);
      const isValid = result.signatureValid || result.data?.signatureValid;

      alert(isValid ? "✅ Assinatura válida!" : "❌ Assinatura inválida!");
      return result;
    } catch (error) {
      console.error("Erro na verificação:", error);
      alert("❌ Erro ao verificar assinatura: " + error.message);
      return { success: false, signatureValid: false };
    }
  };

  // ✅ SELECIONAR USUÁRIO
  const handleSelectUser = (user) => {
    console.log("👤 Usuário selecionado:", user);
    setSelectedUser(user);
    setShowUserList(false);
  };

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">A carregar utilizadores...</p>
        </div>
      </div>
    );
  }

  // ✅ RENDER PRINCIPAL
  return (
    <div className="h-[calc(104vh-8rem)] bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Status da conexão */}
      <div
        className={`p-2 text-center text-sm font-medium ${
          isConnected
            ? "bg-green-100 text-green-800 border-b border-green-200"
            : "bg-yellow-100 text-yellow-800 border-b border-yellow-200"
        }`}
      >
        {isConnected ? "🟢 Conectado em tempo real" : "🟡 A conectar..."}
      </div>

      {/* Componente Chat */}
      <Chat
        user={user}
        users={users}
        selectedUser={selectedUser}
        messages={messages}
        showUserList={showUserList}
        onSelectUser={handleSelectUser}
        onSendMessage={handleSendMessage}
        onDecryptMessage={handleDecryptMessage}
        onVerifySignature={_handleVerifySignature}
        onToggleUserList={() => setShowUserList(!showUserList)}
        isWebSocketConnected={isConnected}
      />
    </div>
  );
};

export default ChatPage;