import api from "./index";

export const pdfService = {
  async generateCertificatePDF(certificateId) {
    const response = await api.get(`/pdf/certificate/${certificateId}`, {
      responseType: "blob",
    });
    return response.data;
  },

  async generateUserReport(userId) {
    const response = await api.get(`/pdf/user-report/${userId}`, {
      responseType: "blob",
    });
    return response.data;
  },

  async generateSecurityReport() {
    const response = await api.get("/pdf/security-report", {
      responseType: "blob",
    });
    return response.data;
  },
};
