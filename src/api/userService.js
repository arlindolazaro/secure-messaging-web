import api from "./index";

export const userService = {
  async getAllUsers() {
    const response = await api.get("/users");
    return response.data.users || [];
  },

  async getUserById(userId) {
    const response = await api.get(`/users/${userId}`);
    return response.data.user || null;
  },

  async getUserPublicKey(userId) {
    try {
      const response = await api.get(`/users/${userId}/public-key`);
      return response.data.publicKey || null;
    } catch (error) {
      console.error("Erro ao buscar chave pública:", error);
      return null;
    }
  },

  async getUserDHPublicKey(userId) {
    try {
      const response = await api.get(`/users/${userId}/dh-public-key`);
      return response.data.dhPublicKey || null;
    } catch (error) {
      console.error("Erro ao buscar chave DH:", error);
      return null;
    }
  },

  async setupDiffieHellman(userId) {
    const response = await api.post(`/users/${userId}/setup-dh`);
    return response.data;
  },

  async performKeyExchange(userId1, userId2) {
    const response = await api.post(
      `/users/${userId1}/key-exchange/${userId2}`
    );
    return response.data.keyExchange || response.data;
  },

  async getUserStatistics(userId) {
    try {
      const response = await api.get(`/users/${userId}/statistics`);
      return response.data.statistics || this.getFallbackStatistics();
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return this.getFallbackStatistics();
    }
  },

  getFallbackStatistics() {
    return {
      hasPublicKey: false,
      hasDhKeys: false,
      certificateCount: 0,
      keyPairCount: 0,
      sentMessageCount: 0,
      receivedMessageCount: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      enabled: true,
    };
  },

  async exportUserKeys(userId) {
    try {
      // Nota: o backend exige uma password no corpo da chamada.
      const response = await api.post(`/users/${userId}/export-keys`, {
        password: "frontend-temp-pass",
      });
      return response.data.exportedKeys || response.data;
    } catch (error) {
      console.error("Erro na exportação completa:", error);
      throw error;
    }
  },

  async updatePassword(userId, newPassword) {
    const response = await api.put(`/users/${userId}/password`, {
      newPassword,
    });
    return response.data;
  },

  async exportKeysModern(userId, format) {
    try {
      const response = await api.post(`/users/${userId}/export-keys-modern`, {
        format,
      });
      return response.data;
    } catch (error) {
      console.error("Erro na exportação moderna:", error);
      throw error;
    }
  },

  formatAsPEM(data) {
    return {
      content: data.publicKey,
      filename: `chave-publica-${data.username}.pem`,
      type: "application/x-pem-file",
    };
  },

  formatAsJSON(data) {
    return {
      content: JSON.stringify(
        {
          publicKey: data.publicKey,
          username: data.username,
          algorithm: data.algorithm,
          keySize: data.keySize,
          exportedAt: data.exportedAt,
          format: "PEM",
        },
        null,
        2
      ),
      filename: `chave-publica-${data.username}.json`,
      type: "application/json",
    };
  },

  formatAsTXT(data) {
    const textContent = `CHAVE PÚBLICA - ${data.username}
==============================
Algoritmo: ${data.algorithm}
Tamanho: ${data.keySize} bits
Exportado em: ${new Date(data.exportedAt).toLocaleString("pt-PT")}

${data.publicKey}
==============================`;

    return {
      content: textContent,
      filename: `chave-publica-${data.username}.txt`,
      type: "text/plain",
    };
  },
};
