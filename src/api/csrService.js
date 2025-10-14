// src/api/csrService.js
import api from "./index";

export const csrService = {
  // Criar CSR
  async createCSR(csrRequest) {
    try {
      const response = await api.post(`/csrs`, csrRequest);

      // ✅ VALIDAÇÃO DA RESPOSTA
      if (response.data.success && response.data.csr) {
        return response.data.csr;
      } else if (response.data.csr) {
        return response.data.csr; // Fallback
      } else {
        throw new Error(
          response.data.error || "Erro desconhecido ao criar CSR"
        );
      }
    } catch (error) {
      console.error("Erro no createCSR:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao criar CSR"
      );
    }
  },

  // Assinar CSR
  async signCSR(csrId, caCertificateId, validDays = 365) {
    try {
      const response = await api.post(
        `/csrs/${csrId}/sign/${caCertificateId}`,
        {
          validDays,
        }
      );

      if (response.data.success && response.data.csr) {
        return response.data.csr;
      } else {
        throw new Error(response.data.error || "Erro ao assinar CSR");
      }
    } catch (error) {
      console.error("Erro no signCSR:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao assinar CSR"
      );
    }
  },

  // Aprovar CSR
  async approveCSR(csrId) {
    try {
      const response = await api.put(`/csrs/${csrId}/approve`);

      if (response.data.success && response.data.csr) {
        return response.data.csr;
      } else {
        throw new Error(response.data.error || "Erro ao aprovar CSR");
      }
    } catch (error) {
      console.error("Erro no approveCSR:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao aprovar CSR"
      );
    }
  },

  // Rejeitar CSR
  async rejectCSR(csrId, reason) {
    try {
      const response = await api.put(`/csrs/${csrId}/reject`, { reason });

      if (response.data.success && response.data.csr) {
        return response.data.csr;
      } else {
        throw new Error(response.data.error || "Erro ao rejeitar CSR");
      }
    } catch (error) {
      console.error("Erro no rejectCSR:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao rejeitar CSR"
      );
    }
  },

  // Buscar CSRs do usuário
  async getMyCSRs() {
    try {
      const response = await api.get(`/csrs/my-csrs`);

      if (response.data.success && Array.isArray(response.data.csrs)) {
        return response.data.csrs;
      } else {
        console.warn("Resposta inesperada:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Erro no getMyCSRs:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao carregar CSRs"
      );
    }
  },

  // Buscar CSRs pendentes
  async getPendingCSRs() {
    try {
      const response = await api.get("/csrs/pending");

      if (response.data.success && Array.isArray(response.data.pendingCSRs)) {
        return response.data.pendingCSRs;
      } else {
        console.warn("Resposta inesperada:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Erro no getPendingCSRs:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao carregar CSRs pendentes"
      );
    }
  },

  // Buscar CSR por ID
  async getCSRById(csrId) {
    try {
      const response = await api.get(`/csrs/${csrId}`);

      if (response.data.success && response.data.csr) {
        return response.data.csr;
      } else {
        throw new Error(response.data.error || "CSR não encontrado");
      }
    } catch (error) {
      console.error("Erro no getCSRById:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao buscar CSR"
      );
    }
  },

  // ✅ NOVO: Health check
  async healthCheck() {
    try {
      const response = await api.get("/csrs/health");
      return response.data;
    } catch (error) {
      console.error("Erro no healthCheck:", error);
      throw new Error("Serviço CSR indisponível");
    }
  },
};
