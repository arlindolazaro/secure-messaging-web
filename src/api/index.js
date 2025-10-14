  import axios from "axios";

  const API_BASE_URL = "http://localhost:8080/api";

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Interceptor para adicionar token às requisições
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("jwt_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Interceptor para tratar erros de autenticação
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        console.log("Token inválido ou expirado, redirecionando para login...");
        localStorage.removeItem("jwt_token");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  export default api;
