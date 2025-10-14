import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardFooter } from "../ui/Card";

export const RegisterForm = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const validateForm = () => {
    if (formData.password.length < 8) {
      setError("A password deve ter pelo menos 8 caracteres");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As passwords não coincidem");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    const result = await register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
    });

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Criar Conta
        </h2>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirmar Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" loading={loading} className="w-full">
            Criar Conta
          </Button>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Já tem conta?{" "}
              <button
                type="button"
                onClick={onToggleMode}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Fazer Login
              </button>
            </span>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};
