"use client";
import { FiGrid, FiList } from "react-icons/fi";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
      <button
        onClick={() => onChange("grid")}
        title="Visualização em grade"
        className={`p-1.5 rounded-md transition-colors ${
          mode === "grid"
            ? "bg-white text-slate-700 shadow-sm"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <FiGrid size={15} />
      </button>
      <button
        onClick={() => onChange("list")}
        title="Visualização em lista"
        className={`p-1.5 rounded-md transition-colors ${
          mode === "list"
            ? "bg-white text-slate-700 shadow-sm"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <FiList size={15} />
      </button>
    </div>
  );
}
