"use client";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiPlus, FiCopy, FiCheck, FiLink, FiLayers, FiUpload, FiFileText, FiEdit2, FiUsers, FiClipboard } from "react-icons/fi";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export default function StructurePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { companies, sectors, positions, surveys, addSector, addPosition, updateCompany } = useData();
  const company = companies.find((c) => c.id === id);

  const [sectorName, setSectorName] = useState("");
  const [posName, setPosName] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [copied, setCopied] = useState(false);

  // Edição de dados da empresa
  const [editingCompany, setEditingCompany] = useState(false);
  const [editName, setEditName] = useState(company?.name || "");
  const [editCnpj, setEditCnpj] = useState(company?.cnpj || "");
  const [editCity, setEditCity] = useState(company?.city || "");

  const openEditCompany = () => {
    if (!company) return;
    setEditName(company.name);
    setEditCnpj(company.cnpj);
    setEditCity(company.city);
    setEditingCompany(true);
  };

  const saveCompanyEdit = async () => {
    if (!editName.trim() || !editCnpj.trim() || !editCity.trim()) return;
    await updateCompany(id, { name: editName.trim(), cnpj: editCnpj.trim(), city: editCity.trim() });
    setEditingCompany(false);
  };

  // Import Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ sectors: number; positions: number } | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  const companySectors = sectors.filter((s) => s.companyId === id);
  const sectorPositions = (sid: string) => positions.filter((p) => p.sectorId === sid);

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorName.trim()) return;
    await addSector({ companyId: id, name: sectorName.trim() });
    setSectorName("");
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posName.trim() || !selectedSector) return;
    await addPosition({ companyId: id, sectorId: selectedSector, name: posName.trim() });
    setPosName("");
  };

  // Gera link com dados embarcados para funcionar sem autenticação
  const generateSurveyLink = () => {
    if (typeof window === "undefined") return "";
    const companyData = {
      id,
      name: company?.name || "",
      sectors: companySectors.map((s) => ({
        id: s.id,
        name: s.name,
        positions: positions.filter((p) => p.sectorId === s.id).map((p) => ({ id: p.id, name: p.name })),
      })),
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(companyData))));
    return `${window.location.origin}/survey/${id}?d=${encoded}`;
  };

  const surveyLink = generateSurveyLink();

  const copyLink = () => {
    const freshLink = generateSurveyLink();
    navigator.clipboard.writeText(freshLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Importação Excel ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportResult(null);
    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: (string | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Pula a primeira linha se for cabeçalho
        let dataRows = rows;
        if (dataRows.length > 0) {
          const first = (dataRows[0][0] || "").toString().toLowerCase().trim();
          if (first === "setor" || first === "sector" || first === "departamento") {
            dataRows = dataRows.slice(1);
          }
        }

        // Filtra linhas vazias
        dataRows = dataRows.filter((row) => row[0] && row[1] && String(row[0]).trim() && String(row[1]).trim());

        if (dataRows.length === 0) {
          setImportError("Planilha vazia ou formato inválido. Use: Coluna A = Setor, Coluna B = Cargo.");
          setImporting(false);
          return;
        }

        // Mapeia setores existentes (para não duplicar)
        const existingSectors = new Map(
          sectors.filter((s) => s.companyId === id).map((s) => [s.name.toLowerCase().trim(), s.id])
        );

        let newSectorsCount = 0;
        let newPositionsCount = 0;

        // Processa cada linha
        for (const row of dataRows) {
          const sectorNameRaw = String(row[0]).trim();
          const positionNameRaw = String(row[1]).trim();
          if (!sectorNameRaw || !positionNameRaw) continue;

          const sectorKey = sectorNameRaw.toLowerCase();

          // Cria setor se não existir
          let sectorId = existingSectors.get(sectorKey);
          if (!sectorId) {
            const newSector = await addSector({ companyId: id, name: sectorNameRaw });
            sectorId = newSector.id;
            existingSectors.set(sectorKey, sectorId);
            newSectorsCount++;
          }

          // Cria cargo (cargos com mesmo nome em setores distintos são permitidos)
          await addPosition({ companyId: id, sectorId, name: positionNameRaw });
          newPositionsCount++;
        }

        setImportResult({ sectors: newSectorsCount, positions: newPositionsCount });
      } catch {
        setImportError("Erro ao ler a planilha. Verifique se o arquivo está no formato .xlsx ou .xls.");
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);

    // Reset input para permitir reimportação do mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  return (
    <div className="p-8 max-w-5xl">
      {/* Dados da empresa */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{company.cnpj} - {company.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/companies/${id}/surveys`)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors font-medium">
            <FiClipboard size={14} />
            Questionários ({surveys.filter((s) => s.companyId === id).length})
          </button>
          <button onClick={() => router.push(`/companies/${id}/workers`)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors font-medium">
            <FiUsers size={14} />
            Funcionários
          </button>
          <button onClick={openEditCompany}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <FiEdit2 size={14} />
            Editar dados
          </button>
        </div>
      </div>

      {/* Modal edição da empresa */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Editar Empresa</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
              <input value={editCnpj} onChange={(e) => setEditCnpj(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
              <input value={editCity} onChange={(e) => setEditCity(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingCompany(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={saveCompanyEdit}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link do questionário */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FiLink className="text-emerald-600" />
          <h3 className="font-semibold text-emerald-800 text-sm">Link do Questionário</h3>
        </div>
        <div className="flex gap-2">
          <input
            readOnly
            value={surveyLink}
            className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm text-slate-600"
          />
          <button onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
            {copied ? <FiCheck /> : <FiCopy />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      {/* ── Importação via Excel ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FiFileText className="text-blue-600" />
          <h3 className="font-semibold text-blue-800 text-sm">Importar Setores e Cargos via Planilha</h3>
        </div>
        <p className="text-xs text-blue-600 mb-3">
          Envie uma planilha Excel (.xlsx / .xls) com duas colunas: <strong>Coluna A = Setor</strong> e <strong>Coluna B = Cargo</strong>.
          Setores repetidos serão criados apenas uma vez. Cargos com mesmo nome em setores distintos serão mantidos separados.
        </p>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <FiUpload size={16} />
            {importing ? "Importando..." : "Selecionar Planilha"}
          </button>

          {/* Botão download modelo */}
          <button
            onClick={() => {
              const ws = XLSX.utils.aoa_to_sheet([
                ["Setor", "Cargo"],
                ["Administrativo", "Auxiliar Administrativo"],
                ["Administrativo", "Recepcionista"],
                ["Operacional", "Operador de Máquinas"],
                ["Operacional", "Auxiliar de Produção"],
                ["TI", "Desenvolvedor"],
              ]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Setores e Cargos");
              XLSX.writeFile(wb, "modelo_setores_cargos.xlsx");
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <FiFileText size={16} />
            Baixar Modelo
          </button>
        </div>

        {importError && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            {importError}
          </div>
        )}
        {importResult && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
            <FiCheck />
            Importação concluída: <strong>{importResult.sectors}</strong> setor(es) novo(s) e <strong>{importResult.positions}</strong> cargo(s) criado(s).
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Setores */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FiLayers className="text-emerald-600" /> Setores ({companySectors.length})
          </h2>
          <form onSubmit={handleAddSector} className="flex gap-2 mb-4">
            <input
              value={sectorName}
              onChange={(e) => setSectorName(e.target.value)}
              placeholder="Nome do setor"
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button type="submit" className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <FiPlus size={18} />
            </button>
          </form>
          <div className="space-y-2">
            {companySectors.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">Nenhum setor cadastrado.</p>
            ) : (
              companySectors.map((s) => (
                <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{sectorPositions(s.id).length} cargo(s)</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cargos */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Cargos</h2>
          <form onSubmit={handleAddPosition} className="space-y-2 mb-4">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Selecione o setor</option>
              {companySectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                value={posName}
                onChange={(e) => setPosName(e.target.value)}
                placeholder="Nome do cargo"
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button type="submit" className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <FiPlus size={18} />
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {companySectors.map((s) =>
              sectorPositions(s.id).map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-1">Setor: {s.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
