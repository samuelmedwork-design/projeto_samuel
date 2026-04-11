"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import {
  FiHome, FiClipboard, FiActivity, FiFileText, FiLogOut, FiUser,
  FiGrid, FiList, FiMenu, FiX, FiBarChart2, FiChevronLeft, FiChevronRight, FiUsers,
  FiChevronDown, FiChevronUp, FiFolder,
} from "react-icons/fi";

const standaloneLinks = [
  { href: "/dashboard", label: "Dashboard", icon: FiBarChart2 },
  { href: "/assessments", label: "Avaliações", icon: FiClipboard },
];

const cadastroLinks = [
  { href: "/companies", label: "Empresas", icon: FiHome },
  { href: "/avaliadores", label: "Avaliadores", icon: FiUsers },
  { href: "/blocks", label: "Blocos", icon: FiGrid },
  { href: "/checklist-templates", label: "Checklists", icon: FiList },
  { href: "/anthropometry", label: "Antropometria", icon: FiActivity },
];

const bottomLinks = [
  { href: "/reports", label: "Relatórios", icon: FiFileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isCadastroActive = cadastroLinks.some(
    (l) => pathname === l.href || pathname.startsWith(l.href)
  );
  const [cadastroOpen, setCadastroOpen] = useState(isCadastroActive);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
        setMobileOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Auto-open cadastros group when navigating to a cadastro page
  useEffect(() => {
    if (isCadastroActive) setCadastroOpen(true);
  }, [isCadastroActive]);

  if (!user) return null;

  const sidebarWidth = collapsed ? "w-16" : "w-64";

  const renderLink = (l: { href: string; label: string; icon: React.ElementType }) => {
    const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
    return (
      <Link
        key={l.href}
        href={l.href}
        title={collapsed ? l.label : undefined}
        className={`flex items-center gap-3 rounded-lg text-sm transition-colors ${
          collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"
        } ${
          active
            ? "bg-emerald-600 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
      >
        <l.icon size={18} className="shrink-0" />
        {!collapsed && <span>{l.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Botão hamburger mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg"
      >
        <FiMenu size={20} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        ${sidebarWidth} bg-slate-900 text-white flex flex-col min-h-screen shrink-0 transition-all duration-200
        fixed md:relative z-50
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Header */}
        <div className={`border-b border-slate-700 ${collapsed ? "p-2" : "p-3"}`}>
          <div className={`bg-white rounded-lg flex items-center justify-center ${collapsed ? "p-1.5" : "px-2 py-2 w-full"}`}>
            <img
              src={collapsed ? "/logo-vertical.png" : "/logo-horizontal.png"}
              alt="ErgoAnálise"
              className={collapsed ? "h-8 w-auto" : "w-full h-auto"}
            />
          </div>
          {!collapsed && (
            <p className="text-xs text-slate-400 text-center mt-1.5">Sistema de AET</p>
          )}
          {/* Fechar no mobile */}
          {mobileOpen && (
            <div className="flex justify-end mt-1">
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white md:hidden">
                <FiX size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {/* Links standalone do topo */}
          {standaloneLinks.map(renderLink)}

          {/* Separador */}
          {!collapsed && (
            <div className="pt-2 pb-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Cadastros</p>
            </div>
          )}
          {collapsed && <div className="border-t border-slate-700 my-2" />}

          {/* Grupo Cadastros */}
          {collapsed ? (
            // No modo colapsado, mostra os ícones diretamente sem agrupamento
            cadastroLinks.map(renderLink)
          ) : (
            <div>
              <button
                onClick={() => setCadastroOpen((o) => !o)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isCadastroActive && !cadastroOpen
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <FiFolder size={18} className="shrink-0" />
                <span className="flex-1 text-left">Cadastros</span>
                {cadastroOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </button>

              {cadastroOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-2">
                  {cadastroLinks.map((l) => {
                    const active = pathname === l.href || pathname.startsWith(l.href);
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`flex items-center gap-3 rounded-lg text-sm transition-colors px-3 py-2 ${
                          active
                            ? "bg-emerald-600 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <l.icon size={16} className="shrink-0" />
                        <span>{l.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Separador */}
          {!collapsed && <div className="border-t border-slate-700 my-2" />}

          {/* Links do rodapé */}
          {bottomLinks.map(renderLink)}
        </nav>

        {/* User + Toggle */}
        <div className={`border-t border-slate-700 ${collapsed ? "p-2" : "p-4"}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3 px-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <FiUser size={14} />
                </div>
                <div className="text-sm min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full mb-3"
              >
                <FiLogOut size={16} />
                Sair
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                <FiUser size={14} />
              </div>
              <button onClick={logout} title="Sair" className="text-slate-400 hover:text-red-400 transition-colors">
                <FiLogOut size={16} />
              </button>
            </div>
          )}

          {/* Botão de expandir/recolher */}
          <div className={`flex ${collapsed ? "justify-center" : "justify-end"}`}>
            <button
              onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
              className="hidden md:flex w-8 h-8 rounded-full border border-slate-600 items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
