// src/components/forms/MessageForm.jsx
import React, { useState } from "react";
import { messageService } from "../../api/messageService";

export const MessageForm = ({ currentUser, selectedUser, onMessageSent }) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [encrypt, setEncrypt] = useState(true);
  const [sign, setSign] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || !currentUser?.id || !selectedUser?.id) return;

    try {
      setSending(true);

      // Se pedir encriptação e destinatário tiver chave pública, usar envio seguro (PGP-style)
      let response;
      if (
        encrypt &&
        selectedUser?.publicKey &&
        selectedUser.publicKey.length > 100
      ) {
        response = await messageService.sendSecureMessage({
          senderId: currentUser.id,
          receiverId: selectedUser.id,
          content: message,
          messageType: "TEXT",
        });
      } else {
        const messageData = {
          content: message,
          senderId: currentUser.id,
          receiverId: selectedUser.id,
          encrypted: false,
          signed: false,
          messageType: "TEXT",
        };

        response = await messageService.sendEncryptedMessage(messageData);
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
      {/* Opções de segurança */}
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
      </div>

      {/* Formulário de mensagem */}
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

      {/* Dicas de segurança */}
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
