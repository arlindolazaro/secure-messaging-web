// src/components/forms/MessageForm.jsx
import React, { useState } from "react";
import { messageService } from "../../api/messageService";

export const MessageForm = ({
  currentUser,
  selectedUser,
  onMessageSent,
  onStartDH,
}) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [encrypt, setEncrypt] = useState(true);
  const [sign, setSign] = useState(true);
  const [useDH, setUseDH] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || !currentUser?.id || !selectedUser?.id) return;

    try {
      setSending(true);

      // Se usar Diffie-Hellman, inicia fluxo DH e envia pela rota DH
      let response;
      if (useDH) {
        // Permitir que o componente pai inicie DH e armazene a chave AES localmente
        let init = null;
        if (onStartDH) {
          init = await onStartDH();
        } else {
          init = await messageService.startDHSession();
        }

        const sessionId = init?.sessionId || init?.data?.sessionId;

        // Enviar mensagem usando sessão DH (se sessionId disponível)
        response = await messageService.sendMessageWithDH(
          currentUser.id,
          selectedUser.id,
          message,
          sessionId
        );
      } else {
        // Enviar a mensagem: o backend decidirá automaticamente se aplica PGP (RSA+AES)
        // Utilizamos o endpoint `sendMessage` do messageService.
        response = await messageService.sendMessage({
          senderId: currentUser.id,
          receiverId: selectedUser.id,
          content: message,
          messageType: "TEXT",
          signed: sign || false,
        });
      }

      // Chamar callback de sucesso (suporte a diferentes shapes de resposta)
      if (onMessageSent) {
        const sent = response?.message || response?.data || response;
        onMessageSent(sent);
      }

      // Limpar formulário
      setMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      alert("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center space-x-4 mb-3">
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={encrypt}
            onChange={(e) => setEncrypt(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Criptografar (RSA)</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={sign}
            onChange={(e) => setSign(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Assinar digitalmente</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={useDH}
            onChange={(e) => setUseDH(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Usar Diffie-Hellman</span>
        </label>
      </div>

      <form onSubmit={handleSubmit} className="flex space-x-3">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            rows="1"
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
            disabled={sending}
          />

          {/* Contador de caracteres */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {message.length}/1000
          </div>
        </div>

        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <span>Enviar</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
        <span className="flex items-center space-x-1">
          <span>🔒</span>
          <span>{encrypt ? "RSA-1024 + AES" : "Texto simples"}</span>
        </span>
        <span className="flex items-center space-x-1">
          <span>📝</span>
          <span>{sign ? "Assinado com SHA-256" : "Sem assinatura"}</span>
        </span>
      </div>
    </div>
  );
};
