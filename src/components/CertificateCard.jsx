import React from "react";
import {
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Trash,
} from "lucide-react";
import { Button } from "./ui/Button";
import { certificateService } from "../api/certificateService";
import ConfirmModal from "./ui/ConfirmModal";
import Tooltip from "./ui/Tooltip";
import { useState } from "react";

export const CertificateCard = ({ certificate, onVerify, onExport }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await certificateService.deleteCertificate(certificate.id);
      window.dispatchEvent(
        new CustomEvent("certificateDeleted", {
          detail: { id: certificate.id },
        })
      );
      setShowConfirm(false);
      alert("Certificado apagado com sucesso");
    } catch (e) {
      console.error(e);
      alert("Erro ao apagar certificado: " + (e.message || e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <FileText className="h-6 w-6 text-gray-600 mt-1" />
        <div>
          <h4 className="font-semibold">
            {certificate.subjectName || certificate.commonName}
          </h4>
          <p className="text-sm text-gray-600">
            Emitido por: {certificate.issuerName || certificate.issuer || "-"}
          </p>
          <p className="text-sm text-gray-600">
            Válido até:{" "}
            {formatValidTo(certificate.validTo || certificate.notAfter)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip text="Verificar">
          <Button
            variant="outline"
            onClick={() => onVerify(certificate.id)}
            className="p-0 w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50"
          >
            <CheckCircle className="h-6 w-6 text-gray-700" />
          </Button>
        </Tooltip>

        <Tooltip text="Exportar PDF">
          <Button
            onClick={() => onExport(certificate.id)}
            className="p-0 w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50"
          >
            <Download className="h-6 w-6 text-gray-700" />
          </Button>
        </Tooltip>

        <Tooltip text="Apagar certificado">
          <Button
            className="p-0 w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50"
            onClick={() => setShowConfirm(true)}
          >
            <Trash className="h-6 w-6 text-red-600" />
          </Button>
        </Tooltip>

        <ConfirmModal
          isOpen={showConfirm}
          title="Apagar certificado"
          message="Tem a certeza que pretende apagar este certificado? Esta ação é irreversível."
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
          loading={deleting}
        />
      </div>
    </div>
  );
};

export default CertificateCard;

function formatValidTo(val) {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(val);
  }
}
