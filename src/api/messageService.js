import api from "./index";

export const messageService = {
  // ✅ ENVIAR MENSAGEM - Backend decide automaticamente sobre criptografia PGP
  async sendMessage(messageData) {
    try {
      console.log("📤 Enviando mensagem para backend:", {
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        contentLength: messageData.content?.length,
        messageType: messageData.messageType,
      });

      // ✅ ENVIA PARA ENDPOINT CORRETO - Backend decide criptografia automaticamente
      const response = await api.post("/messages/send/encrypted", {
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        content: messageData.content,
        messageType: messageData.messageType || "TEXT",
        signed: messageData.signed || false,
      });

      console.log("✅ Mensagem processada pelo backend:", response.data);

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.error || "Erro no servidor");
      }
    } catch (error) {
      console.error("❌ Erro crítico ao enviar mensagem:", {
        error: error.message,
        response: error.response?.data,
      });

      throw new Error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Erro de comunicação com o servidor"
      );
    }
  },

  // ✅ DECRIPTAR MENSAGEM - Funcionalidade completa
  async decryptMessage(messageId, userId) {
    try {
      console.log("🔓 Iniciando decriptação no frontend:", {
        messageId,
        userId,
      });

      const response = await api.post(`/messages/${messageId}/decrypt`, {
        userId: userId,
      });

      console.log("✅ Resposta da decriptação:", response.data);

      // ✅ VERIFICAÇÃO ROBUSTA DA RESPOSTA
      if (response.data && response.data.success !== false) {
        return {
          success: true,
          decryptedContent: response.data.decryptedContent,
          messageId: response.data.messageId,
          userId: response.data.userId,
        };
      } else {
        throw new Error(response.data.error || "Falha na decriptação");
      }
    } catch (error) {
      console.error("❌ Erro na decriptação:", {
        messageId,
        userId,
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        decryptedContent: `❌ Erro: ${
          error.response?.data?.error || error.message
        }`,
        error: error.message,
        messageId: messageId,
        userId: userId,
      };
    }
  },

  // ✅ BUSCAR CONVERSA ENTRE USUÁRIOS
  async getConversation(userId1, userId2) {
    try {
      console.log("💬 Buscando conversa entre:", { userId1, userId2 });

      const response = await api.get(
        `/messages/conversation/${userId1}/${userId2}`
      );

      if (response.data.success) {
        return response.data.conversation || [];
      } else {
        console.warn("Conversa não encontrada ou vazia");
        return [];
      }
    } catch (error) {
      console.error("Erro ao buscar conversa:", error);
      return [];
    }
  },

  // ✅ VERIFICAR ASSINATURA DIGITAL
  async verifySignature(messageId, userId) {
    try {
      const response = await api.get(
        `/messages/${messageId}/verify-signature?userId=${userId}`
      );

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.error || "Falha na verificação");
      }
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error);
      throw new Error(
        error.response?.data?.error || "Erro na verificação de assinatura"
      );
    }
  },

  // ✅ BUSCAR MENSAGENS DO USUÁRIO
  async getMessagesByUser(userId) {
    try {
      const response = await api.get(`/messages/user/${userId}`);
      return response.data.messages || [];
    } catch (error) {
      console.error("Erro ao buscar mensagens do usuário:", error);
      return [];
    }
  },

  // ✅ MARCAR MENSAGEM COMO LIDA
  async markAsRead(messageId) {
    try {
      const response = await api.put(`/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
      throw error;
    }
  },

  // ✅ BUSCAR MENSAGEM POR ID
  async getMessageById(messageId) {
    try {
      const response = await api.get(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar mensagem:", error);
      throw error;
    }
  },

  // ==================== DIFFIE-HELLMAN HELPERS ====================
  async startDHSession() {
    try {
      const response = await api.post("/crypto/dh/initialize");
      return response.data; // { sessionId, publicKey, algorithm }
    } catch (error) {
      console.error("Erro ao iniciar sessão DH:", error);
      throw error;
    }
  },

  async calculateDHSharedSecret(sessionId, otherPublicKey) {
    try {
      const response = await api.post("/crypto/dh/calculate-secret", {
        sessionId,
        otherPublicKey,
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao calcular segredo DH:", error);
      throw error;
    }
  },

  async sendMessageWithDH(senderId, receiverId, content, dhSessionId) {
    try {
      const response = await api.post("/messages/send/dh", {
        senderId,
        receiverId,
        content,
        dhSessionId,
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao enviar mensagem DH:", error);
      throw error;
    }
  },

  // ✅ HEALTH CHECK
  async healthCheck() {
    try {
      const response = await api.get("/messages/health");
      return response.data;
    } catch (error) {
      console.error("Health check falhou:", error);
      return { status: "DOWN", error: error.message };
    }
  },
};

export default messageService;
