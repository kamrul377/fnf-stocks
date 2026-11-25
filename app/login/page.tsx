"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try { await signInWithEmailAndPassword(auth, email, pw); r.replace("/"); }
    catch { setErr("Invalid email or password."); } finally { setBusy(false); }
  }
  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-8 shadow-xl space-y-4">
        <h1 className="text-xl font-semibold text-[#0f3822] dark:text-teal-300">FnF Stock</h1>
        <input className="w-full rounded-lg border px-3 py-2 dark:bg-slate-800" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full rounded-lg border px-3 py-2 dark:bg-slate-800" type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} required />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-[#0d9488] hover:bg-teal-700 transition text-white py-2 font-medium disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
