"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiPlus, FiChevronRight, FiSearch, FiTrash2 } from "react-icons/fi";

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  let formatted = digits;
  if (digits.length > 2) formatted = digits.slice(0, 2) + "." + digits.slice(2);
  if (digits.length > 5) formatted = formatted.slice(0, 6) + "." + formatted.slice(6);
  if (digits.length > 8) formatted = formatted.slice(0, 10) + "/" + formatted.slice(10);
  if (digits.length > 12) formatted = formatted.slice(0, 15) + "-" + formatted.slice(15);
  return formatted;
}

function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (slice: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(slice[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calc(digits, w1);
  if (parseInt(digits[12]) !== d1) return false;
  const d2 = calc(digits, w2);
  if (parseInt(digits[13]) !== d2) return false;

  return true;
}

export default function CompaniesPage() {
  const router = useRouter();
  const { companies, addCompany, deleteCompany } = useData();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [city, setCity] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  const [search, setSearch] = useState("");

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search) ||
      c.city.toLowerCase().includes(search.toLowerCase())
  );

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    setCnpj(formatted);
    setCnpjError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCnpj(cnpj)) {
      setCnpjError("CNPJ inválido. Use o formato: 24.763.245/0001-25");
      return;
    }
    const cnpjDigits = cnpj.replace(/\D/g, "");
    const exists = companies.some((c) => c.cnpj.replace(/\D/g, "") === cnpjDigits);
    if (exists) {
      setCnpjError("Já existe uma empresa cadastrada com este CNPJ.");
      return;
    }
    await addCompany({ name, cnpj, city });
    setName(""); setCnpj(""); setCity(""); setCnpjError("");
    setShowModal(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setName(""); setCnpj(""); setCity(""); setCnpjError("");
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empresas</h1>
          <p className="text-slate-500 text-sm mt-1">{companies.length} empresas cadastradas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          <FiPlus size={18} />
          Nova Empresa
        </button>
      </div>

      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CNPJ</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cidade</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/companies/${c.id}/structure`)}
                  className="border-b border-slate-100 hover:bg-emerald-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-800">{c.name}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{c.cnpj}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{c.city}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir a empresa "${c.name}" e todos os seus dados (setores, cargos, questionários, avaliações, ações)? Esta ação não pode ser desfeita.`)) {
                            deleteCompany(c.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir empresa"
                      >
                        <FiTrash2 size={15} />
                      </button>
                      <FiChevronRight className="text-slate-400" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Nova Empresa</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
              <input
                required
                value={cnpj}
                onChange={handleCnpjChange}
                placeholder="24.763.245/0001-25"
                maxLength={18}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition ${
                  cnpjError ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:ring-emerald-500"
                }`}
              />
              {cnpjError && <p className="text-red-500 text-xs mt-1">{cnpjError}</p>}
              <p className="text-slate-400 text-xs mt-1">Formato: 00.000.000/0000-00</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
              <input required value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
