"use client";
import { useMemo, useState } from "react";
import { collection, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Msg, Need, btn, btn2, inp } from "@/components/ui";
import { receiveDevice, recoverFiber } from "@/services/inventoryService";
import { ClientFiber, DeviceSerial, InventoryItem, StockTransaction, UserProfile } from "@/types/inventory";

const FIELD = ["ASSIGNED_CLIENT", "ASSIGNED_POP", "WITH_TECHNICIAN"] as const;
type FieldStatus = (typeof FIELD)[number];
const WHERE: Record<FieldStatus, { icon: string; label: string; cls: string }> = {
  ASSIGNED_CLIENT: { icon: "🏠", label: "At client", cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  ASSIGNED_POP: { icon: "📡", label: "At POP", cls: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
  WITH_TECHNICIAN: { icon: "👤", label: "With staff", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};
type Cond = "GOOD" | "FAULTY";
const card = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5";
const when = (d: DeviceSerial) => d.history[d.history.length - 1]?.at ?? 0;

function Stat({ icon, label, value, tone = "" }: { icon: string; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-xl dark:bg-teal-950/40">{icon}</div>
      <div><div className="text-xs text-slate-500">{label}</div><div className={`text-xl font-semibold ${tone}`}>{value}</div></div>
    </div>
  );
}

function RecoverRow({ f }: { f: ClientFiber }) {
  const { user } = useAuth(); const { msg, run } = useAction();
  const out = f.issued - f.recovered - f.lost;
  const [len, setLen] = useState(""); const [note, setNote] = useState("");
  const n = Number(len); const valid = len !== "" && n >= 0 && n <= out;
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><b>🏠 Client {f.client_id}</b> <span className="text-slate-500">· {f.item_name}</span></div>
        <div className="text-xs text-slate-500">Issued {f.issued} m · Recovered {f.recovered} m · Loss {f.lost} m · <b className="text-amber-600">Outstanding {out} m</b></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <input className={inp + " max-w-40"} type="number" min={0} max={out} placeholder="Got back (m)" value={len} onChange={e => setLen(e.target.value)} />
        <input className={inp + " max-w-64"} placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <button className={btn} disabled={!valid} onClick={() => user && run(() => recoverFiber(user, f.client_id, f.item_id, n, note), "Fiber received")}>Receive fiber</button>
      </div>
      {valid && <p className={n < out ? "text-amber-600" : "text-emerald-600"}>Back to stock: {n} m · Loss: {out - n} m</p>}
      {len !== "" && n > out && <p className="text-red-600">Cannot be more than {out} m.</p>}
      <Msg m={msg} />
    </div>
  );
}

export default function Returns() {
  const { user, can } = useAuth(); const { msg, run } = useAction();
  const serials = useQ<DeviceSerial>(() => collection(db, "serials"), "s");
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const users = useQ<UserProfile>(() => collection(db, "users"), "u");
  const fiber = useQ<ClientFiber>(() => collection(db, "client_fiber"), "cf");
  const ledgerOk = can("can_view_full_ledger");
  const tx = useQ<StockTransaction>(() => (ledgerOk ? query(collection(db, "transactions"), orderBy("at", "desc"), limit(200)) : null), ledgerOk ? "t" : "none");

  const [tab, setTab] = useState<"devices" | "fiber">("devices");
  const [q, setQ] = useState(""); const [filter, setFilter] = useState<"ALL" | FieldStatus>("ALL");
  const [sel, setSel] = useState<string[]>([]); const [cond, setCond] = useState<Record<string, Cond>>({}); const [note, setNote] = useState("");

  const itemName = (id: string) => items.find(i => i.id === id)?.name ?? id;
  const holder = (d: DeviceSerial) => d.status === "WITH_TECHNICIAN" ? (users.find(u => u.uid === d.holder_ref)?.name ?? "Staff") : (d.holder_ref ?? "—");

  const inField = useMemo(() => serials.filter(d => (FIELD as readonly string[]).includes(d.status)), [serials]);
  const count = (s: FieldStatus) => inField.filter(d => d.status === s).length;
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return inField.filter(d => (filter === "ALL" || d.status === filter) &&
      (!k || `${d.serial_number} ${d.mac_address ?? ""} ${holder(d)} ${itemName(d.item_id)}`.toLowerCase().includes(k))).sort((a, b) => when(b) - when(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inField, q, filter, users, items]);

  const toggle = (sn: string) => setSel(s => (s.includes(sn) ? s.filter(x => x !== sn) : [...s, sn]));
  const allSel = list.length > 0 && list.every(d => sel.includes(d.serial_number));
  const setC = (sn: string, c: Cond) => setCond(p => ({ ...p, [sn]: c }));

  const receive = () => {
    if (!user || !sel.length) return;
    run(async () => {
      for (const sn of sel) {
        const d = serials.find(x => x.serial_number === sn)!;
        await receiveDevice(user, sn, cond[sn] ?? "GOOD", holder(d), note);
      }
      setSel([]); setNote("");
    }, `${sel.length} device(s) received into store`);
  };

  const fiberOut = fiber.filter(f => f.issued - f.recovered - f.lost > 0);
  const fiberShown = fiberOut.filter(f => !q.trim() || f.client_id.toLowerCase().includes(q.trim().toLowerCase()));
  const totOut = fiberOut.reduce((a, f) => a + (f.issued - f.recovered - f.lost), 0);
  const totLoss = fiber.reduce((a, f) => a + f.lost, 0);
  const recent = tx.filter(t => t.type === "RETURN" && t.note?.startsWith("Received")).slice(0, 8);

  return (
    <Need p="can_manage_rma_returns">
      <div className="space-y-6">
        <div><h1 className="text-xl font-semibold">Receive from Field</h1>
          <p className="text-sm text-slate-500">Client disconnect, POP pull-out, or staff returning items. Everything you receive goes back to the store.</p></div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon="🏠" label="Devices at clients" value={count("ASSIGNED_CLIENT")} />
          <Stat icon="📡" label="Devices at POPs" value={count("ASSIGNED_POP")} />
          <Stat icon="👤" label="Devices with staff" value={count("WITH_TECHNICIAN")} />
          <Stat icon="🧵" label="Fiber out in field" value={`${totOut.toLocaleString("en-BD")} m`} tone="text-amber-600" />
        </div>

        <div className={card + " space-y-3"}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {([["devices", "📟 Devices"], ["fiber", "🧵 Fiber"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-1.5 text-sm transition ${tab === k ? "bg-white font-medium shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>{l}</button>
              ))}
            </div>
            <input className={inp + " sm:ml-auto sm:max-w-sm"} placeholder={tab === "devices" ? "Search client ID, serial, MAC, staff, item…" : "Search client ID…"} value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {tab === "devices" && (
            <div className="flex flex-wrap gap-1.5">
              {(["ALL", ...FIELD] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs transition ${filter === s ? "border-brand bg-brand text-white" : "border-slate-300 dark:border-slate-700"}`}>
                  {s === "ALL" ? `All in field (${inField.length})` : `${WHERE[s].icon} ${WHERE[s].label} (${count(s)})`}</button>
              ))}
            </div>
          )}
        </div>

        {tab === "devices" ? (
          <div className={card + " space-y-3"}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : list.map(d => d.serial_number))} /> Select all ({list.length})</label>
              <span className="text-xs text-slate-500">Good = back in stock, can be issued again · Faulty = goes to RMA</span>
            </div>
            {list.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{inField.length === 0 ? "No devices are out in the field." : "No devices match your search."}</p>}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map(d => {
                const w = WHERE[d.status as FieldStatus], c = cond[d.serial_number] ?? "GOOD";
                return (
                  <div key={d.serial_number} className="flex flex-wrap items-center gap-3 py-3">
                    <input type="checkbox" checked={sel.includes(d.serial_number)} onChange={() => toggle(d.serial_number)} />
                    <div className="min-w-[10rem] flex-1">
                      <div className="font-medium">{itemName(d.item_id)}</div>
                      <div className="text-xs text-slate-500">{d.serial_number}{d.mac_address ? ` · ${d.mac_address}` : ""}</div>
                    </div>
                    <div className="text-sm"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${w.cls}`}>{w.icon} {w.label}</span>
                      <div className="mt-0.5 text-xs text-slate-500"><b>{holder(d)}</b> · since {new Date(when(d)).toLocaleDateString()}</div></div>
                    <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
                      <button type="button" onClick={() => setC(d.serial_number, "GOOD")} className={`rounded-md px-2.5 py-1 ${c === "GOOD" ? "bg-emerald-600 text-white" : "text-slate-500"}`}>Good</button>
                      <button type="button" onClick={() => setC(d.serial_number, "FAULTY")} className={`rounded-md px-2.5 py-1 ${c === "FAULTY" ? "bg-red-600 text-white" : "text-slate-500"}`}>Faulty</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {sel.length > 0 && (
              <div className="sticky bottom-3 flex flex-wrap items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 p-3 shadow-lg dark:border-teal-900 dark:bg-teal-950">
                <b className="text-sm">{sel.length} selected</b>
                <input className={inp + " max-w-xs"} placeholder="Note (optional), e.g. client disconnected" value={note} onChange={e => setNote(e.target.value)} />
                <button className={btn} onClick={receive}>✓ Receive into store</button>
                <button className={btn2} onClick={() => setSel([])}>Clear</button>
              </div>
            )}
            <Msg m={msg} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Stat icon="📤" label="Total issued to clients" value={`${fiber.reduce((a, f) => a + f.issued, 0).toLocaleString("en-BD")} m`} />
              <Stat icon="📥" label="Total recovered" value={`${fiber.reduce((a, f) => a + f.recovered, 0).toLocaleString("en-BD")} m`} tone="text-emerald-600" />
              <Stat icon="📉" label="Total loss" value={`${totLoss.toLocaleString("en-BD")} m`} tone="text-red-600" />
            </div>
            <div className={card + " space-y-3"}>
              <h2 className="font-semibold">Fiber waiting to be received ({fiberShown.length})</h2>
              {fiberShown.length === 0 && <p className="text-sm text-slate-500">{fiberOut.length === 0 ? "No fiber is outstanding at any client." : "No client matches your search."}</p>}
              {fiberShown.map(f => <RecoverRow key={f.id ?? `${f.client_id}-${f.item_id}`} f={f} />)}
            </div>
          </div>
        )}

        {ledgerOk && (
          <div className={card + " space-y-2"}>
            <h2 className="font-semibold">Recently received</h2>
            {recent.length === 0 && <p className="text-sm text-slate-500">Nothing received yet.</p>}
            {recent.map(t => (
              <div key={t.id} className="flex flex-wrap items-center gap-x-3 border-t border-slate-100 py-2 text-sm dark:border-slate-800">
                <span className="text-xs text-slate-500">{new Date(t.at).toLocaleString()}</span>
                <b>{t.item_name}</b>{t.serials?.[0] && <span className="text-xs text-slate-500">{t.serials[0]}</span>}
                <span className="text-xs text-slate-600 dark:text-slate-300">{t.note}</span>
                <span className="ml-auto text-xs text-slate-500">by {t.by_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Need>
  );
}