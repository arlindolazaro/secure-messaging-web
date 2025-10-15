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
};
