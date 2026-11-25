"use client";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Msg, btn } from "@/components/ui";
import { CATALOG, DEFAULT_PERMS } from "@/lib/catalog";
import { InventoryItem, PERMISSION_KEYS, Role } from "@/types/inventory";

const ROLES: Role[] = ["admin", "manager", "noc", "support", "technician"];
export default function Permissions() {
  const { user } = useAuth(); const { msg, run } = useAction();
  const settings = useQ<any>(() => collection(db, "settings"), "s");
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const cur = settings.find(s => s.id === "role_permissions") ?? DEFAULT_PERMS;
  const isAdmin = user?.role === "admin";
  const toggle = (r: Role, k: string, v: boolean) =>
    run(() => setDoc(doc(db, "settings", "role_permissions"), { [r]: { ...(cur[r] ?? DEFAULT_PERMS[r]), [k]: v } }, { merge: true }), "Saved");
  const seedPerms = () => run(() => setDoc(doc(db, "settings", "role_permissions"), DEFAULT_PERMS), "Default permissions saved");
  const seedItems = () => run(async () => {
    const have = new Set(items.map(i => i.name)); const b = writeBatch(db); let n = 0;
    for (const [name, category, unit, tracking, min_stock] of CATALOG) {
      if (have.has(name)) continue; const ref = doc(collection(db, "items"));
      b.set(ref, { id: ref.id, name, brand_model: "", category, unit, tracking, min_stock, current_stock: 0, avg_unit_cost: 0 }); n++;
    }
    await b.commit(); if (!n) throw new Error("Catalog already seeded");
  }, "Catalog seeded");
  return (<div className="space-y-6">
    <Card title="Access & Permissions Matrix">
      {!isAdmin && <p className="text-sm text-slate-500">View only. Only admin can change permissions.</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-1">Permission</th>{ROLES.map(r => <th key={r} className="capitalize px-2">{r}</th>)}</tr></thead>
        <tbody>{PERMISSION_KEYS.map(k => <tr key={k} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2 font-mono text-xs">{k}</td>
          {ROLES.map(r => <td key={r} className="px-2"><input type="checkbox" checked={r === "admin" ? true : !!cur[r]?.[k]} disabled={!isAdmin || r === "admin"} onChange={e => toggle(r, k, e.target.checked)} /></td>)}</tr>)}</tbody></table></div>
      <Msg m={msg} />
    </Card>
    {isAdmin && <Card title="Setup tools"><div className="flex flex-wrap gap-2">
      <button className={btn} onClick={seedPerms}>Save default permissions</button>
      <button className={btn} onClick={seedItems}>Seed ISP item catalog</button></div></Card>}
  </div>);
}
