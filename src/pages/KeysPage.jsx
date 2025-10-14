// src/pages/KeysPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Key,
  Download,
  Upload,
  RefreshCw,
  Shield,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  Cpu,
  Lock,
  FileKey,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { keyManagementService } from "../api/keyManagementService";
import { cryptoService } from "../api/cryptoService";
import { userService } from "../api/userService";
import { CryptoUtils } from "../utils/CryptoUtils";

export const KeysPage = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [peers, setPeers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);

  const loadPeers = useCallback(async () => {
    try {
      if (!user?.id) return;
      const all = await userService.getAllUsers();
      const others = all
        .filter((u) => u.id !== user.id)
        .map((u) => ({
          id: u.id,
          username: u.username || `user-${u.id}`,
        }));
      setPeers(others);
      if (others.length > 0) setSelectedPeer(others[0].id);
    } catch (error) {
      console.error("Erro ao carregar peers:", error);
    }
  }, [user]);

  const loadKeysInfo = useCallback(async () => {
    try {
      if (user?.id) {
        const keysInfo = await keyManagementService.getKeysInfo(user.id);
        setKeys(keysInfo);
      }
    } catch (error) {
      console.error("Erro ao carregar informações das chaves:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadKeysInfo();
    loadPeers();
  }, [loadKeysInfo, loadPeers]);

  const generateNewKeys = async () => {
    if (!user?.id) return;

    setGenerating(true);
    try {
      await keyManagementService.generateKeys(user.id, 1024);
      await loadKeysInfo();
      // notifica outras páginas para atualizarem estatísticas
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      window.dispatchEvent(new CustomEvent("usersUpdated"));
      alert("✅ Novas chaves RSA geradas com sucesso!");
    } catch (error) {
      alert(
        "❌ Erro ao gerar chaves: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setGenerating(false);
    }
  };

  const setupDiffieHellman = async () => {
    if (!user?.id) return;

    try {
      await keyManagementService.setupDiffieHellman(user.id);
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      window.dispatchEvent(new CustomEvent("usersUpdated"));
      alert("✅ Diffie-Hellman configurado com sucesso!");
    } catch (error) {
      console.error("Erro ao configurar Diffie-Hellman:", error);
      alert("❌ Erro ao configurar Diffie-Hellman");
    }
  };

  const simulateKeyExchange = async () => {
    setSimulating(true);
    try {
      const result = await cryptoService.simulateDHAgreement();

      if (result.success) {
        alert(
          `✅ Acordo de chaves Diffie-Hellman simulado com sucesso!\n\n` +
            `• Sessão A: ${result.sessionIdA}\n` +
            `• Sessão B: ${result.sessionIdB}\n` +
            `• Segredos compartilhados: ${
              result.keysMatch ? "✅ IGUAIS" : "❌ DIFERENTES"
            }\n` +
            `• Chaves AES geradas para comunicação segura`
        );
      } else {
        alert("❌ Falha na simulação do acordo de chaves");
      }
    } catch (error) {
      console.error("Erro na simulação DH:", error);
      alert(
        "❌ Erro na simulação do acordo de chaves: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setSimulating(false);
    }
  };

  const performKeyExchangeWithPeer = async () => {
    if (!user?.id || !selectedPeer) {
      alert("Escolha um utilizador para realizar o acordo DH");
      return;
    }

    try {
      setSimulating(true);
      const result = await userService.performKeyExchange(
        user.id,
        selectedPeer
      );
      // resultado esperado: keyExchange or success
      alert(
        `✅ Acordo de chaves executado. Resultado: ${JSON.stringify(result)}`
      );
      // recarregar info de chaves
      await loadKeysInfo();
    } catch (error) {
      console.error("Erro ao executar acordo DH:", error);
      alert("❌ Erro ao executar acordo DH: " + (error.message || error));
    } finally {
      setSimulating(false);
    }
  };

  const handleExportPublicKey = async () => {
    if (!user?.id) return;

    try {
      const data = await keyManagementService.exportPublicKey(user.id);
      setExportData(data);
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      alert("✅ Chave pública exportada com sucesso!");
    } catch (error) {
      alert(
        "❌ Erro ao exportar chave pública: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleGenerateLocalKeys = async () => {
    if (!window?.crypto?.subtle) {
      alert("WebCrypto API não disponível no seu navegador.");
      return;
    }

    try {
      setGenerating(true);
      const keys = await CryptoUtils.generateRSAKeyPairWebCrypto(1024);

      // pedir password ao utilizador para cifrar a chave privada
      const password = prompt(
        "Defina uma password para proteger a chave privada local (recomendada):"
      );
      if (!password) {
        // fallback: salvar sem cifrar (compatibilidade)
        localStorage.setItem("local_private_key_pem", keys.privateKeyPEM);
        localStorage.setItem("local_public_key_pem", keys.publicKeyPEM);
        alert(
          "⚠️ Chave gerada, mas não foi definida password. A chave privada foi armazenada sem cifrar (inseguro)."
        );
      } else {
        // cifrar a PEM privada e guardar blob JSON
        const enc = CryptoUtils.encryptPrivateKeyWithPassword(
          keys.privateKeyPEM,
          password
        );
        localStorage.setItem("local_private_key_enc", enc);
        // guardar pública em texto claro para uso
        localStorage.setItem("local_public_key_pem", keys.publicKeyPEM);
        alert(
          "✅ Par de chaves local gerado. Chave privada cifrada e guardada no browser. Guarde a password!"
        );
      }
    } catch (error) {
      console.error("Erro ao gerar chaves locais:", error);
      alert("❌ Erro ao gerar chaves locais: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleUnlockLocalPrivateKey = useCallback(async () => {
    try {
      const enc = localStorage.getItem("local_private_key_enc");
      const raw = localStorage.getItem("local_private_key_pem");
      if (!enc && !raw) {
        alert("Não existe chave privada local guardada.");
        return;
      }

      if (raw) {
        // legacy: plain PEM
        sessionStorage.setItem("local_private_key_pem_unlocked", raw);
        alert(
          "Chave privada carregada na sessão (não cifrada armazenada previamente)."
        );
        return;
      }

      const password = prompt(
        "Introduza a password para desbloquear a chave privada:"
      );
      if (!password) return;

      const pem = CryptoUtils.decryptPrivateKeyWithPassword(enc, password);
      sessionStorage.setItem("local_private_key_pem_unlocked", pem);
      alert("✅ Chave privada desbloqueada para a sessão.");
    } catch (e) {
      console.error(e);
      alert("❌ Falha ao desbloquear a chave: " + (e.message || e));
    }
  }, []);

  // listener global para desbloquear chave local (botão no cartão aciona um CustomEvent)
  useEffect(() => {
    const handler = () => handleUnlockLocalPrivateKey();
    window.addEventListener("unlockLocalKey", handler);
    return () => window.removeEventListener("unlockLocalKey", handler);
  }, [handleUnlockLocalPrivateKey]);

  const handleImportPublicKey = async () => {
    const pemKey = prompt("Cole a chave pública no formato PEM:");
    if (!pemKey) return;

    try {
      await keyManagementService.importPublicKey(user.id, pemKey);
      await loadKeysInfo();
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      alert("✅ Chave pública importada com sucesso!");
    } catch (error) {
      alert(
        "❌ Erro ao importar chave: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("✅ Copiado para a área de transferência!"))
      .catch(() => alert("❌ Erro ao copiar"));
  };

  // eslint-disable-next-line no-unused-vars
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RSAKeysCard
          keys={keys?.rsa}
          onGenerate={generateNewKeys}
          onGenerateLocal={handleGenerateLocalKeys}
          generating={generating}
        />

        <DiffieHellmanCard
          keys={keys?.dh}
          onSetup={setupDiffieHellman}
          onSimulate={simulateKeyExchange}
          simulating={simulating}
          peers={peers}
          selectedPeer={selectedPeer}
          onPerformExchange={(val) => {
            if (val) {
              setSelectedPeer(val);
              return;
            }
            performKeyExchangeWithPeer();
          }}
        />
      </div>

      <ExportImportCard
        onExport={handleExportPublicKey}
        onImport={handleImportPublicKey}
        exportData={exportData}
        showPublicKey={showPublicKey}
        onTogglePublicKey={() => setShowPublicKey(!showPublicKey)}
        onCopy={copyToClipboard}
      />

      <SecurityTipsCard />
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full mx-auto mb-3" />
      <p className="text-gray-600 text-sm">
        A carregar informações das chaves...
      </p>
    </div>
  </div>
);

const RSAKeysCard = ({ keys, onGenerate, onGenerateLocal, generating }) => (
  <Card className="border-l-4 border-l-blue-500">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-3 text-lg">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Key className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <div>Chaves RSA</div>
          <div className="text-sm font-normal text-gray-500">
            Encriptação e Assinatura Digital
          </div>
        </div>
        <StatusBadge active={keys?.exists} />
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-4">
      <KeyInfoGrid
        algorithm="RSA"
        keySize={keys?.keySize || 1024}
        status={keys?.exists ? "Configurado" : "Não configurado"}
        created={keys?.created}
      />

      <Button
        onClick={onGenerate}
        loading={generating}
        disabled={generating}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        {generating ? "A Gerar..." : "Gerar Novas Chaves RSA"}
      </Button>
      {onGenerateLocal && (
        <div className="mt-3">
          <Button
            onClick={onGenerateLocal}
            variant="outline"
            className="w-full"
          >
            <FileKey className="h-4 w-4 mr-2" />
            Gerar chaves locais (WebCrypto)
          </Button>
        </div>
      )}
      {/* botão para desbloquear chave privada cifrada (se existir) */}
      <div className="mt-2">
        <Button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("unlockLocalKey"))
          }
          variant="ghost"
          className="w-full text-sm"
        >
          <Lock className="h-4 w-4 mr-2" />
          Desbloquear chave local para sessão
        </Button>
      </div>
    </CardContent>
  </Card>
);

const DiffieHellmanCard = ({
  keys,
  onSetup,
  onSimulate,
  simulating,
  peers = [],
  selectedPeer,
  onPerformExchange,
}) => (
  <Card className="border-l-4 border-l-green-500">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-3 text-lg">
        <div className="p-2 bg-green-100 rounded-lg">
          <Shield className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <div>Diffie-Hellman</div>
          <div className="text-sm font-normal text-gray-500">
            Acordo de Chaves Seguro
          </div>
        </div>
        <StatusBadge active={keys?.exists} />
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-3">
      <KeyInfoGrid
        algorithm="DH"
        keySize={keys?.keySize || 1024}
        status={keys?.exists ? "Configurado" : "Não configurado"}
        created={keys?.created}
      />

      <div className="space-y-2">
        <Button
          onClick={onSetup}
          variant="outline"
          className="w-full border-green-200 text-green-700 hover:bg-green-50"
        >
          <Cpu className="h-4 w-4 mr-2" />
          Configurar Diffie-Hellman
        </Button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            onClick={onSimulate}
            variant="outline"
            className="w-full"
            loading={simulating}
            disabled={simulating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {simulating ? "A Simular..." : "Simular Acordo DH"}
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <select
              className="flex-1 px-3 py-2 border rounded w-full"
              value={selectedPeer || ""}
              onChange={(e) => onPerformExchange?.(e.target.value)}
            >
              <option value="">Selecionar utilizador</option>
              {peers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username}
                </option>
              ))}
            </select>
            <Button
              onClick={() => onPerformExchange?.(null)}
              variant="outline"
              className="px-3 w-full sm:w-auto"
            >
              Executar
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ExportImportCard = ({
  onExport,
  onImport,
  exportData,
  showPublicKey,
  onTogglePublicKey,
  onCopy,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <FileKey className="h-5 w-5" />
        Exportação & Importação
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button onClick={onExport} variant="outline" className="h-11">
          <Download className="h-4 w-4 mr-2" />
          Exportar Chave Pública
        </Button>

        <Button onClick={onImport} variant="outline" className="h-11">
          <Upload className="h-4 w-4 mr-2" />
          Importar Chave Pública
        </Button>
      </div>

      {exportData && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h4 className="font-medium text-gray-800">
                Chave Pública Exportada
              </h4>
              <p className="text-sm text-gray-500">
                Formato: {exportData.format}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onTogglePublicKey}
                className="h-8 px-3"
              >
                {showPublicKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(exportData.publicKey)}
                className="h-8 px-3"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showPublicKey ? (
            <pre className="text-xs bg-white rounded p-3 border overflow-x-auto whitespace-pre-wrap max-h-60">
              {exportData.publicKey}
            </pre>
          ) : (
            <p className="text-center text-gray-500 text-sm py-3">
              Clique no ícone do olho para visualizar a chave pública
            </p>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

const SecurityTipsCard = () => (
  <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
          <Lock className="h-5 w-5 text-amber-600" />
        </div>

        <div>
          <h3 className="font-semibold text-amber-800 mb-2">
            Boas Práticas de Segurança
          </h3>

          <ul className="text-sm text-amber-700 space-y-2">
            <li className="flex items-start">
              <Shield className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                As chaves privadas são encriptadas e mantidas em segurança no
                servidor
              </span>
            </li>

            <li className="flex items-start">
              <Shield className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                Partilhe apenas chaves públicas com entidades confiáveis
              </span>
            </li>

            <li className="flex items-start">
              <Shield className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>Renove as chaves periodicamente para máxima segurança</span>
            </li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ active }) => (
  <span
    className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
      active ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100"
    }`}
  >
    {active ? (
      <>
        <CheckCircle className="h-3 w-3 inline mr-1" />
        Ativo
      </>
    ) : (
      <>
        <XCircle className="h-3 w-3 inline mr-1" />
        Inativo
      </>
    )}
  </span>
);

const KeyInfoGrid = ({ algorithm, keySize, status, created }) => (
  <div className="grid grid-cols-2 gap-4 text-sm">
    <div>
      <span className="text-gray-500">Algoritmo</span>
      <p className="font-medium font-mono">{algorithm}</p>
    </div>

    <div>
      <span className="text-gray-500">Tamanho</span>
      <p className="font-medium">{keySize} bits</p>
    </div>

    <div>
      <span className="text-gray-500">Estado</span>
      <p className="font-medium">{status}</p>
    </div>

    <div>
      <span className="text-gray-500">Criado em</span>
      <p className="font-medium flex items-center gap-1">
        <Calendar className="h-3 w-3 text-gray-400" />
        {formatDate(created)}
      </p>
    </div>
  </div>
);

// ✅ CORREÇÃO: Função formatDate definida corretamente
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default KeysPage;
