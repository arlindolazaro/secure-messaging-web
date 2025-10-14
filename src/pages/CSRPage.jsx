// src/pages/CSRPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  FileText,
  Download,
  Shield,
  Plus,
  Calendar,
  Loader,
  X,
  Key,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
  Ban,
  ArrowLeft,
  Copy,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { csrService } from "../api/csrService";
import { certificateService } from "../api/certificateService";
import { cryptoService } from "../api/cryptoService";
import { useNavigate } from "react-router-dom";

export const CSRPage = () => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const navigate = useNavigate();
  const [csrs, setCsrs] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedCSR, setSelectedCSR] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [privateKey, setPrivateKey] = useState("");

  const [csrData, setCsrData] = useState({
    commonName: "",
    organization: "",
    organizationalUnit: "",
    locality: "",
    province: "",
    country: "MZ",
    publicKey: "",
  });
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        csrService.getMyCSRs(),
        certificateService.getCertificatesByUser(),
      ]);

      const csrsResult = results[0];
      const certsResult = results[1];

      if (csrsResult.status === "fulfilled") {
        setCsrs(csrsResult.value);
      } else {
        console.error("getMyCSRs falhou:", csrsResult.reason);
        const friendly = csrsResult.reason?.message || "Erro ao carregar CSRs";
        setCsrData((d) => d); // no-op to keep lint happy
        setErrorInfo({ message: friendly, details: csrsResult.reason });
      }

      if (certsResult.status === "fulfilled") {
        setCertificates(certsResult.value);
      } else {
        console.error("getCertificatesByUser falhou:", certsResult.reason);
        // certificateService already returns [] on 500 in many cases; still surface message
        const friendly =
          certsResult.reason?.message || "Erro ao carregar certificados";
        setErrorInfo(
          (prev) => prev || { message: friendly, details: certsResult.reason }
        );
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      // Store a friendly message and optional details
      const friendly =
        error.response?.data?.error ||
        error.message ||
        "An unexpected error occurred.";
      // show an inline error state by setting csrs to empty and using a state for error
      setCsrs([]);
      setCertificates([]);
      // set a transient error message in state
      setErrorInfo({ message: friendly, details: error });
      return;
    } finally {
      setLoading(false);
    }
  };

  const generateKeyPair = async () => {
    try {
      setActionLoading(true);
      const result = await cryptoService.generateRSAKeyPair(1024);

      setCsrData((prev) => ({
        ...prev,
        publicKey: result.publicKey,
      }));
      setPrivateKey(result.privateKey);

      alert(
        "✅ Par de chaves gerado com sucesso!\n\n⚠️ GUARDE A CHAVE PRIVADA EM LOCAL SEGURO!\nEla será necessária para usar o certificado assinado."
      );
    } catch (error) {
      console.error("Erro ao gerar chaves:", error);
      alert("❌ Erro ao gerar par de chaves: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("✅ Copiado para a área de transferência!");
      })
      .catch((err) => {
        console.error("Erro ao copiar:", err);
      });
  };

  const createCSR = async () => {
    if (!csrData.commonName.trim()) {
      alert("❌ Nome comum é obrigatório");
      return;
    }

    if (!csrData.publicKey.trim()) {
      alert("❌ Gere um par de chaves primeiro");
      return;
    }

    setActionLoading(true);
    try {
      await csrService.createCSR(csrData);
      await loadData();
      setShowCreateModal(false);
      resetCSRForm();
      // atualizar estatísticas / estados globais
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      alert(
        "✅ CSR criado com sucesso!\n\nAgora solicite a uma CA para assinar seu pedido."
      );
    } catch (error) {
      console.error("Erro ao criar CSR:", error);
      alert("❌ Erro ao criar CSR: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const signCSR = async (caCertificateId, validDays = 365) => {
    if (!selectedCSR) return;

    setActionLoading(true);
    try {
      await csrService.signCSR(selectedCSR.id, caCertificateId, validDays);
      await loadData();
      setShowSignModal(false);
      setSelectedCSR(null);
      // atualizar dados globais (certificados gerados)
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      alert(
        "✅ CSR assinado com sucesso!\n\nO certificado foi gerado e está disponível na página de Certificados."
      );
    } catch (error) {
      console.error("Erro ao assinar CSR:", error);
      alert("❌ Erro ao assinar CSR: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const approveCSR = async (csrId) => {
    setActionLoading(true);
    try {
      await csrService.approveCSR(csrId);
      await loadData();
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      alert("✅ CSR aprovado com sucesso!");
    } catch (error) {
      console.error("Erro ao aprovar CSR:", error);
      alert("❌ Erro ao aprovar CSR: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const rejectCSR = async (csrId) => {
    const reason = prompt("Motivo da rejeição:", "Rejeitado pelo utilizador");
    if (!reason) return;

    setActionLoading(true);
    try {
      await csrService.rejectCSR(csrId, reason);
      await loadData();
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      alert("✅ CSR rejeitado com sucesso!");
    } catch (error) {
      console.error("Erro ao rejeitar CSR:", error);
      alert("❌ Erro ao rejeitar CSR: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetCSRForm = () => {
    setCsrData({
      commonName: "",
      organization: "",
      organizationalUnit: "",
      locality: "",
      province: "",
      country: "MZ",
      publicKey: "",
    });
    setPrivateKey("");
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "PENDING":
        return {
          text: "Pendente",
          color: "text-yellow-600 bg-yellow-100",
          icon: Clock,
        };
      case "APPROVED":
        return {
          text: "Aprovado",
          color: "text-blue-600 bg-blue-100",
          icon: UserCheck,
        };
      case "REJECTED":
        return {
          text: "Rejeitado",
          color: "text-red-600 bg-red-100",
          icon: Ban,
        };
      case "SIGNED":
        return {
          text: "Assinado",
          color: "text-green-600 bg-green-100",
          icon: CheckCircle,
        };
      default:
        return {
          text: status,
          color: "text-gray-600 bg-gray-100",
          icon: FileText,
        };
    }
  };

  const navigateToCertificates = () => {
    navigate("/certificates");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">A carregar pedidos de assinatura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorInfo && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-red-700 font-medium">
                Erro ao carregar dados
              </div>
              <div className="text-xs text-red-600 mt-1">
                {errorInfo.message}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setErrorInfo(null);
                  loadData();
                }}
                className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-sm"
              >
                Recarregar
              </button>
              <button
                onClick={() =>
                  console.error("Detalhes do erro:", errorInfo.details)
                }
                className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-sm"
              >
                Ver detalhes (console)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              onClick={navigateToCertificates}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Pedidos de Assinatura (CSR)
            </h1>
          </div>
          <p className="text-gray-600">
            Solicitar e gerir assinaturas de certificados digitais
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Pedido</span>
        </Button>
      </div>

      {/* Informação sobre CSR */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">O que é um CSR?</h3>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Certificate Signing Request (CSR)</strong> é um pedido
              para uma Autoridade Certificadora (CA) assinar seu certificado.
              Você gera um par de chaves, cria o CSR com sua chave pública, e
              uma CA valida e assina seu certificado.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Criar CSR */}
      {showCreateModal && (
        <CSRModal
          data={csrData}
          privateKey={privateKey}
          onDataChange={setCsrData}
          onGenerateKeys={generateKeyPair}
          onSubmit={createCSR}
          onCopyKey={copyToClipboard}
          onCancel={() => {
            setShowCreateModal(false);
            resetCSRForm();
          }}
          loading={actionLoading}
        />
      )}

      {/* Modal Assinar CSR */}
      {showSignModal && selectedCSR && (
        <SignCSRModal
          csr={selectedCSR}
          certificates={certificates.filter(
            (c) => c.isRootCA || c.issuerName === c.subjectName
          )}
          onSign={signCSR}
          onCancel={() => {
            setShowSignModal(false);
            setSelectedCSR(null);
          }}
          loading={actionLoading}
        />
      )}

      {/* Lista de CSRs */}
      <div className="space-y-4">
        {csrs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum pedido de assinatura encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                Crie um pedido de assinatura (CSR) para obter um certificado
                assinado por uma CA
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro CSR
              </Button>
            </CardContent>
          </Card>
        ) : (
          csrs.map((csr) => (
            <CSRCard
              key={csr.id}
              csr={csr}
              onSign={() => {
                setSelectedCSR(csr);
                setShowSignModal(true);
              }}
              onApprove={approveCSR}
              onReject={rejectCSR}
              getStatusInfo={getStatusInfo}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Modal Criar CSR
const CSRModal = ({
  data,
  privateKey,
  onDataChange,
  onGenerateKeys,
  onSubmit,
  onCopyKey,
  onCancel,
  loading,
}) => {
  const fields = [
    {
      key: "commonName",
      label: "Nome Comum (CN) *",
      type: "text",
      placeholder: "ex: João Alberto",
    },
    {
      key: "organization",
      label: "Organização (O)",
      type: "text",
      placeholder: "ex: Empresa Moçambicana",
    },
    {
      key: "organizationalUnit",
      label: "Unidade Organizacional (OU)",
      type: "text",
      placeholder: "ex: TI",
    },
    {
      key: "locality",
      label: "Localidade (L)",
      type: "text",
      placeholder: "ex: Maputo",
    },
    {
      key: "province",
      label: "Província",
      type: "text",
      placeholder: "ex: Maputo",
    },
    {
      key: "country",
      label: "País (C) *",
      type: "text",
      placeholder: "ex: MZ",
      maxLength: 2,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            Criar Pedido de Assinatura (CSR)
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-800">
              <Key className="h-4 w-4" />
              <span className="font-semibold">Fluxo PKI Completo</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              1. Gere par de chaves → 2. Crie CSR → 3. CA assina → 4. Recebe
              certificado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {fields.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                type={field.type}
                value={data[field.key]}
                onChange={(value) =>
                  onDataChange({ ...data, [field.key]: value })
                }
                placeholder={field.placeholder}
                maxLength={field.maxLength}
              />
            ))}
          </div>

          {/* Chave Pública */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chave Pública *
            </label>
            <div className="relative">
              <textarea
                value={data.publicKey}
                onChange={(e) =>
                  onDataChange({ ...data, publicKey: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Clique em 'Gerar Chaves' para criar um par de chaves RSA"
                rows={6}
                readOnly
              />
              {data.publicKey && (
                <button
                  onClick={() => onCopyKey(data.publicKey)}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
                  title="Copiar chave pública"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={onGenerateKeys}
              variant="outline"
              className="mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />A gerar...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Gerar Par de Chaves
                </>
              )}
            </Button>
          </div>

          {/* Chave Privada (apenas para visualização) */}
          {privateKey && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⚠️ Chave Privada (GUARDE EM SEGURANÇA) *
              </label>
              <div className="relative">
                <textarea
                  value={privateKey}
                  readOnly
                  className="w-full px-3 py-2 border border-red-300 bg-red-50 rounded-lg font-mono text-sm"
                  rows={4}
                />
                <button
                  onClick={() => onCopyKey(privateKey)}
                  className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600"
                  title="Copiar chave privada"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-red-600 mt-1">
                <strong>Importante:</strong> Esta chave NÃO será armazenada no
                servidor. Guarde-a em local seguro - será necessária para usar o
                certificado assinado.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onSubmit}
              className="flex-1"
              disabled={
                loading || !data.commonName.trim() || !data.publicKey.trim()
              }
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />A criar...
                </>
              ) : (
                "Criar CSR"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal Assinar CSR
const SignCSRModal = ({ csr, certificates, onSign, onCancel, loading }) => {
  const [selectedCA, setSelectedCA] = useState("");
  const [validDays, setValidDays] = useState(365);

  const handleSign = () => {
    if (!selectedCA) {
      alert("❌ Selecione uma CA para assinar");
      return;
    }
    onSign(selectedCA, validDays);
  };

  const availableCAs = certificates.filter(
    (c) => c.isRootCA || c.issuerName === c.subjectName
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Assinar CSR
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900">CSR a ser assinado:</h3>
            <p className="text-sm text-gray-600 mt-1">{csr.commonName}</p>
            {csr.organization && (
              <p className="text-sm text-gray-600">
                Organização: {csr.organization}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar CA *
              </label>
              <select
                value={selectedCA}
                onChange={(e) => setSelectedCA(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma CA...</option>
                {availableCAs.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.subjectName} {cert.isRootCA && "🔑 (Root CA)"}
                  </option>
                ))}
              </select>
              {availableCAs.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Nenhuma CA disponível. Crie uma CA Raiz primeiro.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dias de Validade
              </label>
              <input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 365)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="3650"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleSign}
              className="flex-1"
              disabled={loading || !selectedCA || availableCAs.length === 0}
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />A assinar...
                </>
              ) : (
                "Assinar CSR"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Cartão de CSR
const CSRCard = ({ csr, onSign, onApprove, onReject, getStatusInfo }) => {
  const statusInfo = getStatusInfo(csr.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {csr.commonName}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {csr.id}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color} flex items-center gap-1`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.text}
                </span>
                {csr.signedByCAName && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium text-purple-600 bg-purple-100">
                    Assinado por: {csr.signedByCAName}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-700">Organização:</span>
                <p className="mt-1">{csr.organization || "N/A"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Localidade:</span>
                <p className="mt-1">{csr.locality || "N/A"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Criado em:</span>
                <p className="mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(csr.createdAt).toLocaleDateString("pt-PT")}
                </p>
              </div>
            </div>

            {csr.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Motivo da rejeição:</span>{" "}
                  {csr.rejectionReason}
                </p>
              </div>
            )}

            {/* Preview da chave pública */}
            {csr.publicKey && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Chave Pública:
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(csr.publicKey)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copiar chave pública"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs font-mono text-gray-600 truncate">
                  {csr.publicKey.substring(0, 100)}...
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:items-end">
            {csr.status === "PENDING" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSign(csr.id)}
                  className="flex items-center gap-2 justify-center"
                >
                  <Shield className="h-4 w-4" />
                  <span>Assinar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApprove(csr.id)}
                  className="flex items-center gap-2 justify-center"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Aprovar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(csr.id)}
                  className="flex items-center gap-2 justify-center"
                >
                  <Ban className="h-4 w-4" />
                  <span>Rejeitar</span>
                </Button>
              </>
            )}
            {csr.status === "APPROVED" && (
              <Button
                onClick={() => onSign(csr.id)}
                className="flex items-center gap-2 justify-center"
              >
                <Shield className="h-4 w-4" />
                <span>Assinar Agora</span>
              </Button>
            )}
            {csr.status === "SIGNED" && (
              <div className="text-center">
                <p className="text-sm text-green-600 font-medium mb-2">
                  ✓ Certificado Gerado
                </p>
                <p className="text-xs text-gray-500">
                  Verifique na página de Certificados
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente FormField (reutilizável)
const FormField = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  min,
  max,
  maxLength,
  required,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder={placeholder}
      min={min}
      max={max}
      maxLength={maxLength}
      required={required}
    />
  </div>
);

export default CSRPage;
