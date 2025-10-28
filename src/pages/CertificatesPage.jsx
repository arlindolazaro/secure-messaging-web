// src/pages/CertificatesPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
  ArrowRight,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { certificateService } from "../api/certificateService";
import CertificateModal from "../components/CertificateModal";
import CertificateCard from "../components/CertificateCard";

export const CertificatesPage = () => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRootCAModal, setShowRootCAModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [certificateData, setCertificateData] = useState({
    commonName: "",
    organization: "",
    organizationalUnit: "",
    locality: "",
    province: "",
    country: "MZ",
    validDays: 365,
  });

  const [rootCAData, setRootCAData] = useState({
    commonName: "",
    organization: "",
    organizationalUnit: "",
    locality: "",
    province: "",
    country: "MZ",
    validYears: 5,
  });

  useEffect(() => {
    loadCertificates();
  }, []);

  useEffect(() => {
    const onDeleted = (e) => {
      console.log("certificateDeleted", e.detail);
      loadCertificates();
    };
    window.addEventListener("certificateDeleted", onDeleted);
    return () => window.removeEventListener("certificateDeleted", onDeleted);
  }, []);

  // ✅ CÓDIGO ATUALIZADO
  const loadCertificates = async () => {
    try {
      setLoading(true);
      const certs = await certificateService.getCertificatesByUser();
      setCertificates(certs);
    } catch (error) {
      console.error("Erro ao carregar certificados:", error);

      // ✅ TRATAMENTO DE ERRO MELHORADO
      if (error.response?.status === 500) {
        alert(
          "❌ Erro no servidor. O banco de dados pode precisar de atualização."
        );
      } else {
        alert("❌ Erro ao carregar certificados. Tente novamente.");
      }

      setCertificates([]); // Define como array vazio para evitar erros
    } finally {
      setLoading(false);
    }
  };

  const createCertificate = async () => {
    if (!certificateData.commonName.trim()) {
      alert("❌ Nome comum é obrigatório");
      return;
    }

    setActionLoading(true);
    try {
      await certificateService.createCertificate(certificateData);
      await loadCertificates();
      setShowCreateModal(false);
      resetCertificateForm();
      // notificar outras partes da app para atualizar estatísticas
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      alert("✅ Certificado criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar certificado:", error);
      alert(
        "❌ Erro ao criar certificado: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const createRootCA = async () => {
    if (!rootCAData.commonName.trim()) {
      alert("❌ Nome da CA é obrigatório");
      return;
    }

    setActionLoading(true);
    try {
      await certificateService.generateRootCA(rootCAData);
      await loadCertificates();
      setShowRootCAModal(false);
      resetRootCAForm();
      // notificar para atualizar estatísticas
      window.dispatchEvent(new CustomEvent("userStatsUpdated"));
      alert("✅ Root CA criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar Root CA:", error);
      alert(
        "❌ Erro ao criar Root CA: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const verifyCertificate = async (certId) => {
    try {
      const result = await certificateService.verifyCertificate(certId);
      const status = result.valid ? "✅ VÁLIDO" : "❌ INVÁLIDO";
      const details = `
Assinatura: ${result.signatureValid ? "✅" : "❌"}
Validade: ${result.withinValidity ? "✅" : "❌"} 
Revogação: ${result.notRevoked ? "✅" : "❌"}
Cadeia: ${result.chainValid ? "✅" : "❌"}

${result.message}
      `;
      alert(`Verificação do Certificado:\n\n${status}\n\n${details}`);
    } catch (error) {
      console.error("Erro ao verificar certificado:", error);
      alert("❌ Erro ao verificar certificado");
    }
  };

  const exportCertificatePDF = async (certId) => {
    try {
      const pdfBlob = await certificateService.exportCertificatePDF(certId);
      const url = URL.createObjectURL(pdfBlob);
      // Abrir em nova aba para preview; o utilizador pode fazer download a partir daí
      window.open(url, "_blank");
      // não revocar imediatamente para permitir preview; revogar após 30s
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("❌ Erro ao exportar PDF");
    }
  };

  const resetCertificateForm = () => {
    setCertificateData({
      commonName: "",
      organization: "",
      organizationalUnit: "",
      locality: "",
      province: "",
      country: "MZ",
      validDays: 365,
    });
  };

  const resetRootCAForm = () => {
    setRootCAData({
      commonName: "",
      organization: "",
      organizationalUnit: "",
      locality: "",
      province: "",
      country: "MZ",
      validYears: 5,
    });
  };

  const navigateToCSR = () => {
    navigate("/csrs");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">A carregar certificados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho simplificado: título removido, manter descrição e ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">
            Gerir certificados digitais e autoridades certificadoras
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            onClick={navigateToCSR}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            <span>Pedidos Assinatura</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowRootCAModal(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            <span>CA Raiz</span>
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Certificado</span>
          </Button>
        </div>
      </div>

      {/* Informação PKI compacta */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Fluxo Recomendado:</strong> 1. Crie uma CA Raiz → 2. Gere
              pedidos de assinatura (CSR) → 3. Assine certificados com sua CA
            </p>
          </div>
        </div>
      </div>

      {/* Modais e lista mantidos iguais */}
      {showCreateModal && (
        <CertificateModal
          title="Criar Certificado Autoassinado"
          data={certificateData}
          onDataChange={setCertificateData}
          onSubmit={createCertificate}
          onCancel={() => {
            setShowCreateModal(false);
            resetCertificateForm();
          }}
          loading={actionLoading}
          isRootCA={false}
        />
      )}

      {showRootCAModal && (
        <CertificateModal
          title="Criar CA Raiz Autoassinada"
          data={rootCAData}
          onDataChange={setRootCAData}
          onSubmit={createRootCA}
          onCancel={() => {
            setShowRootCAModal(false);
            resetRootCAForm();
          }}
          loading={actionLoading}
          isRootCA={true}
        />
      )}

      {/* Lista de Certificados */}
      <div className="space-y-4">
        {certificates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum certificado encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                Comece criando uma CA Raiz ou um certificado autoassinado
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => setShowRootCAModal(true)}
                  variant="outline"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Criar CA Raiz
                </Button>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Certificado
                </Button>
                <Button onClick={navigateToCSR} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Pedir Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          certificates.map((cert) => (
            <CertificateCard
              key={cert.id}
              certificate={cert}
              onVerify={verifyCertificate}
              onExport={exportCertificatePDF}
            />
          ))
        )}
      </div>
    </div>
  );
};
