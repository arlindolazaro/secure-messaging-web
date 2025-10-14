/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export const useWebSocket = (userId, url = "http://localhost:8080/ws") => {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  const messageCallbacksRef = useRef(new Map());

  const registerCallback = useCallback((id, callback) => {
    messageCallbacksRef.current.set(id, callback);
    console.log(`✅ Callback registrado: ${id}`);
  }, []);

  const unregisterCallback = useCallback((id) => {
    messageCallbacksRef.current.delete(id);
    console.log(`🗑️ Callback removido: ${id}`);
  }, []);

  useEffect(() => {
    if (!userId) {
      console.log("⏳ Aguardando userId para conectar WebSocket");
      return;
    }

    console.log("🔌 Conectando WebSocket para usuário:", userId);

    const socket = new SockJS(url);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => console.log("STOMP:", str),
    });

    stompClient.onConnect = (frame) => {
      console.log("✅ WebSocket CONECTADO para usuário:", userId);
      setIsConnected(true);

      // ✅ Tópicos para o usuário
      const userMessageTopic = `/topic/user/${userId}/messages`;
      const userErrorTopic = `/topic/user/${userId}/errors`;
      const userDecryptedTopic = `/topic/user/${userId}/messageDecrypted`;

      // ✅ Subscrever aos tópicos
      stompClient.subscribe(userMessageTopic, (message) => {
        try {
          const newMessage = JSON.parse(message.body);
          console.log("📨 Nova mensagem recebida via WebSocket:", newMessage);

          messageCallbacksRef.current.forEach((callback, id) => {
            try {
              callback(newMessage);
            } catch (error) {
              console.error(`❌ Erro no callback ${id}:`, error);
            }
          });
        } catch (error) {
          console.error("❌ Erro ao processar mensagem WebSocket:", error);
        }
      });

      stompClient.subscribe(userErrorTopic, (message) => {
        try {
          const errorData = JSON.parse(message.body);
          console.error("❌ Erro recebido via WebSocket:", errorData);
        } catch (error) {
          console.error("❌ Erro ao processar mensagem de erro:", error);
        }
      });

      stompClient.subscribe(userDecryptedTopic, (message) => {
        try {
          const decryptedData = JSON.parse(message.body);
          console.log("🔓 Mensagem decriptada recebida:", decryptedData);
        } catch (error) {
          console.error("❌ Erro ao processar mensagem decriptada:", error);
        }
      });

      console.log("📡 Inscrito nos tópicos:", [
        userMessageTopic,
        userErrorTopic,
        userDecryptedTopic,
      ]);
    };

    stompClient.onStompError = (frame) => {
      console.error("❌ Erro STOMP:", frame);
      setIsConnected(false);
    };

    stompClient.onDisconnect = () => {
      console.log("🔌 WebSocket desconectado");
      setIsConnected(false);
    };

    stompClient.onWebSocketError = (error) => {
      console.error("❌ Erro de conexão WebSocket:", error);
      setIsConnected(false);
    };

    stompClient.activate();
    clientRef.current = stompClient;

    return () => {
      if (clientRef.current) {
        console.log("🧹 Limpando WebSocket para usuário:", userId);
        clientRef.current.deactivate();
      }
    };
  }, [userId, url]);

  const sendMessage = useCallback((destination, body) => {
    if (clientRef.current && clientRef.current.connected) {
      try {
        clientRef.current.publish({
          destination,
          body: JSON.stringify(body),
        });
        console.log("📤 Mensagem enviada via WebSocket:", {
          destination,
          body: body.id || body.messageId || body,
        });
        return true;
      } catch (error) {
        console.error("❌ Erro ao enviar mensagem via WebSocket:", error);
        return false;
      }
    } else {
      console.warn("⚠️ WebSocket não conectado, mensagem não enviada");
      return false;
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    registerCallback,
    unregisterCallback,
  };
};
