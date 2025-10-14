import api from "./index";

export const imageService = {
  async uploadEncryptedImage(senderId, file, receiverId) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("senderId", senderId);
    formData.append("receiverId", receiverId);

    try {
      const response = await api.post("/images/send", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ Imagem enviada com sucesso:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Erro ao enviar imagem:", error);
      throw error;
    }
  },

  async getImagePreview(messageId, userId) {
    try {
      const response = await api.get(
        `/images/${messageId}/preview?userId=${userId}`
      );

      console.log("✅ Preview da imagem obtido:", messageId);
      return response.data;
    } catch (error) {
      console.error("❌ Erro ao obter preview:", error);
      throw error;
    }
  },

  // ✅ NOVO MÉTODO: Download de imagem
  async downloadImage(messageId, userId) {
    try {
      const response = await api.get(
        `/images/${messageId}/download?userId=${userId}`,
        { responseType: "blob" }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Erro ao baixar imagem:", error);
      throw error;
    }
  },
};
