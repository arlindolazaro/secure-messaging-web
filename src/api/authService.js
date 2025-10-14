  import api from "./index";

  export const authService = {
    async login(credentials) {
      const response = await api.post("/auth/login", credentials);
      return response.data;
    },

    async register(userData) {
      const response = await api.post("/auth/register", userData);
      return response.data;
    },

    async logout() {
      const token = localStorage.getItem("jwt_token");
      if (token) {
        await api.post(
          "/auth/logout",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    },

    async verifyToken(token) {
      try {
        const response = await api.post("/auth/verify", { token });
        return response.data.valid;
      } catch (error) {
        console.error("Erro na verificação do token:", error);
        return false;
      }
    },

    async refreshToken() {
      const response = await api.post("/auth/refresh");
      return response.data;
    },

    async getCurrentUser() {
      try {
        const response = await api.get("/users/me");
        return response.data;
      } catch (error) {
        console.error("Erro ao buscar usuário atual:", error);
        throw error;
      }
    },

    async checkAvailability(username, email) {
      const response = await api.get("/auth/check-availability", {
        params: { username, email },
      });
      return response.data;
    },
  };
