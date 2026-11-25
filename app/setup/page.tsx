"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { bootstrapAdmin } from "@/services/userService";

export default function Setup() {
  const r = useRouter(); const [f, setF] = useState({ name: "", email: "", password: "" }); const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await bootstrapAdmin(f.email, f.password, f.name); r.replace("/"); } catch (x: any) { setErr(x.message); }
  }
  const cls = "w-full rounded-lg border px-3 py-2 dark:bg-slate-800";
  return (
    <main className="min-h-screen grid place-items-center p-4">
      <form onSubmit={go} className="w-full max-w-sm rounded-2xl border bg-white dark:bg-slate-900 p-8 space-y-4">
        <h1 className="text-xl font-semibold text-brand-dark dark:text-teal-300">First Admin Setup</h1>
        <p className="text-sm text-slate-500">Works only once, when no admin exists.</p>
        <input className={cls} placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />
        <input className={cls} type="email" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
        <input className={cls} type="password" minLength={6} placeholder="Password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="w-full rounded-lg bg-brand text-white py-2">Create Admin</button>
      </form>
    </main>
  );
}
