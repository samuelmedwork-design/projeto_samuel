"use client";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiArrowLeft } from "react-icons/fi";
import GseManager from "@/components/GseManager";

export default function GsePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { companies } = useData();
  const company = companies.find((c) => c.id === id);

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <button
          onClick={() => router.push(`/companies/${id}/structure`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-2"
        >
          <FiArrowLeft size={14} /> Voltar à estrutura
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
        <p className="text-slate-500 text-sm mt-1">Grupos Similares de Exposição (GSE)</p>
      </div>
      <GseManager companyId={id} />
    </div>
  );
}
