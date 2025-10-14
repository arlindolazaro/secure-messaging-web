/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Chat } from "../components/chat/Chat";
import { messageService } from "../api/messageService";
import { userService } from "../api/userService";
import { imageService } from "../api/imageService";
import { CryptoUtils } from "../utils/CryptoUtils";
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

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadConversation(selectedUser.id);
    } else {
      setMessages([]);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!user?.id) return;

    const handleNewMessage = (newMessage) => {
      setMessages((prev) => {
        const exists = prev.some(
          (msg) =>
            msg.id === newMessage.id ||
            (msg.tempId &&
              newMessage.tempId &&
              msg.tempId === newMessage.tempId)
        );

        if (exists) {
          return prev;
        }

        const updatedMessages = [...prev, newMessage];
        return updatedMessages.sort(
          (a, b) =>
            new Date(a.sentAt || a.createdAt) -
            new Date(b.sentAt || b.createdAt)
        );
      });

      const isRelevantMessage =
        selectedUser &&
        (newMessage.senderId === selectedUser.id ||
          newMessage.receiverId === selectedUser.id);

      if (isRelevantMessage) {
        setTimeout(() => {
          const container = document.querySelector(".messages-container");
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 100);
      }
    };

    registerCallback("new-message", handleNewMessage);

    return () => {
      unregisterCallback("new-message");
    };
  }, [user?.id, selectedUser, registerCallback, unregisterCallback]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userService.getAllUsers();
      const filteredUsers = usersData
        .filter((u) => u.id !== user.id)
        .map((u) => ({
          ...u,
          hasPublicKey: !!u.publicKey && u.publicKey.length > 100,
          username: u.username || "Utilizador",
          email: u.email || "",
        }));
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Erro ao carregar utilizadores:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (otherUserId) => {
    if (!otherUserId) return;
    try {
      const conversation = await messageService.getConversation(
        user.id,
        otherUserId
      );

      const messagesArray = Array.isArray(conversation) ? conversation : [];
      const sortedMessages = messagesArray.sort(
        (a, b) =>
          new Date(a.sentAt || a.createdAt) - new Date(b.sentAt || b.createdAt)
      );

      setMessages(sortedMessages);

      setTimeout(() => {
        const container = document.querySelector(".messages-container");
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 300);
    } catch (error) {
      console.error("Erro ao carregar conversa:", error);
      setMessages([]);
    }
  };

  const handleSendMessage = async (content, attachmentMeta) => {
    if (!selectedUser || (!content.trim() && !attachmentMeta)) {
      return;
    }

    let tempMessageId = null;

    try {
      if (attachmentMeta) {
        return;
      }

      let finalContent = content;
      let isEncrypted = false;
      let messageHash = null;

      if (content.trim()) {
        tempMessageId = `temp-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        const tempMessage = {
          tempId: tempMessageId,
          senderId: user.id,
          receiverId: selectedUser.id,
          content: content,
          encrypted: false,
          signed: false,
          messageHash: null,
          attachment: null,
          senderUsername: user.username,
          status: "SENDING",
          sentAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          const updated = [...prev, tempMessage];
          return updated.sort(
            (a, b) => new Date(a.sentAt) - new Date(b.sentAt)
          );
        });

        setTimeout(() => {
          const container = document.querySelector(".messages-container");
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 50);
      }

      const shouldEncrypt =
        selectedUser.publicKey &&
        selectedUser.publicKey.length > 100 &&
        content.trim();

      if (shouldEncrypt) {
        try {
          isEncrypted = true;
          // usar sendSecureMessage que faz encrypt + sign via backend
          const sentResp = await messageService.sendSecureMessage({
            senderId: user.id,
            receiverId: selectedUser.id,
            content: finalContent,
            messageType: "TEXT",
          });

          // remover a mensagem temporária (se existir) — o servidor enviará a mensagem real via WebSocket
          if (tempMessageId) {
            setMessages((prev) =>
              prev.filter((msg) => msg.tempId !== tempMessageId)
            );
          }
        } catch (err) {
          console.error("Erro no envio seguro:", err);
          throw err;
        }
      } else {
        if (content.trim()) {
          const messageData = {
            senderId: user.id,
            receiverId: selectedUser.id,
            content: finalContent,
            encrypted: false,
            signed: false,
            messageHash: messageHash,
            messageType: "TEXT",
          };

          await messageService.sendEncryptedMessage(messageData);

          if (tempMessageId) {
            setMessages((prev) =>
              prev.filter((msg) => msg.tempId !== tempMessageId)
            );
          }
        }
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);

      if (tempMessageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.tempId === tempMessageId
              ? { ...msg, status: "FAILED", error: error.message }
              : msg
          )
        );
      }

      alert(
        `Erro ao enviar mensagem: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  };

  // No ChatPage.js - Corrigir handleDecryptMessage
  const handleDecryptMessage = async (messageId) => {
    try {
      console.log("🔓 ChatPage: Iniciando decriptação da mensagem:", messageId);

      // 1. Tentar descriptografia local primeiro (se disponível)
      const localPrivate = localStorage.getItem("local_private_key_pem");
      const msg = messages.find(
        (m) => m.id === messageId || m.tempId === messageId
      );

      if (msg && msg.encrypted && localPrivate) {
        try {
          console.log("🔄 Tentando decriptação local...");
          const plaintext = await CryptoUtils.pgpDecrypt(
            msg.content,
            localPrivate
          );
          console.log("✅ Decriptação local bem-sucedida");
          return {
            success: true,
            decryptedContent: plaintext,
            method: "local",
          };
        } catch (clientErr) {
          console.warn(
            "❌ Decriptação local falhou, usando servidor:",
            clientErr
          );
        }
      }

      // 2. Fallback para servidor
      console.log("🔄 Usando decriptação via servidor...");
      const result = await messageService.decryptMessage(messageId, user.id);

      if (result.success) {
        console.log("✅ Decriptação via servidor bem-sucedida");
        return {
          ...result,
          method: "server",
        };
      } else {
        console.error("❌ Decriptação via servidor falhou:", result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("💥 Erro crítico ao decriptar:", error);

      // Mensagem de erro amigável
      let userFriendlyError = "Erro ao decriptar a mensagem";

      if (error.message.includes("chave RSA")) {
        userFriendlyError = "Erro de criptografia - verifique as chaves";
      } else if (error.message.includes("integridade")) {
        userFriendlyError = "Mensagem corrompida ou alterada";
      } else if (error.message.includes("permissão")) {
        userFriendlyError = "Sem permissão para decriptar esta mensagem";
      }

      return {
        success: false,
        decryptedContent: `❌ ${userFriendlyError}`,
        error: error.message,
        rawError: error,
      };
    }
  };
  const handleSelectUser = (selectedUser) => {
    setSelectedUser(selectedUser);
    setShowUserList(false);
  };

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

  return (
    <div className="h-[calc(104vh-8rem)] bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        className={`p-2 text-center text-sm font-medium ${
          isConnected
            ? "bg-green-100 text-green-800 border-b border-green-200"
            : "bg-yellow-100 text-yellow-800 border-b border-yellow-200"
        }`}
      >
        {isConnected ? "🟢 Conectado em tempo real" : "🟡 A conectar..."}
      </div>

      <Chat
        user={user}
        users={users}
        selectedUser={selectedUser}
        messages={messages}
        showUserList={showUserList}
        onSelectUser={handleSelectUser}
        onSendMessage={handleSendMessage}
        onDecryptMessage={handleDecryptMessage}
        onToggleUserList={() => setShowUserList(!showUserList)}
        isWebSocketConnected={isConnected}
      />
    </div>
  );
};

export default ChatPage;
