"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { visibleNav } from "@/lib/nav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, perms } = useAuth(); const path = usePathname();
  const [open, setOpen] = useState(false); const [dark, setDark] = useState(false);
  useEffect(() => { setDark(localStorage.getItem("theme") === "dark"); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("theme", dark ? "dark" : "light"); }, [dark]);
  if (!user) return <>{children}</>;
  const nav = visibleNav(user.role, perms);
  return (
    <div className="min-h-screen md:flex">
      <aside className={`${open ? "block" : "hidden"} md:block w-full md:w-64 shrink-0 bg-brand-dark text-white p-4 space-y-1`}>
        <div className="font-semibold text-lg mb-4">FnF Stocks</div>
        {nav.map(n => (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2 text-sm transition ${path === n.href ? "bg-brand" : "hover:bg-white/10"}`}>{n.label}</Link>
        ))}
      </aside>
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur sticky top-0">
          <button className="md:hidden rounded-full border px-3 py-1" onClick={() => setOpen(o => !o)}>☰</button>
          <div className="flex-1" />
          <span className="text-sm text-slate-500">{user.name} · <b className="uppercase">{user.role}</b></span>
          <button className="rounded-full border px-3 py-1 text-sm" onClick={() => setDark(d => !d)}>{dark ? "☀" : "🌙"}</button>
          <button className="rounded-full bg-brand text-white px-3 py-1 text-sm" onClick={() => signOut(auth)}>Logout</button>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
