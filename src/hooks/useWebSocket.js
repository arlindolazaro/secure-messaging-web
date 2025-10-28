/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import api from "../api";

export const useWebSocket = (userId, url = "/ws", username = null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const clientRef = useRef(null);
  const messageCallbacksRef = useRef(new Map());
  const connectionTimeoutRef = useRef(null);

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

    // Criar um novo SockJS a cada tentativa através do webSocketFactory
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(url),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => console.log("STOMP:", str),
    });

    stompClient.onConnect = (frame) => {
      console.log("✅ WebSocket CONECTADO para usuário:", userId);
      setIsConnected(true);
      setIsConnecting(false);
      // limpar eventual timeout de conexão
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      // ✅ Tópicos para o usuário
      const userMessageTopic = `/topic/user/${userId}/messages`;
      const userErrorTopic = `/topic/user/${userId}/errors`;
      const userDecryptedTopic = `/topic/user/${userId}/messageDecrypted`;
      const userQueueMessages = `/user/queue/messages`;

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
      console.log("🔔 Subscrito em:", userMessageTopic);

      // Também subscrever à fila do usuário (destino /user/queue/messages)
      try {
        stompClient.subscribe(userQueueMessages, (message) => {
          try {
            const newMessage = JSON.parse(message.body);
            console.log(
              "📨 (user queue) Nova mensagem recebida via WebSocket:",
              newMessage
            );

            messageCallbacksRef.current.forEach((callback, id) => {
              try {
                callback(newMessage);
              } catch (error) {
                console.error(`❌ Erro no callback ${id}:`, error);
              }
            });
          } catch (error) {
            console.error("❌ Erro ao processar message da user queue:", error);
          }
        });
        console.log("🔔 Subscrito em:", userQueueMessages);
      } catch (e) {
        console.warn("Não foi possível subscrever /user/queue/messages:", e);
      }

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

      // Subscribing to global online users topic
      try {
        stompClient.subscribe("/topic/users/online", (message) => {
          try {
            const payload = JSON.parse(message.body);
            // Notificar callbacks registrados com id 'online-users'
            const cb = messageCallbacksRef.current.get("online-users");
            if (cb) cb(payload);
          } catch (e) {
            console.error("Erro ao processar online-users:", e);
          }
        });
      } catch (e) {
        console.warn("Não foi possível subscrever /topic/users/online:", e);
      }

      // Anunciar presença ao servidor via cliente axios (usa interceptor para Authorization)
      try {
        if (username && userId) {
          // Usar o cliente `api` que já adiciona o JWT automaticamente via interceptor
          api
            .post(`/users/${userId}/announce-online`, { username })
            .then(() => console.debug("announce-online enviado com sucesso"))
            .catch((e) => {
              console.debug(
                "announce-online falhou:",
                e?.response?.status,
                e?.response?.data || e?.message || e
              );
            });
        }
      } catch (e) {
        console.debug("Erro no announce-online:", e);
      }
    };

    stompClient.onStompError = (frame) => {
      console.error("❌ Erro STOMP:", frame);
      setIsConnected(false);
      setIsConnecting(false);
    };

    stompClient.onDisconnect = () => {
      console.log("🔌 WebSocket desconectado");
      setIsConnected(false);
      setIsConnecting(false);
    };

    stompClient.onWebSocketError = (error) => {
      console.error("❌ Erro de conexão WebSocket:", error);
      setIsConnected(false);
      setIsConnecting(false);
    };
    // Quando o socket fecha, indicar tentativa de reconex\u00e3o (melhora feedback de UI)
    stompClient.onWebSocketClose = () => {
      console.warn("\u26a0\ufe0f WebSocket fechado, a tentar reconectar...");
      setIsConnected(false);
      setIsConnecting(false);
    };
    // marcar como em tentativa enquanto ativamos
    setIsConnecting(true);

    // criar timeout para evitar ficar permanentemente em 'A conectar...'
    connectionTimeoutRef.current = setTimeout(() => {
      if (!stompClient.connected) {
        console.warn(
          "⚠️ Timeout de conexão WebSocket - marcando como desconectado"
        );
        setIsConnecting(false);
        setIsConnected(false);
      }
      connectionTimeoutRef.current = null;
    }, 15000); // 15s

    stompClient.activate();
    clientRef.current = stompClient;

    return () => {
      if (clientRef.current) {
        console.log("🧹 Limpando WebSocket para usuário:", userId);
        clientRef.current.deactivate();
        setIsConnected(false);
        setIsConnecting(false);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      }
    };
  }, [userId, url, username]);

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
    isConnecting,
    sendMessage,
    registerCallback,
    unregisterCallback,
  };
};
