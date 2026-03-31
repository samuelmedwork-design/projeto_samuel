"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { FiWifiOff, FiRefreshCw } from "react-icons/fi";

export default function ConnectionMonitor() {
  const [offline, setOffline] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const { error } = await supabase.from("companies").select("id", { count: "exact", head: true }).abortSignal(controller.signal);
      clearTimeout(timeout);
      setOffline(!!error);
    } catch {
      setOffline(true);
    }
  }, []);

  const retry = async () => {
    setRetrying(true);
    await checkConnection();
    setRetrying(false);
  };

  useEffect(() => {
    // Verifica a cada 30 segundos
    const interval = setInterval(checkConnection, 120000); // 2 minutos
    // Listeners de online/offline do navegador
    const goOffline = () => setOffline(true);
    const goOnline = () => checkConnection();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [checkConnection]);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
      <FiWifiOff size={16} />
      <span>Sem conexão com o servidor. Os dados podem não ser salvos.</span>
      <button
        onClick={retry}
        disabled={retrying}
        className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded hover:bg-white/30 transition-colors disabled:opacity-50"
      >
        <FiRefreshCw size={14} className={retrying ? "animate-spin" : ""} />
        {retrying ? "Verificando..." : "Tentar novamente"}
      </button>
    </div>
  );
}
