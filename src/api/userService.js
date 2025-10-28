import api from "./index";

export const userService = {
  // ✅ SIMPLES: Buscar todos usuários
  async getAllUsers() {
    try {
      const response = await api.get("/users");
      return response.data.users || [];
    } catch (error) {
      console.error("Erro ao buscar utilizadores:", error);
      return [];
    }
  },

  // ✅ SIMPLES: Buscar usuário por ID
  async getUserById(userId) {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data.user || null;
    } catch (error) {
      console.error("Erro ao buscar utilizador:", error);
      return null;
    }
  },

  // ✅ SIMPLES: Buscar chave pública
  async getUserPublicKey(userId) {
    try {
      const response = await api.get(`/users/${userId}/public-key`);
      return response.data.publicKey || null;
    } catch (error) {
      console.error("Erro ao buscar chave pública:", error);
      return null;
    }
  },

  // ✅ SIMPLES: Buscar estatísticas
  async getUserStatistics(userId) {
    try {
      const response = await api.get(`/users/${userId}/statistics`);
      return response.data.statistics || {};
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return {};
    }
  },

  // Exportar todas as chaves (chamada ao endpoint backend que exige password)
  async exportUserKeys(userId, password) {
    try {
      const response = await api.post(`/users/${userId}/export-keys`, {
        password,
      });
      return response.data.exportedKeys || response.data;
    } catch (error) {
      console.error("Erro ao exportar chaves do utilizador:", error);
      throw error;
    }
  },

  // Helpers para formatar chave pública para diversos formatos (usadas pelo ProfilePage)
  formatAsPEM({
    publicKey,
    username = "user",
    algorithm = "RSA",
    keySize = 1024,
    exportedAt = new Date().toISOString(),
  }) {
    // Aceita tanto PEM completo quanto Base64 cru
    let body = publicKey || "";
    if (!body.includes("BEGIN")) {
      // assume base64 cru, formatar em linhas de 64
      const sb = [];
      for (let i = 0; i < body.length; i += 64)
        sb.push(body.substring(i, Math.min(i + 64, body.length)));
      body = sb.join("\n");
      body = `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
    }

    const filename = `${username}-public-${algorithm.toLowerCase()}-${keySize}.pem`;
    return {
      content: body,
      type: "application/x-pem-file",
      filename,
      meta: { username, algorithm, keySize, exportedAt },
    };
  },

  formatAsJSON({
    publicKey,
    username = "user",
    algorithm = "RSA",
    keySize = 1024,
    exportedAt = new Date().toISOString(),
  }) {
    const obj = {
      username,
      algorithm,
      keySize,
      exportedAt,
      publicKey,
    };
    return {
      content: JSON.stringify(obj, null, 2),
      type: "application/json",
      filename: `${username}-public-${algorithm.toLowerCase()}-${keySize}.json`,
      meta: obj,
    };
  },

  formatAsTXT({
    publicKey,
    username = "user",
    algorithm = "RSA",
    keySize = 1024,
    exportedAt = new Date().toISOString(),
  }) {
    const content = `Username: ${username}\nAlgorithm: ${algorithm}\nKeySize: ${keySize}\nExportedAt: ${exportedAt}\n\nPublicKey:\n${publicKey}`;
    return {
      content,
      type: "text/plain",
      filename: `${username}-public-${algorithm.toLowerCase()}-${keySize}.txt`,
      meta: { username, algorithm, keySize, exportedAt },
    };
  },

  // ✅ Obter chave pública DH do utilizador
  async getUserDHPublicKey(userId) {
    try {
      const response = await api.get(`/users/${userId}/dh-public-key`);
      return response.data.dhPublicKey || null;
    } catch (error) {
      console.error("Erro ao buscar chave DH:", error);
      return null;
    }
  },

  // ✅ Configurar Diffie-Hellman para um utilizador
  async setupDiffieHellman(userId) {
    try {
      const response = await api.post(`/users/${userId}/setup-dh`);
      return response.data || null;
    } catch (error) {
      console.error("Erro ao configurar DH:", error);
      throw error;
    }
  },

  // ✅ Executar acordo de chaves entre dois utilizadores
  async performKeyExchange(userId1, userId2) {
    try {
      const response = await api.post(
        `/users/${userId1}/key-exchange/${userId2}`
      );
      // backend retorna objeto em keyExchange
      return response.data.keyExchange || response.data;
    } catch (error) {
      console.error("Erro ao executar acordo DH:", error);
      throw error;
    }
  },

  // ✅ Remover conta do utilizador (frontend irá confirmar antes)
  async deleteAccount(userId) {
    try {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Erro ao eliminar conta:", error);
      throw error;
    }
  },
};
