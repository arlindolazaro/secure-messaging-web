import React from "react";
import { X, Loader } from "lucide-react";
import { Button } from "./ui/Button";

export const CertificateModal = ({
  title,
  data,
  onDataChange,
  onSubmit,
  onCancel,
  loading,
  isRootCA,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onDataChange({ ...data, [name]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-xl mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onCancel} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              name="commonName"
              value={data.commonName}
              onChange={handleChange}
              placeholder="Nome comum (CN)"
              className="border rounded p-2"
            />
            <input
              name="organization"
              value={data.organization}
              onChange={handleChange}
              placeholder="Organização"
              className="border rounded p-2"
            />
            <input
              name="organizationalUnit"
              value={data.organizationalUnit}
              onChange={handleChange}
              placeholder="Unidade Organizacional"
              className="border rounded p-2"
            />
            <input
              name="locality"
              value={data.locality}
              onChange={handleChange}
              placeholder="Localidade (cidade)"
              className="border rounded p-2"
            />
            <input
              name="province"
              value={data.province}
              onChange={handleChange}
              placeholder="Província"
              className="border rounded p-2"
            />
            <input
              name="country"
              value={data.country}
              onChange={handleChange}
              placeholder="País (ex: MZ)"
              className="border rounded p-2"
            />
          </div>

          {!isRootCA ? (
            <div>
              <label className="block text-sm mb-1">Validade (dias)</label>
              <input
                name="validDays"
                type="number"
                value={data.validDays}
                onChange={handleChange}
                className="border rounded p-2 w-32"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1">Validade (anos)</label>
              <input
                name="validYears"
                type="number"
                value={data.validYears}
                onChange={handleChange}
                className="border rounded p-2 w-32"
              />
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              "Confirmar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateModal;
