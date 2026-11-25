"use client";
import { useEffect, useState } from "react";
import { onSnapshot, Query } from "firebase/firestore";

export function useQ<T>(make: () => Query | null, key: string) {
  const [d, setD] = useState<T[]>([]);
  useEffect(() => {
    const q = make(); if (!q) return;
    return onSnapshot(q, s => setD(s.docs.map(x => ({ id: x.id, ...(x.data() as object) }) as T)), () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return d;
}
export function useAction() {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, okText = "Done") => {
    setMsg(null);
    try { await fn(); setMsg({ ok: true, t: okText }); } catch (e: any) { setMsg({ ok: false, t: e?.message ?? "Failed" }); }
  };
  return { msg, run };
}
