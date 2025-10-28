// src/api/certificateService.js
import api from "./index";

export const certificateService = {
  // Criar certificado autoassinado
  async createCertificate(certificateRequest) {
    try {
      // ✅ URL CORRETA: /certificates (sem /api/ duplicado)
      const response = await api.post(`/certificates`, certificateRequest);

      // ✅ VALIDAÇÃO DA RESPOSTA
      if (response.data.success && response.data.certificate) {
        return response.data.certificate;
      } else if (response.data.certificate) {
        return response.data.certificate; // Fallback
      } else {
        throw new Error(
          response.data.error || "Erro desconhecido ao criar certificado"
        );
      }
    } catch (error) {
      console.error("Erro no createCertificate:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao criar certificado"
      );
    }
  },

  // Gerar Root CA autoassinada
  async generateRootCA(certificateRequest) {
    try {
      // ✅ URL CORRETA: /certificates/root (sem /api/ duplicado)
      const response = await api.post(`/certificates/root`, certificateRequest);

      if (response.data.success && response.data.rootCA) {
        return response.data.rootCA;
      } else {
        throw new Error(response.data.error || "Erro ao gerar Root CA");
      }
    } catch (error) {
      console.error("Erro no generateRootCA:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao gerar Root CA"
      );
    }
  },

  // Verificar certificado
  async verifyCertificate(certificateId) {
    try {
      // ✅ URL CORRETA: /certificates/{id}/verify (sem /api/ duplicado)
      const response = await api.get(`/certificates/${certificateId}/verify`);

      if (response.data.success && response.data.verification) {
        return response.data.verification;
      } else {
        throw new Error(response.data.error || "Erro ao verificar certificado");
      }
    } catch (error) {
      console.error("Erro no verifyCertificate:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao verificar certificado"
      );
    }
  },

  // ✅ MÉTODO PRINCIPAL CORRIGIDO - Buscar certificados do usuário
  async getCertificatesByUser() {
    try {
      console.log("🔄 Buscando certificados do usuário...");

      // ✅ URL CORRETA: /certificates/my-certificates (sem /api/ duplicado)
      const response = await api.get(`/certificates/my-certificates`);

      console.log("✅ Resposta da API:", response.data);

      if (response.data.success && Array.isArray(response.data.certificates)) {
        console.log(
          `✅ ${response.data.certificates.length} certificados carregados`
        );
        // Normalizar objetos para compatibilidade com variações de backend
        const normalized = response.data.certificates.map((c) =>
          normalizeCertificate(c)
        );
        return normalized;
      } else {
        console.warn("⚠️ Resposta inesperada:", response.data);
        return [];
      }
    } catch (error) {
      console.error("❌ Erro no getCertificatesByUser:", error);

      // ✅ TRATAMENTO DETALHADO DE ERROS
      if (error.response?.status === 500) {
        console.error("❌ Erro 500 - Problema no servidor");
        console.error("Detalhes:", error.response.data);
        return []; // Retorna array vazio para permitir que a página carregue
      } else if (error.code === "ERR_NETWORK") {
        console.error("❌ Erro de rede - Servidor indisponível");
        return [];
      } else if (error.response?.status === 401) {
        console.error("❌ Erro 401 - Não autorizado");
        // Redirecionar para login se necessário
        window.location.href = "/login";
        return [];
      }

      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao carregar certificados"
      );
    }
  },

  // Buscar certificados Root CA
  async getRootCertificates() {
    try {
      // ✅ URL CORRETA: /certificates/roots (sem /api/ duplicado)
      const response = await api.get("/certificates/roots");

      if (
        response.data.success &&
        Array.isArray(response.data.rootCertificates)
      ) {
        return response.data.rootCertificates;
      } else {
        console.warn("Resposta inesperada:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Erro no getRootCertificates:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao carregar Root CAs"
      );
    }
  },

  // Buscar Root CA do usuário
  async getMyRootCA() {
    try {
      // ✅ URL CORRETA: /certificates/my-root-ca (sem /api/ duplicado)
      const response = await api.get("/certificates/my-root-ca");

      if (response.data.success && response.data.rootCA) {
        return response.data.rootCA;
      } else {
        return null; // Não tem Root CA
      }
    } catch (error) {
      console.error("Erro no getMyRootCA:", error);
      return null;
    }
  },

  // Buscar certificado por ID
  async getCertificateById(certificateId) {
    try {
      // ✅ URL CORRETA: /certificates/{id} (sem /api/ duplicado)
      const response = await api.get(`/certificates/${certificateId}`);

      if (response.data.success && response.data.certificate) {
        return response.data.certificate;
      } else {
        throw new Error(response.data.error || "Certificado não encontrado");
      }
    } catch (error) {
      console.error("Erro no getCertificateById:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao buscar certificado"
      );
    }
  },

  // Revogar certificado
  async revokeCertificate(certificateId, reason = "Revogado pelo usuário") {
    try {
      // ✅ URL CORRETA: /certificates/{id}/revoke (sem /api/ duplicado)
      const response = await api.put(`/certificates/${certificateId}/revoke`, {
        reason,
      });

      if (response.data.success && response.data.certificate) {
        return response.data.certificate;
      } else {
        throw new Error(response.data.error || "Erro ao revogar certificado");
      }
    } catch (error) {
      console.error("Erro no revokeCertificate:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao revogar certificado"
      );
    }
  },

  // Apagar certificado
  async deleteCertificate(certificateId) {
    try {
      const response = await api.delete(`/certificates/${certificateId}`);
      if (response.data.success) {
        return true;
      } else {
        throw new Error(response.data.error || "Erro ao apagar certificado");
      }
    } catch (error) {
      console.error("Erro no deleteCertificate:", error);
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Erro ao apagar certificado"
      );
    }
  },

  // Exportar PDF
  async exportCertificatePDF(certificateId) {
    try {
      // ✅ URL CORRETA: /pdf/certificates/{id}/export (sem /api/ duplicado)
      const response = await api.get(
        `/pdf/certificates/${certificateId}/export`,
        {
          responseType: "blob",
        }
      );
      return response.data;
    } catch (error) {
      console.error("Erro no exportCertificatePDF:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Erro ao exportar PDF"
      );
    }
  },

  // Health check
  async healthCheck() {
    try {
      // ✅ URL CORRETA: /certificates/health (sem /api/ duplicado)
      const response = await api.get("/certificates/health");
      return response.data;
    } catch (error) {
      console.error("Erro no healthCheck:", error);
      throw new Error("Serviço de certificados indisponível");
    }
  },
};

function normalizeCertificate(c) {
  // cria aliases para diferentes formatos de API
  const subjectName =
    c.subjectName || c.commonName || c.subject || c.subject_name || c.name;
  const issuerName = c.issuerName || c.issuer || c.issuer_name || c.issuerName;
  const validTo =
    c.validTo ||
    c.notAfter ||
    c.valid_to ||
    c.expiresAt ||
    c.validUntil ||
    c.valid_until;

  return {
    ...c,
    subjectName,
    issuerName,
    validTo,
  };
}
