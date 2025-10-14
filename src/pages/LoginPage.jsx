import React, { useState } from "react";
import { LoginForm } from "../components/forms/LoginForm";
import { RegisterForm } from "../components/forms/RegisterForm";

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-8">
        {isLogin ? (
          <LoginForm onToggleMode={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onToggleMode={() => setIsLogin(true)} />
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            🔒 Suas mensagens são protegidas com RSA 1024-bit e Diffie-Hellman
          </p>
        </div>
      </div>
    </div>
  );
};
