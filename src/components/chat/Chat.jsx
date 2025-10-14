/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Shield,
  Users,
  Search,
  MessageCircle,
  CheckCheck,
  Paperclip,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/Button";
import { messageService } from "../../api/messageService";
import { imageService } from "../../api/imageService";

/* =====================================================
   ✅ COMPONENTE MessageBubble
===================================================== */
const MessageBubble = ({ message, currentUser, onDecrypt, onVerify }) => {
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const isOwnMessage = message.senderId === currentUser.id;

  // ✅ SEPARAR: IMAGEM vs TEXTO
  const isImage = message.messageType === "IMAGE";
  const isEncryptedText = message.encrypted && !isImage;

  const handleDecrypt = async () => {
    if (!isEncryptedText || decrypting) return;

    setDecrypting(true);
    setDecryptError(null);
    setShowDecrypted(false);

    try {
      const result = await onDecrypt(message.id);
      if (result.success) {
        setDecryptedContent(result.decryptedContent);
      } else {
        setDecryptedContent(result.decryptedContent || "❌ Erro ao decriptar");
        setDecryptError(result.error);
      }
      setShowDecrypted(true);
    } catch (error) {
      console.error("💥 Erro crítico ao decriptar:", error);
      setDecryptError(error.message);
      setDecryptedContent("❌ Erro crítico ao decriptar");
      setShowDecrypted(true);
    } finally {
      setDecrypting(false);
    }
  };

  const handleVerify = async () => {
    if (!message.signed) return;
    try {
      await onVerify(message.id);
    } catch (error) {
      console.error("Erro na verificação:", error);
    }
  };

  // ✅ Carregar imagem encriptada automaticamente
  const loadImagePreview = async () => {
    if (!isImage || loadingImage) return;

    setLoadingImage(true);
    try {
      const preview = await imageService.getImagePreview(
        message.id,
        currentUser.id
      );
      setImagePreview(preview.base64);
    } catch (error) {
      console.error("Erro ao carregar imagem:", error);
    } finally {
      setLoadingImage(false);
    }
  };

  useEffect(() => {
    if (isImage) {
      loadImagePreview();
    }
  }, [isImage]);

  const displayContent = showDecrypted ? decryptedContent : message.content;

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-xs lg:max-w-md rounded-2xl p-4 ${
          isOwnMessage
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-gray-100 text-gray-800 rounded-bl-none"
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {isOwnMessage ? "Você" : message.senderUsername || "Remetente"}
          </span>
          <div className="flex items-center space-x-2">
            {message.encrypted && (
              <Shield className="h-4 w-4" title="Mensagem encriptada" />
            )}
            {message.signed && (
              <button
                onClick={handleVerify}
                className="hover:opacity-80 text-yellow-400"
                title="Verificar assinatura"
              >
                ✓
              </button>
            )}
            <CheckCheck className="h-3 w-3" />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="text-sm">
          {isImage ? (
            <div className="text-center">
              {loadingImage ? (
                <div className="py-4">🖼️ Carregando imagem...</div>
              ) : imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Imagem"
                  className="max-w-full rounded-lg"
                  onClick={() => window.open(imagePreview, "_blank")}
                />
              ) : (
                <div className="py-4">📷 Imagem</div>
              )}
            </div>
          ) : isEncryptedText && !showDecrypted ? (
            <div className="text-center py-2">
              <div className="mb-2">
                <Shield className="h-6 w-6 mx-auto mb-1" />
                <p className="text-xs">Mensagem Encriptada</p>
              </div>
              <button
                onClick={handleDecrypt}
                disabled={decrypting}
                className={`px-3 py-1 rounded text-xs ${
                  isOwnMessage
                    ? "bg-blue-400 hover:bg-blue-300"
                    : "bg-gray-300 hover:bg-gray-400 text-gray-800"
                } ${decrypting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {decrypting ? "A decriptar..." : "Decriptar"}
              </button>
            </div>
          ) : (
            <div>
              <p className="break-words whitespace-pre-wrap">
                {displayContent}
              </p>
              {decryptError && (
                <p className="text-xs text-red-500 mt-1">{decryptError}</p>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div
          className={`text-xs mt-2 ${
            isOwnMessage ? "text-blue-200" : "text-gray-500"
          }`}
        >
          {new Date(message.sentAt).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {decrypting && " · Decriptando..."}
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   ✅ COMPONENTE PRINCIPAL: Chat
===================================================== */
export const Chat = ({
  user,
  users,
  selectedUser,
  messages,
  showUserList,
  onSelectUser,
  onSendMessage,
  onDecryptMessage,
  onToggleUserList,
  isWebSocketConnected,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [file, setFile] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const safeMessages = Array.isArray(messages) ? messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [safeMessages]);

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !selectedUser) return;

    setIsSending(true);
    try {
      if (file) {
        const uploadResult = await imageService.uploadEncryptedImage(
          user.id,
          file,
          selectedUser.id
        );
        await onSendMessage("", uploadResult.data || uploadResult);
      } else {
        await onSendMessage(newMessage, null);
      }

      setNewMessage("");
      setFile(null);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      alert("Erro ao enviar mensagem: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDecryptMessageWrapper = async (messageId) => {
    try {
      const result = await onDecryptMessage(messageId);
      if (result.success) {
        return { success: true, decryptedContent: result.decryptedContent };
      } else {
        return {
          success: false,
          decryptedContent: result.decryptedContent || "❌ Erro ao decriptar",
          error: result.error,
        };
      }
    } catch (error) {
      console.error("💥 Erro crítico ao decriptar:", error);
      return {
        success: false,
        decryptedContent: "❌ Erro crítico ao decriptar",
        error: error.message,
      };
    }
  };

  const handleVerifySignature = async (messageId) => {
    try {
      const result = await messageService.verifySignature(messageId, user.id);
      const isValid = result.signatureValid || result.data?.signatureValid;
      alert(isValid ? "✅ Assinatura válida!" : "❌ Assinatura inválida!");
      return result;
    } catch (error) {
      console.error("Erro na verificação:", error);
      alert("❌ Erro ao verificar assinatura: " + error.message);
      return { success: false, signatureValid: false };
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Lista de Utilizadores */}
      <div
        className={`${
          showUserList ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } fixed lg:relative z-40 lg:z-auto w-80 lg:w-80 h-full flex flex-col bg-white border-r border-gray-200 transition-transform duration-300`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Conversas</h2>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isWebSocketConnected ? "bg-green-500" : "bg-yellow-500"
                }`}
                title={isWebSocketConnected ? "Conectado" : "Conectando..."}
              />
              <button
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                onClick={onToggleUserList}
              >
                ←
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Procurar utilizadores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
            <Shield className="h-4 w-4" />
            <span>Sistema seguro ativo</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map((userItem) => (
            <div
              key={userItem.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedUser?.id === userItem.id ? "bg-blue-50" : ""
              }`}
              onClick={() => onSelectUser(userItem)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {userItem.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {userItem.username}
                  </p>
                  <p className="text-sm text-gray-500">{userItem.email}</p>
                </div>
                {userItem.hasPublicKey && (
                  <Shield
                    className="h-4 w-4 text-green-500"
                    title="Chave pública disponível"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay para mobile */}
      {showUserList && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggleUserList}
        />
      )}

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="border-b border-gray-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={onToggleUserList}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Users className="h-5 w-5" />
                </button>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedUser.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedUser.username}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedUser.hasPublicKey
                      ? "🔒 Criptografia ativa"
                      : "🔓 Texto normal"}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 messages-container">
              {safeMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center text-gray-500">
                  <div>
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">Nenhuma mensagem ainda</p>
                    <p className="text-sm">
                      Envie a primeira mensagem para começar a conversa
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {safeMessages.map((message) => (
                    <MessageBubble
                      key={message.id || message.tempId}
                      message={message}
                      currentUser={user}
                      onDecrypt={handleDecryptMessageWrapper}
                      onVerify={handleVerifySignature}
                    />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-white p-4">
              {file && (
                <div className="mb-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Paperclip className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {Math.round(file.size / 1024)} KB
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                <Button
                  type="submit"
                  disabled={!newMessage.trim() && !file}
                  loading={isSending}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Bem-vindo ao Chat Seguro
              </h3>
              <p className="text-gray-600 mb-6">
                Selecione uma conversa para começar a enviar mensagens
                encriptadas
              </p>
              <Button onClick={onToggleUserList} className="lg:hidden">
                <Users className="h-4 w-4 mr-2" />
                Ver Conversas
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
