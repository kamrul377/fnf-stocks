"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { PermissionKey, UserProfile } from "@/types/inventory";

type Ctx = { user: UserProfile | null; perms: Record<PermissionKey, boolean> | undefined; loading: boolean;
  can: (p: PermissionKey) => boolean };
const C = createContext<Ctx>({ user: null, perms: undefined, loading: true, can: () => false });
export const useAuth = () => useContext(C);
const PUBLIC = ["/login", "/setup"];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [allPerms, setAllPerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const path = usePathname(); const router = useRouter();

  useEffect(() => {
    let unsubProfile = () => {};
    const unsub = onAuthStateChanged(auth, u => {
      unsubProfile();
      if (!u) { setUser(null); setLoading(false); return; }
      unsubProfile = onSnapshot(doc(db, "users", u.uid), s => {
        setUser(s.exists() ? (s.data() as UserProfile) : null); setLoading(false);
      }, () => setLoading(false));
    });
    return () => { unsub(); unsubProfile(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "settings", "role_permissions"), s => setAllPerms(s.exists() ? s.data() : null), () => {});
  }, [user]);

  useEffect(() => {
    if (!loading && !user && !PUBLIC.includes(path)) router.replace("/login");
  }, [loading, user, path, router]);

  const perms = user && allPerms ? allPerms[user.role] : undefined;
  const can = (p: PermissionKey) => !!user && (user.role === "admin" || !!perms?.[p]);
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>;
  if (!user && !PUBLIC.includes(path)) return null;
  return <C.Provider value={{ user, perms, loading, can }}>{children}</C.Provider>;
}
