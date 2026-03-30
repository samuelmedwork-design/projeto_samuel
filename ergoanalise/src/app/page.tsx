"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Se já está logado, redireciona
  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        router.push("/dashboard");
      } else {
        setError("E-mail ou senha incorretos.");
        setSubmitting(false);
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
      setSubmitting(false);
    }
  };

  // Se já logado, não mostra a tela de login
  if (user) return null;

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 min-h-screen">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <img src="/logo-vertical.png" alt="ErgoAnálise" className="h-32 w-auto" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white">
            <span className="text-emerald-400">Ergo</span>Análise
          </h1>
          <p className="text-slate-400 mt-2">Sistema de Análise Ergonômica do Trabalho</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-slate-800">Entrar</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition disabled:opacity-50"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition disabled:opacity-50"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {submitting ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Não tem conta?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="text-emerald-600 font-medium hover:underline"
            >
              Criar conta
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
