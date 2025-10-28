/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Chat } from "../components/chat/Chat";
import { messageService } from "../api/messageService";
import { cryptoService } from "../api/cryptoService";
import CryptoUtils from "../utils/CryptoUtils";
import { userService } from "../api/userService";
import { useWebSocket } from "../hooks/useWebSocket";

export const ChatPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  // Mapa de chaves AES por sessionId (base64)
  const [dhSessionKeys, setDhSessionKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(false);

  const { isConnected, registerCallback, unregisterCallback } = useWebSocket(
    user?.id,
    undefined,
    user?.username
  );
  const [onlineUsers, setOnlineUsers] = useState([]);

  const getUserSettings = () => {
    try {
      const saved = localStorage.getItem("userSettings");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Erro ao ler userSettings do localStorage:", e);
    }
    return { signMessages: true };
  };

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

        // Reconciliar com mensagem temporária
        let replaced = false;
        const normalized = prev.map((m) => {
          // Se tempId coincide com field tempId do WS (caso app passe-o)
          if (m.tempId && newMessage.tempId && m.tempId === newMessage.tempId) {
            replaced = true;
            return { ...newMessage };
          }

          // Se houver messageHash, usar para comparação
          if (
            m.senderId === newMessage.senderId &&
            m.receiverId === newMessage.receiverId &&
            m.status === "SENDING" &&
            newMessage.messageHash &&
            m.content
          ) {
            try {
              const mh = newMessage.messageHash;
              // comparar hashes simples por tamanho/semântica fallback
              if (m.content && m.content.length > 0 && mh) {
                replaced = true;
                return { ...newMessage };
              }
            } catch (e) {
              console.debug("Erro ao comparar messageHash:", e?.message || e);
            }
          }

          return m;
        });

        if (replaced) {
          const added = normalized;
          return added.sort(
            (a, b) =>
              new Date(a.sentAt || a.createdAt) -
              new Date(b.sentAt || b.createdAt)
          );
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

    // Registrar callback para atualizações de usuários online
    const handleOnlineUsers = (payload) => {
      // payload pode ser um único evento ou uma lista - suportar ambos
      if (!payload) return;
      if (Array.isArray(payload)) {
        setOnlineUsers(payload);
      } else if (payload.userId) {
        // atualizar lista adicionando/removendo
        setOnlineUsers((prev) => {
          const exists = prev.some((u) => u.userId === payload.userId);
          if (payload.online && !exists) return [...prev, payload];
          if (!payload.online)
            return prev.filter((u) => u.userId !== payload.userId);
          return prev;
        });
      }
    };

    registerCallback("online-users", handleOnlineUsers);

    return () => {
      unregisterCallback("new-message");
      unregisterCallback("online-users");
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
    if (!selectedUser || !user?.id) {
      console.warn("❌ Dados insuficientes para enviar mensagem");
      alert("Selecione um usuário e digite uma mensagem ou envie um ficheiro");
      return;
    }

    // Se `content` for um objeto (por exemplo resposta do upload), tratamos
    // como mensagem já persistida e a adicionamos diretamente.
    if (content && typeof content === "object") {
      const persisted = content.data || content.message || content;
      // Normalizar DTO se vier em { data: { ... } }
      const messageObj = persisted?.id ? persisted : persisted;
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === messageObj.id);
        if (exists) return prev;
        return [...prev, messageObj].sort(
          (a, b) =>
            new Date(a.sentAt || a.createdAt) -
            new Date(b.sentAt || b.createdAt)
        );
      });
      return messageObj;
    }

    const text = (content || "").toString();
    if (!text.trim()) {
      alert("Escreva uma mensagem antes de enviar");
      return;
    }

    const tempMessageId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // ✅ MENSAGEM TEMPORÁRIA PARA FEEDBACK IMEDIATO
    const userSettings = getUserSettings();

    const tempMessage = {
      tempId: tempMessageId,
      senderId: user.id,
      receiverId: selectedUser.id,
      content: text,
      encrypted: false, // Backend decide automaticamente
      signed: userSettings?.signMessages ?? false,
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

    // Guardar timestamp para timeout (não usado explicitamente)

    try {
      console.log("📤 Enviando mensagem para backend...", {
        senderId: user.id,
        receiverId: selectedUser.id,
        contentLength: content.length,
      });

      // ✅ ENVIA PARA BACKEND - ELE DECIDE CRIPTOGRAFIA AUTOMATICAMENTE
      const response = await messageService.sendMessage({
        senderId: user.id,
        receiverId: selectedUser.id,
        content: content,
        messageType: "TEXT",
        signed: userSettings?.signMessages ?? false,
      });

      console.log(
        "✅ Mensagem enviada com sucesso - aguardando WebSocket",
        response
      );

      // Não removemos imediatamente a temporária: esperamos confirmação via WebSocket.
      // Se após 30s não houver confirmação, marcamos como FAILED para o utilizador.
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempMessageId && !m.id
              ? { ...m, status: "FAILED", error: "Timeout de entrega" }
              : m
          )
        );
      }, 30000);
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
      console.log(
        "🔓 ChatPage: Tentando decriptar localmente (DH) antes do backend...",
        {
          messageId,
          userId: user.id,
        }
      );

      // Buscar a mensagem localmente (já carregada em state) para verificar dhSessionKey
      const msg = messages.find((m) => String(m.id) === String(messageId));
      if (msg && msg.encrypted && msg.dhSessionKey) {
        const aesB64 = dhSessionKeys[msg.dhSessionKey];
        if (aesB64) {
          try {
            const plaintext = await CryptoUtils.aesGcmDecryptBase64(
              aesB64,
              msg.iv,
              msg.content
            );
            return { success: true, decryptedContent: plaintext };
          } catch (err) {
            console.warn(
              "Falha na decriptação local DH, fallback para backend:",
              err.message
            );
            // fallback para backend
          }
        }
      }

      console.log("🔓 ChatPage: Solicitando decriptação no backend...", {
        messageId,
        userId: user.id,
      });
      const result = await messageService.decryptMessage(messageId, user.id);

      console.log("✅ ChatPage: Resultado da decriptação:", result);
      // Se a resposta contiver info de verificação de assinatura, atualizamos o estado
      if (result && result.success) {
        // marcar mensagem como verificada se aplicável
        if (result.signatureVerified || result.signatureValid) {
          setMessages((prev) =>
            prev.map((m) =>
              String(m.id) === String(messageId)
                ? { ...m, signatureVerified: true }
                : m
            )
          );
        }
      }

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
    // Tentar inicializar DH em background para esta conversa
    setTimeout(() => {
      initializeDhForConversation().catch((e) =>
        console.debug("DH init background falhou:", e.message)
      );
    }, 100);
  };

  // Inicia sessão DH e, se possível, deriva chave AES localmente (quando backend retorna prime/generator)
  const initializeDhForConversation = async () => {
    try {
      const init = await cryptoService.initializeDiffieHellman();
      if (!init || !init.sessionId) return null;

      // Se backend retornou prime/generator e publicKeyHex, usamos isso para gerar publicKey local e chamar calculate-raw
      if (init.prime && init.generator) {
        const client = CryptoUtils.generateDHKeyPairFromParams(
          init.prime,
          init.generator
        );
        // Enviar o publicKey (raw hex) para backend calcular segredo
        const rawResult = await cryptoService.calculateSharedSecretRaw(
          init.sessionId,
          client.publicKey
        );
        if (rawResult && rawResult.aesKey) {
          // armazenar chave AES (base64)
          setDhSessionKeys((prev) => ({
            ...prev,
            [init.sessionId]: rawResult.aesKey,
          }));
          return { sessionId: init.sessionId, aesKey: rawResult.aesKey };
        }
      }

      // Fallback: backend will handle shared secret if we exchange X.509 SPKI
      return { sessionId: init.sessionId };
    } catch (error) {
      console.error("Erro ao inicializar DH:", error);
      return null;
    }
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
      {/* Componente Chat */}
      <Chat
        user={user}
        users={users}
        selectedUser={selectedUser}
        messages={messages}
        showUserList={showUserList}
        onSelectUser={handleSelectUser}
        onSendMessage={handleSendMessage}
        onStartDH={initializeDhForConversation}
        onDecryptMessage={handleDecryptMessage}
        onVerifySignature={_handleVerifySignature}
        onToggleUserList={() => setShowUserList(!showUserList)}
        isWebSocketConnected={isConnected}
        onlineUsers={onlineUsers}
      />
    </div>
  );
};

export default ChatPage;
