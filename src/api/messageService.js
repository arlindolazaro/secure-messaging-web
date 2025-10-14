import api from "./index";
import { cryptoService } from "./cryptoService";
import { userService } from "./userService";
import { CryptoUtils } from "../utils/CryptoUtils";

export const messageService = {
  async sendEncryptedMessage(messageData) {
    try {
      const response = await api.post("/messages/send/encrypted", messageData);
      return response.data;
    } catch (error) {
      console.error("Erro ao enviar mensagem PGP:", error);
      throw error;
    }
  },

  // No messageService.js - Corrigir o método decryptMessage
  async decryptMessage(messageId, userId) {
    try {
      console.log("🔓 Frontend: Iniciando decriptação:", { messageId, userId });

      const requestBody = { userId: userId };

      const response = await api.post(
        `/messages/${messageId}/decrypt`,
        requestBody
      );

      console.log("✅ Frontend: Resposta da decriptação:", response.data);

      // ✅ VERIFICAÇÃO ROBUSTA DA RESPOSTA
      if (response.data && response.data.success !== false) {
        // Múltiplas possibilidades de estrutura de resposta
        const decryptedContent =
          response.data.decryptedContent ||
          response.data.data?.decryptedContent ||
          response.data.content;

        if (decryptedContent) {
          return {
            success: true,
            decryptedContent: decryptedContent,
            rawResponse: response.data,
          };
        }
      }

      // Se chegou aqui, é erro
      const errorMessage =
        response.data?.error ||
        response.data?.message ||
        "Estrutura de resposta inválida do servidor";

      throw new Error(errorMessage);
    } catch (error) {
      console.error("❌ Frontend: Erro ao decriptar PGP:", error);

      // ✅ MENSAGEM DE ERRO DETALHADA
      let errorMessage = "Erro desconhecido na decriptação";

      if (error.response) {
        // Erro do servidor
        errorMessage =
          error.response.data?.error ||
          error.response.data?.message ||
          `Erro ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        // Sem resposta do servidor
        errorMessage = "Sem resposta do servidor - verifique a conexão";
      } else {
        // Outro erro
        errorMessage = error.message || "Erro na requisição";
      }

      return {
        success: false,
        decryptedContent: `❌ Erro: ${errorMessage}`,
        error: errorMessage,
        rawError: error,
      };
    }
  },

  async verifySignature(messageId, userId) {
    try {
      const response = await api.get(
        `/messages/${messageId}/verify-signature?userId=${userId}`
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error);
      throw error;
    }
  },
  // Adicionar ao messageService.js
  async debugKeys(publicKey, privateKey) {
    try {
      const response = await api.post("/api/crypto/debug-keys", {
        publicKey,
        privateKey,
      });
      return response.data;
    } catch (error) {
      console.error("Erro no debug das chaves:", error);
      throw error;
    }
  },

  async debugEncryptedData(encryptedData) {
    try {
      const response = await api.post("/api/crypto/debug-encrypted-data", {
        encryptedData,
      });
      return response.data;
    } catch (error) {
      console.error("Erro no debug dos dados:", error);
      throw error;
    }
  },

  // Método melhorado de descriptografia com debug
  async decryptMessageWithDebug(messageId, userId) {
    try {
      console.log("🐛 DEBUG: Iniciando decriptação com debug...");

      // Primeiro, buscar a mensagem para obter os dados criptografados
      const messageResponse = await api.get(`/api/messages/${messageId}`);
      const message = messageResponse.data.message;

      console.log("🐛 DEBUG: Mensagem obtida:", {
        id: message.id,
        encrypted: message.encrypted,
        contentLength: message.content?.length,
        hasSignature: !!message.signature,
        messageType: message.messageType,
      });

      // Debug dos dados criptografados
      if (message.encrypted && message.content) {
        const dataDebug = await this.debugEncryptedData(message.content);
        console.log("🐛 DEBUG: Análise dos dados criptografados:", dataDebug);
      }

      // Agora tentar a decriptação normal
      const requestBody = { userId: userId };
      const response = await api.post(
        `/api/messages/${messageId}/decrypt`,
        requestBody
      );

      console.log("🐛 DEBUG: Resposta da decriptação:", response.data);

      if (response.data.success === true && response.data.decryptedContent) {
        return {
          success: true,
          decryptedContent: response.data.decryptedContent,
          rawResponse: response.data,
        };
      } else {
        throw new Error(
          response.data.error || "Estrutura de resposta inválida"
        );
      }
    } catch (error) {
      console.error("🐛 DEBUG: Erro detalhado:", error);

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Erro desconhecido na decriptação";

      return {
        success: false,
        decryptedContent: `❌ Erro: ${errorMessage}`,
        error: errorMessage,
        rawError: error,
      };
    }
  },
  async getConversation(userId1, userId2) {
    try {
      const response = await api.get(
        `/messages/conversation/${userId1}/${userId2}`
      );
      return response.data.conversation || [];
    } catch (error) {
      console.error("Erro ao buscar conversa:", error);
      return [];
    }
  },

  async getMessagesByUser(userId) {
    try {
      const response = await api.get(`/messages/user/${userId}`);
      return response.data.messages || [];
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      return [];
    }
  },

  async markAsRead(messageId) {
    try {
      const response = await api.put(`/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
      throw error;
    }
  },

  async deleteMessage(messageId) {
    try {
      const response = await api.delete(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);
      throw error;
    }
  },

  // Envio seguro completo (PGP-style) - usa endpoints de crypto no backend
  async sendSecureMessage({
    senderId,
    receiverId,
    content,
    messageType = "TEXT",
  }) {
    try {
      // 1) Obter chave pública do destinatário
      let publicKey = await userService.getUserPublicKey(receiverId);
      if (!publicKey)
        throw new Error("Chave pública do destinatário não encontrada");

      // Se o backend retornou apenas Base64 (SPKI) sem cabeçalhos PEM, converter
      // para PEM — o WebCrypto importa SPKI em ArrayBuffer, mas nossas helpers
      // aceitam PEM; garantir formato evita diferenças entre impls.
      try {
        if (!CryptoUtils.isValidPEM(publicKey, "PUBLIC")) {
          publicKey = CryptoUtils.spkiToPEM(publicKey);
          console.debug(
            "Converted recipient public key to PEM format for local encryption"
          );
        }
      } catch (e) {
        console.warn(
          "Falha ao normalizar public key para PEM, prosseguindo com valor original",
          e
        );
      }

      // 2) Preferir encriptar no cliente usando CryptoUtils.pgpEncrypt
      let encryptedData;
      try {
        if (window?.crypto?.subtle) {
          const localEncrypted = await CryptoUtils.pgpEncrypt(
            content,
            publicKey
          );
          encryptedData = localEncrypted;
        }
      } catch (clientErr) {
        console.warn(
          "Falha encriptar no cliente, fallback para backend:",
          clientErr
        );
      }

      if (!encryptedData) {
        const enc = await cryptoService.encryptPGP(content, publicKey);
        encryptedData = enc.encryptedData || enc.data || enc;
      }

      // 3) Exportar chaves do remetente (precisa do privateKey para assinar)
      // 3) Assinar: preferir usar privateKey local (localStorage)
      let signature = null;
      try {
        const localPrivate = localStorage.getItem("local_private_key_pem");
        if (localPrivate) {
          signature = await CryptoUtils.signWithPrivatePEM(
            localPrivate,
            content
          );
        } else {
          const exported = await userService.exportUserKeys(senderId);
          const privateKey =
            exported?.exportedKeys?.privateKey ||
            exported?.privateKey ||
            exported?.private_key ||
            null;
          if (privateKey) {
            const sigResp = await cryptoService.signData(content, privateKey);
            signature = sigResp.signature || sigResp;
          } else {
            console.warn("Private key não disponível, envio sem assinatura");
          }
        }
      } catch (signErr) {
        console.warn("Erro ao assinar (cliente/servidor):", signErr);
      }

      // 5) Enviar mensagem para /messages/send/encrypted
      const messagePayload = {
        senderId,
        receiverId,
        content: encryptedData,
        encrypted: true,
        signed: !!signature,
        signature: signature,
        messageType,
      };

      const sent = await this.sendEncryptedMessage(messagePayload);
      return sent;
    } catch (error) {
      console.error("Erro no sendSecureMessage:", error);
      throw error;
    }
  },
};
