import React, { useState } from "react";
import { Copy, Eye, EyeOff, CheckCircle, XCircle, X } from "lucide-react";

export const DHResultModal = ({ isOpen, onClose, result }) => {
  const [showFull, setShowFull] = useState({});
  const [toast, setToast] = useState(null);

  if (!isOpen || !result) return null;

  const fields = [
    { key: "sharedSecretUser1", label: "Segredo (user1)" },
    { key: "sharedSecretUser2", label: "Segredo (user2)" },
    { key: "aesKeyUser1", label: "Chave AES (user1)" },
    { key: "aesKeyUser2", label: "Chave AES (user2)" },
  ];

  const showToast = (message, ms = 1800) => {
    setToast(message);
    setTimeout(() => setToast(null), ms);
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copiado para a área de transferência!");
    } catch (err) {
      console.error("Erro ao copiar:", err);
      showToast("Erro ao copiar");
    }
  };

  const copyAll = () => {
    const all = fields
      .map((f) => `${f.label}: ${result[f.key] || ""}`)
      .join("\n\n");
    copy(all);
  };

  const renderValue = (key) => {
    const val = result[key] || "";
    if (showFull[key]) return val;
    if (val.length <= 60) return val;
    return val.substring(0, 30) + "..." + val.substring(val.length - 10);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Resultado do Acordo DH
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onClose()}
              className="text-gray-400 hover:text-gray-600 rounded p-1"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {result.secretsMatch ? (
                <CheckCircle className="text-green-600 h-6 w-6" />
              ) : (
                <XCircle className="text-red-600 h-6 w-6" />
              )}
              <div>
                <div className="text-sm text-gray-600">Segredos</div>
                <div
                  className={`font-semibold ${
                    result.secretsMatch ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {result.secretsMatch ? "Correspondem ✅" : "Divergem ❌"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyAll}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm flex items-center gap-2"
                title="Copiar todos os valores"
              >
                <Copy className="h-4 w-4" />
                <span>Copiar tudo</span>
              </button>
              <button
                onClick={() => onClose()}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {fields.map((f) => (
              <div
                key={f.key}
                className="bg-gray-50 border border-gray-200 rounded p-3 flex items-start justify-between gap-2"
              >
                <div className="flex-1">
                  <div className="text-xs text-gray-500">{f.label}</div>
                  <pre className="font-mono text-xs text-gray-700 mt-1 break-words">
                    {renderValue(f.key)}
                  </pre>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copy(result[f.key] || "")}
                      className="text-gray-500 hover:text-gray-700 p-1"
                      title="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setShowFull((s) => ({ ...s, [f.key]: !s[f.key] }))
                      }
                      className="text-gray-500 hover:text-gray-700 p-1"
                      title={showFull[f.key] ? "Esconder" : "Mostrar completo"}
                    >
                      {showFull[f.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Toast local */}
          {toast && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-60">
              <div className="bg-black text-white px-4 py-2 rounded shadow">
                {toast}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DHResultModal;
