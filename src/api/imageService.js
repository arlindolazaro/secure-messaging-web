import api from "./index";

export const imageService = {
  // ✅ SIMPLES: Upload de imagem - backend trata criptografia
  async uploadImage(senderId, file, receiverId) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("senderId", senderId);
    formData.append("receiverId", receiverId);

    const response = await api.post("/images/send", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  },

  // ✅ SIMPLES: Obter preview - backend decripta
  async getImagePreview(messageId, userId) {
    try {
      const response = await api.get(
        `/images/${messageId}/preview?userId=${userId}`
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao obter preview:", error);
      return {
        base64:
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7imYAgSW1hZ2VtPC90ZXh0Pjwvc3ZnPg==",
        error: "Preview não disponível",
      };
    }
  },
};
