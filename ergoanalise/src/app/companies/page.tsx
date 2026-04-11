"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiPlus, FiChevronRight, FiSearch, FiTrash2, FiLoader, FiBriefcase } from "react-icons/fi";
import { useToast } from "@/components/Toast";
import ViewToggle, { ViewMode } from "@/components/ViewToggle";

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  let f = digits;
  if (digits.length > 2) f = digits.slice(0, 2) + "." + digits.slice(2);
  if (digits.length > 5) f = f.slice(0, 6) + "." + f.slice(6);
  if (digits.length > 8) f = f.slice(0, 10) + "/" + f.slice(10);
  if (digits.length > 12) f = f.slice(0, 15) + "-" + f.slice(15);
  return f;
}

function isValidCnpj(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (slice: string, w: number[]) => { const s = w.reduce((a, x, i) => a + parseInt(slice[i]) * x, 0); const r = s % 11; return r < 2 ? 0 : 11 - r; };
  if (parseInt(d[12]) !== calc(d, [5,4,3,2,9,8,7,6,5,4,3,2])) return false;
  if (parseInt(d[13]) !== calc(d, [6,5,4,3,2,9,8,7,6,5,4,3,2])) return false;
  return true;
}

function formatPhone(ddd: string): string {
  const d = ddd.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return ddd;
}

const emptyForm = () => ({
  nomeFantasia: "", razaoSocial: "", cnpj: "", endereco: "",
  cnaePrincipal: "", telefone: "", email: "", logoUrl: "",
});

export default function CompaniesPage() {
  const router = useRouter();
  const { companies, addCompany, deleteCompany } = useData();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [cnpjError, setCnpjError] = useState("");
  const [search, setSearch] = useState("");
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    setForm((f) => ({ ...f, cnpj: formatted }));
    setCnpjError("");
    // Auto-busca quando CNPJ completo
    if (formatted.replace(/\D/g, "").length === 14) {
      fetchCnpjData(formatted);
    }
  };

  const fetchCnpjData = async (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, "");
    if (!isValidCnpj(digits)) return;
    setFetchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) return;
      const data = await res.json();
      const endereco = [
        data.logradouro, data.numero,
        data.complemento, data.bairro,
        data.municipio && data.uf ? `${data.municipio}-${data.uf}` : "",
        data.cep ? `CEP ${data.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}` : "",
      ].filter(Boolean).join(", ");
      setForm((f) => ({
        ...f,
        razaoSocial: data.razao_social || f.razaoSocial,
        nomeFantasia: data.nome_fantasia || f.nomeFantasia,
        endereco: endereco || f.endereco,
        cnaePrincipal: data.cnae_fiscal_descricao ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}` : f.cnaePrincipal,
        telefone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : f.telefone,
        email: data.email || f.email,
      }));
    } catch {
      // API indisponível — ignora silenciosamente
    } finally {
      setFetchingCnpj(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCnpj(form.cnpj)) { setCnpjError("CNPJ inválido."); return; }
    const digits = form.cnpj.replace(/\D/g, "");
    if (companies.some((c) => c.cnpj.replace(/\D/g, "") === digits)) {
      setCnpjError("Já existe uma empresa com este CNPJ."); return;
    }
    setSubmitting(true);
    try {
      await addCompany({
        name: form.nomeFantasia || form.razaoSocial,
        cnpj: form.cnpj,
        city: form.endereco.split(",").find((p) => p.includes("-"))?.trim().split("-")[0]?.trim() || "",
        razaoSocial: form.razaoSocial,
        endereco: form.endereco,
        cnaePrincipal: form.cnaePrincipal,
        telefone: form.telefone,
        email: form.email,
        logoUrl: form.logoUrl,
      });
      toast("Empresa criada com sucesso!");
      setForm(emptyForm());
      setCnpjError("");
      setShowModal(false);
    } catch (err: any) {
      toast(err?.message || "Erro ao criar empresa.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.razaoSocial || "").toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empresas</h1>
          <p className="text-slate-500 text-sm mt-1">{companies.length} empresas cadastradas</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm">
            <FiPlus size={18} /> Nova Empresa
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Buscar por nome ou CNPJ..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiSearch size={40} className="mx-auto mb-3 opacity-50" />
          <p>Nenhuma empresa encontrada.</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome Fantasia / Razão Social</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CNPJ</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Endereço</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/companies/${c.id}/structure`)}
                  className="border-b border-slate-100 hover:bg-emerald-50 cursor-pointer transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{c.name}</p>
                    {c.razaoSocial && <p className="text-xs text-slate-400 mt-0.5">{c.razaoSocial}</p>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{c.cnpj}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm hidden md:table-cell truncate max-w-[200px]">{c.endereco || c.city}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${c.name}" e todos os seus dados?`)) deleteCompany(c.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Excluir">
                        <FiTrash2 size={15} />
                      </button>
                      <FiChevronRight className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/companies/${c.id}/structure`)}
              className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors shrink-0">
                  <FiBriefcase size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${c.name}" e todos os seus dados?`)) deleteCompany(c.id); }}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Excluir"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
              <p className="font-semibold text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">{c.name}</p>
              {c.razaoSocial && <p className="text-xs text-slate-400 mt-0.5 truncate">{c.razaoSocial}</p>}
              <p className="text-xs text-slate-500 mt-2">{c.cnpj}</p>
              {(c.endereco || c.city) && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{c.endereco || c.city}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]">
            <div className="px-8 pt-8 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Nova Empresa</h2>
              <p className="text-sm text-slate-500 mt-1">Digite o CNPJ para preencher automaticamente os dados.</p>
            </div>

            <div className="overflow-y-auto px-8 py-6 space-y-4 flex-1">
              {/* CNPJ */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input required value={form.cnpj} onChange={handleCnpjChange} placeholder="00.000.000/0000-00" maxLength={18}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition pr-10 ${cnpjError ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:ring-emerald-500"}`} />
                  {fetchingCnpj && <FiLoader className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" size={16} />}
                </div>
                {cnpjError && <p className="text-red-500 text-xs mt-1">{cnpjError}</p>}
                {fetchingCnpj && <p className="text-emerald-600 text-xs mt-1">Buscando dados do CNPJ...</p>}
              </div>

              {/* Razão Social + Nome Fantasia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social <span className="text-red-500">*</span></label>
                  <input required value={form.razaoSocial} onChange={set("razaoSocial")}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
                  <input value={form.nomeFantasia} onChange={set("nomeFantasia")}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                <input value={form.endereco} onChange={set("endereco")} placeholder="Rua, número, bairro, cidade-UF, CEP"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              {/* CNAE + Telefone + Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CNAE Principal</label>
                  <input value={form.cnaePrincipal} onChange={set("cnaePrincipal")}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input value={form.telefone} onChange={set("telefone")} placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input type="email" value={form.email} onChange={set("email")}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL da Logo</label>
                  <input type="url" value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 pt-4 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm()); setCnpjError(""); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50">
                {submitting ? "Criando..." : "Criar Empresa"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
