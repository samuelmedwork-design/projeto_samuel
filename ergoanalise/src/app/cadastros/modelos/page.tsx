"use client";
import { useState, useEffect } from "react";
import { useData, DocumentTemplate } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { FiBook, FiSave } from "react-icons/fi";

const TEMPLATE_TYPES: { type: DocumentTemplate["type"]; label: string; desc: string }[] = [
  { type: "cover", label: "Capa", desc: "Texto da página de capa do documento AET (empresa, data, etc.)." },
  { type: "body_initial", label: "Corpo Inicial", desc: "Texto introdutório que aparece antes das seções de dados e GSEs." },
  { type: "body_final", label: "Corpo Final", desc: "Texto de encerramento do documento, incluindo referências e disposições finais." },
];

function TemplateEditor({ type, label, desc }: { type: DocumentTemplate["type"]; label: string; desc: string }) {
  const { documentTemplates, saveDocumentTemplate } = useData();
  const { toast } = useToast();

  const existing = documentTemplates.find((t) => t.type === type);
  const [content, setContent] = useState(existing?.content || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const c = documentTemplates.find((t) => t.type === type)?.content || "";
    setContent(c);
    setDirty(false);
  }, [documentTemplates, type]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDocumentTemplate(type, content);
      setDirty(false);
      toast(`Modelo "${label}" salvo!`);
    } catch (err: any) {
      toast(err?.message || "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">{label}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-40"
        >
          <FiSave size={14} />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setDirty(true); }}
        placeholder={`Conteúdo do modelo "${label}"...`}
        rows={8}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm text-slate-700 font-mono"
      />
      {dirty && <p className="text-xs text-amber-500 mt-1">Alterações não salvas</p>}
    </div>
  );
}

export default function ModelosPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <FiBook size={18} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Modelos de Documentos</h1>
        </div>
        <p className="text-slate-500 text-sm mt-1">
          Configure os textos base para os documentos AET. Estes conteúdos serão inseridos automaticamente ao gerar uma nova AET.
        </p>
      </div>

      <div className="space-y-6">
        {TEMPLATE_TYPES.map((t) => (
          <TemplateEditor key={t.type} type={t.type} label={t.label} desc={t.desc} />
        ))}
      </div>
    </div>
  );
}
