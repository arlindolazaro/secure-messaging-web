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

// MessageBubble
const MessageBubble = ({ message, currentUser, onDecrypt, onVerify }) => {
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const isOwnMessage = message.senderId === currentUser?.id;
  const isImage = message.messageType === "IMAGE";
  const isEncryptedText = message.encrypted && !isImage;

  const handleDecrypt = async () => {
    if (!isEncryptedText || decrypting || !currentUser?.id) return;

    setDecrypting(true);
    try {
      const result = await onDecrypt(message.id);
      if (result.success) {
        setDecryptedContent(result.decryptedContent);
        setShowDecrypted(true);
      }
    } catch (error) {
      console.error("Erro ao decriptar:", error);
    } finally {
      setDecrypting(false);
    }
  };

  const handleVerify = async () => {
    if (!message.signed || !currentUser?.id) return;
    try {
      await onVerify(message.id);
    } catch (error) {
      console.error("Erro na verificação:", error);
    }
  };

  // Carregar preview de imagem
  useEffect(() => {
    if (isImage && currentUser?.id && !imagePreview) {
      imageService
        .getImagePreview(message.id, currentUser.id)
        .then((preview) => {
          if (preview.base64) setImagePreview(preview.base64);
        })
        .catch(console.error);
    }
  }, [isImage, message.id, currentUser?.id]);

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

        <div className="text-sm">
          {isImage ? (
            <div className="text-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Imagem"
                  className="max-w-full rounded-lg cursor-pointer"
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
            <p className="break-words whitespace-pre-wrap">
              {displayContent || "Mensagem vazia"}
            </p>
          )}
        </div>

        <div
          className={`text-xs mt-2 ${
            isOwnMessage ? "text-blue-200" : "text-gray-500"
          }`}
        >
          {message.sentAt
            ? new Date(message.sentAt).toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Agora"}
          {decrypting && " · Decriptando..."}
        </div>
      </div>
    </div>
  );
};

export const Chat = ({
  user,
  users = [],
  selectedUser,
  onlineUsers = [],
  messages = [],
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !selectedUser || !user?.id) {
      console.warn("❌ Dados insuficientes para enviar mensagem");
      return;
    }

    setIsSending(true);
    try {
      if (file) {
        console.log("📤 Enviando imagem...");
        const uploadResult = await imageService.uploadImage(
          user.id,
          file,
          selectedUser.id
        );
        // Passar o objeto de mensagem retornado pelo backend para o handler
        // O backend cria a Message e também notifica via WebSocket. Ao receber
        // o DTO aqui garantimos feedback imediato para o remetente.
        const messageDto = uploadResult?.data || uploadResult;
        await onSendMessage(messageDto);
      } else {
        console.log("📤 Enviando mensagem de texto...");
        await onSendMessage(newMessage);
      }

      setNewMessage("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      alert("Erro ao enviar: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSending(false);
    }
  };

  const handleDecryptMessageWrapper = async (messageId) => {
    if (!user?.id) {
      console.error("❌ User ID não disponível para decriptação");
      return {
        success: false,
        decryptedContent: "❌ Erro: Utilizador não autenticado",
        error: "User ID não disponível",
      };
    }

    try {
      const result = await onDecryptMessage(messageId);
      return result;
    } catch (error) {
      console.error("💥 Erro ao decriptar:", error);
      return {
        success: false,
        decryptedContent: "❌ Erro crítico ao decriptar",
        error: error.message,
      };
    }
  };

  const handleVerifySignature = async (messageId) => {
    if (!user?.id) {
      alert("❌ Utilizador não autenticado");
      return { success: false, signatureValid: false };
    }

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
    if (selectedFile) {
      // Validação básica de imagem
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(selectedFile.type)) {
        alert("❌ Selecione apenas imagens (JPEG, PNG, GIF, WebP)");
        return;
      }

      if (selectedFile.size > maxSize) {
        alert("❌ Imagem muito grande. Máximo: 10MB");
        return;
      }

      setFile(selectedFile);
    }
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
            <span>Sistema seguro activo</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhum utilizador encontrado
            </div>
          ) : (
            filteredUsers.map((userItem, idx) => (
              <div
                key={userItem.id ?? userItem.username ?? `user-${idx}`}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedUser?.id === userItem.id ? "bg-blue-50" : ""
                }`}
                onClick={() => onSelectUser(userItem)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {userItem.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      {userItem.username || "Utilizador"}
                      {/* Indicador online por utilizador */}
                      {onlineUsers &&
                        onlineUsers.some(
                          (o) => Number(o.userId) === Number(userItem.id)
                        ) && (
                          <span
                            className="w-2 h-2 rounded-full bg-green-500"
                            title="Online"
                          />
                        )}
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
            ))
          )}
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
              <div className="flex items-center gap-4 justify-between">
                <button
                  onClick={onToggleUserList}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Users className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedUser.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {selectedUser.username || "Utilizador"}
                      {onlineUsers &&
                        onlineUsers.some(
                          (o) => Number(o.userId) === Number(selectedUser.id)
                        ) && (
                          <span
                            className="w-2 h-2 rounded-full bg-green-500"
                            title="Online"
                          />
                        )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedUser.hasPublicKey
                        ? "🔒 Criptografia ativa"
                        : "🔓 Texto normal"}
                    </p>
                  </div>
                </div>

                {/* espaço reservado removido: presença do usuário exibida no header global */}
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
              {messages.length === 0 ? (
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
                  {messages.map((message, idx) => (
                    <MessageBubble
                      key={message.id ?? message.tempId ?? `msg-${idx}`}
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
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Enviar imagem"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSending}
                />

                <Button
                  type="submit"
                  disabled={(!newMessage.trim() && !file) || isSending}
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
