// src/cryptoService.js
import api from "./index";

export const cryptoService = {
  async generateRSAKeyPair(keySize = 1024) {
    try {
      const response = await api.post("/crypto/generate/rsa", { keySize });

      if (response.data.publicKey && response.data.privateKey) {
        return response.data;
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("Erro no generateRSAKeyPair:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao gerar par de chaves"
      );
    }
  },

  async initializeDiffieHellman() {
    try {
      const response = await api.post("/crypto/dh/initialize");
      return response.data;
    } catch (error) {
      console.error("Erro no initializeDiffieHellman:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao inicializar Diffie-Hellman"
      );
    }
  },

  async calculateSharedSecret(sessionId, otherPartyPublicKey) {
    try {
      const response = await api.post("/crypto/dh/calculate-secret", {
        sessionId,
        otherPartyPublicKey,
      });
      return response.data;
    } catch (error) {
      console.error("Erro no calculateSharedSecret:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao calcular segredo compartilhado"
      );
    }
  },

  async simulateDHAgreement() {
    try {
      const response = await api.post("/crypto/dh/simulate");
      return response.data;
    } catch (error) {
      console.error("Erro no simulateDHAgreement:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro na simulação DH"
      );
    }
  },

  async hashData(data, algorithm = "SHA-256") {
    try {
      const response = await api.post("/crypto/hash", { data, algorithm });

      if (response.data.hash) {
        return response.data;
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("Erro no hashData:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao gerar hash"
      );
    }
  },

  async encryptPGP(data, publicKey) {
    try {
      const response = await api.post("/crypto/encrypt/pgp", {
        data,
        publicKey,
      });

      if (response.data.encryptedData) {
        return response.data;
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("Erro no encryptPGP:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao criptografar"
      );
    }
  },

  async decryptPGP(encryptedData, privateKey) {
    try {
      const response = await api.post("/crypto/decrypt/pgp", {
        encryptedData,
        privateKey,
      });

      if (response.data.decryptedData) {
        return response.data;
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("Erro no decryptPGP:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao descriptografar"
      );
    }
  },

  async signData(data, privateKey) {
    try {
      const response = await api.post("/crypto/sign", { data, privateKey });

      if (response.data.signature) {
        return response.data;
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("Erro no signData:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao assinar dados"
      );
    }
  },

  async verifySignature(data, signature, publicKey) {
    try {
      const response = await api.post("/crypto/verify", {
        data,
        signature,
        publicKey,
      });

      if (typeof response.data.valid === "boolean") {
        return response.data;
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("Erro no verifySignature:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao verificar assinatura"
      );
    }
  },

  async healthCheck() {
    try {
      const response = await api.get("/crypto/health");
      return response.data;
    } catch (error) {
      console.error("Erro no healthCheck:", error);
      throw new Error("Serviço criptográfico indisponível");
    }
  },
};
