"use client";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ } from "@/lib/hooks";
import { useAuth } from "./AuthProvider";
import { DeviceSerial, Drum, InventoryItem, PermissionKey } from "@/types/inventory";
import { IssueLine } from "@/services/inventoryService";

export const inp = "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm";
export const btn = "rounded-lg bg-brand hover:bg-teal-700 transition text-white px-4 py-2 text-sm font-medium disabled:opacity-50";
export const btn2 = "rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800";
export const taka = (n: number) => "৳" + Math.round(n).toLocaleString("en-BD");

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (<section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
    {title && <h2 className="font-semibold">{title}</h2>}{children}</section>);
}
export function Msg({ m }: { m: { ok: boolean; t: string } | null }) {
  return m ? <p className={`text-sm ${m.ok ? "text-emerald-600" : "text-red-600"}`}>{m.t}</p> : null;
}
export function Need({ p, children }: { p: PermissionKey; children: React.ReactNode }) {
  const { can } = useAuth();
  return can(p) ? <>{children}</> : <p className="text-slate-500">You do not have access to this page.</p>;
}
export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (<div className="overflow-x-auto"><table className="w-full text-sm">
    <thead><tr className="text-left text-slate-500">{head.map(h => <th key={h} className="py-1 pr-3">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-100 dark:border-slate-800">{r.map((c, j) => <td key={j} className="py-2 pr-3 align-top">{c}</td>)}</tr>)}</tbody>
  </table></div>);
}
export function DeleteBtn({ onDelete, label = "Delete" }: { onDelete: () => Promise<unknown>; label?: string }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return null;
  return <button className="text-red-600 text-xs hover:underline" onClick={async () => {
    if (!confirm("Delete permanently? This cannot be undone.")) return;
    try { await onDelete(); } catch (e: any) { alert(e?.message ?? "Delete failed"); }
  }}>{label}</button>;
}



/** Pick serials (SERIALIZED) or a drum (LENGTH_BASED); qty input for the rest. */
export function LinePicker({ item, value, onChange }: { item: InventoryItem; value: IssueLine; onChange: (l: IssueLine) => void }) {
  const serials = useQ<DeviceSerial>(() => item.tracking === "SERIALIZED" ? query(collection(db, "serials"), where("item_id", "==", item.id)) : null, item.id);
  const drums = useQ<Drum>(() => item.tracking === "LENGTH_BASED" ? query(collection(db, "drums"), where("item_id", "==", item.id)) : null, item.id);
  if (item.tracking === "SERIALIZED") {
    const avail = serials.filter(s => ["IN_STOCK", "RETURNED_USED"].includes(s.status));
    const sel = value.serials ?? [];
    const toggle = (sn: string) => { const n = sel.includes(sn) ? sel.filter(x => x !== sn) : [...sel, sn]; onChange({ ...value, serials: n, qty: n.length }); };
    return (<div className="max-h-40 overflow-auto rounded-lg border p-2 text-sm space-y-1">
      {avail.length === 0 && <p className="text-slate-500">No units in stock.</p>}
      {avail.map(s => <label key={s.serial_number} className="flex gap-2"><input type="checkbox" checked={sel.includes(s.serial_number)} onChange={() => toggle(s.serial_number)} />{s.serial_number}{s.mac_address ? ` · ${s.mac_address}` : ""}</label>)}
      <p className="text-xs text-slate-500">Selected: {sel.length}</p></div>);
  }
  return (<div className="grid grid-cols-2 gap-2">
    {item.tracking === "LENGTH_BASED" && (
      <select className={inp} value={value.drum_id ?? ""} onChange={e => onChange({ ...value, drum_id: e.target.value })}>
        <option value="">Select drum</option>
        {drums.filter(d => d.remaining_length > 0).map(d => <option key={d.id} value={d.id}>{d.id} ({d.remaining_length} m left)</option>)}
      </select>)}
    <input className={inp} type="number" min={1} placeholder={item.tracking === "LENGTH_BASED" ? "Length (m)" : "Qty"} value={value.qty || ""} onChange={e => onChange({ ...value, qty: Number(e.target.value) })} />
  </div>);
}
