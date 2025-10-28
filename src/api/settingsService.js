import api from "./index";

export const settingsService = {
  async getSettings(userId) {
    const response = await api.get(`/users/${userId}/settings`);
    return response.data.settings || null;
  },

  async updateSettings(userId, settingsObj) {
    // send as raw JSON string to match backend controller which expects a raw body
    const response = await api.put(`/users/${userId}/settings`, {
      settingsJson: JSON.stringify(settingsObj),
    });
    return response.data;
  },
};
