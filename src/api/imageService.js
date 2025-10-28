import api from "./index";

export const imageService = {
  async uploadImage(senderId, file, receiverId) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("senderId", senderId);
    formData.append("receiverId", receiverId);
    // incluir a preferencia de assinatura do utilizador (se existir)
    try {
      const saved = localStorage.getItem("userSettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        formData.append("signed", parsed.signMessages ? "true" : "false");
      }
    } catch (e) {
      console.debug(
        "Não foi possível anexar signed ao formData:",
        e?.message || e
      );
    }

    // Calcular SHA-256 no browser e enviar como fileHash (Base64)
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await (window.crypto || window.msCrypto).subtle.digest(
        "SHA-256",
        arrayBuffer
      );

      // Converter ArrayBuffer para Base64
      const bytes = new Uint8Array(hashBuffer);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(
          null,
          bytes.subarray(i, i + chunkSize)
        );
      }
      const base64Hash = btoa(binary);
      formData.append("fileHash", base64Hash);
    } catch (err) {
      console.warn("Não foi possível calcular hash no cliente:", err);
    }

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
