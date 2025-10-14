import { RegisterForm } from "../components/forms/RegisterForm";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";

export const RegisterPage = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-gray-950 via-blue-950 to-gray-900 text-white">
      {/* ===== HEADER COMPACTO ===== */}
      <header className="w-full flex justify-between items-center px-6 py-2 bg-black/40 backdrop-blur-md border-b border-white/10 shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Secure Messaging</h1>
        <Button
          onClick={logout}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
        >
          Terminar Sessão
        </Button>
      </header>

      {/* ===== CONTEÚDO CENTRAL ===== */}
      <main className="flex-grow flex flex-col items-center justify-center w-full px-4">
        <div className="bg-white/10 p-6 rounded-2xl shadow-lg w-full max-w-sm border border-white/10 backdrop-blur-md">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            Criar Conta
          </h2>
          <RegisterForm />
        </div>
      </main>

      {/* ===== FOOTER DISCRETO ===== */}
      <footer className="py-2 text-xs text-gray-400">
        © {new Date().getFullYear()} Secure Messaging — Protegendo suas
        conversas
      </footer>
    </div>
  );
};
