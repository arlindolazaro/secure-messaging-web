// src/api/keyManagementService.js
import api from "./index";

export const keyManagementService = {
  async generateKeys(userId, keySize = 1024) {
    const response = await api.post(
      `/key-management/users/${userId}/generate-keys?keySize=${keySize}`
    );
    return response.data;
  },

  async getKeysInfo(userId) {
    const response = await api.get(`/key-management/users/${userId}/keys-info`);
    return response.data.keys || {};
  },

  async importPublicKey(userId, pemKey) {
    const response = await api.post(
      `/key-management/users/${userId}/import-public-key`,
      { pemKey }
    );
    return response.data;
  },

  async exportPublicKey(userId) {
    const response = await api.get(
      `/key-management/users/${userId}/export-public-key`
    );
    return response.data.exportData || {};
  },

  async setupDiffieHellman(userId) {
    const response = await api.post(
      `/key-management/users/${userId}/setup-diffie-hellman`
    );
    return response.data;
  },

  async setupDiffieHellmanWithParams(userId, params = {}) {
    // params: { pHex, gHex }
    const response = await api.post(
      `/key-management/users/${userId}/setup-diffie-hellman`,
      params
    );
    return response.data;
  },

  async regenerateRSA(userId, keySize = 2048) {
    // Reuse generateKeys endpoint but expose named method
    const response = await api.post(
      `/key-management/users/${userId}/generate-keys?keySize=${keySize}`
    );
    return response.data;
  },

  async healthCheck() {
    const response = await api.get("/key-management/health");
    return response.data;
  },
};
