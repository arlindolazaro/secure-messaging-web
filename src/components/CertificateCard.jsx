import React from "react";
import { FileText, Download, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/Button";

export const CertificateCard = ({ certificate, onVerify, onExport }) => {
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
        <Button variant="outline" onClick={() => onVerify(certificate.id)}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Verificar
        </Button>
        <Button onClick={() => onExport(certificate.id)}>
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
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
