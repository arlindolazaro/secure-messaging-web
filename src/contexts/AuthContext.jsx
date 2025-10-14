import React, { createContext, useState, useEffect, useContext } from "react";
import { authService } from "../api/authService";

// Criar o contexto
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

// Hook personalizado para usar o contexto
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
};

// Provider do contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      console.log("🔍 Verificando autenticação...", { token: !!token });

      if (token) {
        console.log("🔄 Verificando token no servidor...");
        
        // Verificar se o token é válido
        const isValid = await authService.verifyToken(token);
        console.log("✅ Token válido?", isValid);

        if (isValid) {
          // Buscar informações do usuário atual
          try {
            const userData = await authService.getCurrentUser();
            console.log("✅ Dados do usuário:", userData);
            setUser(userData);
          } catch (userError) {
            console.error("❌ Erro ao buscar dados do usuário:", userError);
            // Se não conseguir buscar dados do usuário, manter apenas o token
            setUser({ token });
          }
        } else {
          console.log("❌ Token inválido, limpando...");
          localStorage.removeItem("jwt_token");
          setUser(null);
        }
      } else {
        console.log("❌ Nenhum token encontrado");
        setUser(null);
      }
    } catch (error) {
      console.error("🚨 Erro na verificação do token:", error);
      localStorage.removeItem("jwt_token");
      setUser(null);
    } finally {
      setLoading(false);
      console.log("🏁 Verificação de auth concluída");
    }
  };

  const login = async (credentials) => {
    try {
      console.log("🔐 Tentando login...", credentials);
      const response = await authService.login(credentials);
      console.log("✅ Resposta completa do login:", response);

      const { token, username, email, userId } = response;

      if (!token || !username) {
        console.error("🚨 ERRO: Token ou username não recebidos!");
        return {
          success: false,
          error: "Dados de autenticação incompletos",
        };
      }

      const userData = {
        id: userId,
        username: username,
        email: email,
        token: token,
      };

      console.log("✅ Dados do usuário construídos:", userData);

      localStorage.setItem("jwt_token", token);
      setUser(userData);
      console.log("✅ Login bem-sucedido, usuário definido:", userData);

      return { success: true };
    } catch (error) {
      console.error("🚨 Erro no login:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Erro no login",
      };
    }
  };

  const register = async (userData) => {
    try {
      console.log("📝 Tentando registro...", userData);
      const response = await authService.register(userData);
      console.log("✅ Resposta completa do registro:", response);

      const { token, username, email, userId } = response;

      if (!token || !username) {
        console.error("🚨 ERRO: Token ou username não recebidos!");
        return {
          success: false,
          error: "Dados de registro incompletos",
        };
      }

      const newUserData = {
        id: userId,
        username: username,
        email: email,
        token: token,
      };

      console.log("✅ Dados do usuário construídos:", newUserData);

      localStorage.setItem("jwt_token", token);
      setUser(newUserData);
      console.log("✅ Registro bem-sucedido, usuário definido:", newUserData);

      return { success: true };
    } catch (error) {
      console.error("🚨 Erro no registro:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Erro no registro",
      };
    }
  };

  const logout = async () => {
    try {
      console.log("🚪 Fazendo logout...");
      await authService.logout();
    } catch (error) {
      console.error("🚨 Erro no logout:", error);
    } finally {
      localStorage.removeItem("jwt_token");
      setUser(null);
      console.log("✅ Logout concluído");
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  console.log("🔄 AuthContext atualizado:", { user: !!user, loading });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};