"use client";
import { useMemo, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, LinePicker, Msg, Need, btn, inp } from "@/components/ui";
import { directWithdraw, IssueLine } from "@/services/inventoryService";
import { DeviceStatus, InventoryItem, UserProfile } from "@/types/inventory";

const TARGETS: { key: "Client" | "POP" | "Staff"; icon: string; title: string; hint: string; status: DeviceStatus }[] = [
  { key: "Client", icon: "🏠", title: "Client", hint: "Install at a customer", status: "ASSIGNED_CLIENT" },
  { key: "POP", icon: "📡", title: "POP", hint: "Send to a POP / node", status: "ASSIGNED_POP" },
  { key: "Staff", icon: "👤", title: "Staff member", hint: "Give to support / technician", status: "WITH_TECHNICIAN" },
];
const lbl = "text-xs font-medium text-slate-500 mb-1 block";
const stockBadge = (i: InventoryItem) =>
  i.current_stock <= 0 ? { t: "Out of stock", c: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" }
  : i.current_stock <= i.min_stock ? { t: `Low · ${i.current_stock} ${i.unit}`, c: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" }
  : { t: `${i.current_stock.toLocaleString("en-BD")} ${i.unit} available`, c: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };

export default function Withdraw() {
  const { user } = useAuth(); const { msg, run } = useAction();
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const users = useQ<UserProfile>(() => collection(db, "users"), "u");

  const [id, setId] = useState(""); const [target, setTarget] = useState<"Client" | "POP" | "Staff">("Client");
  const [ref, setRef] = useState(""); const [staffId, setStaffId] = useState(""); const [note, setNote] = useState("");
  const [line, setLine] = useState<IssueLine>({ item_id: "", qty: 0 });

  const item = items.find(i => i.id === id);
  const T = TARGETS.find(t => t.key === target)!;
  const staff = useMemo(() => users.filter(u => u.active && ["support", "technician"].includes(u.role)).sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const person = staff.find(u => u.uid === staffId);
  const reference = target === "Staff" ? staffId : ref.trim();
  const ready = !!item && !!reference && line.qty > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !item || !ready) return;
    const text = target === "Staff"
      ? `Assigned to ${person?.name} (${person?.role}) by ${user.name}${note ? `. ${note}` : ""}`
      : note;
    run(async () => {
      await directWithdraw(user, [{ ...line, item_id: item.id }], { status: T.status, reference, note: text || undefined });
      setLine({ item_id: item.id, qty: 0 }); setNote(""); if (target !== "Staff") setRef("");
    }, target === "Staff" ? `Assigned to ${person?.name}. It will show in their "My Handover Stock".` : "Issued successfully");
  };

  return (
    <Need p="can_direct_withdraw">
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="1 · Who is it for?">
            <div className="grid gap-2 sm:grid-cols-3">
              {TARGETS.map(t => (
                <button type="button" key={t.key} onClick={() => { setTarget(t.key); setRef(""); setStaffId(""); }}
                  className={`text-left rounded-xl border p-3 transition ${target === t.key ? "border-brand bg-teal-50 dark:bg-teal-950/30 ring-1 ring-brand" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  <div className="font-medium">{t.icon} {t.title}</div><div className="text-xs text-slate-500">{t.hint}</div>
                </button>
              ))}
            </div>
            {target === "Staff" ? (
              <div><label className={lbl}>Select staff member *</label>
                <select className={inp} value={staffId} onChange={e => setStaffId(e.target.value)} required>
                  <option value="">Choose…</option>
                  {staff.map(u => <option key={u.uid} value={u.uid}>{u.name} · {u.role}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">Use this when someone already took a device without a requisition. Record it here so stock stays correct.</p></div>
            ) : (
              <div><label className={lbl}>{target === "Client" ? "Client ID *" : "POP name *"}</label>
                <input className={inp} value={ref} onChange={e => setRef(e.target.value)} placeholder={target === "Client" ? "e.g. 121212" : "e.g. Mirpur POP"} required /></div>
            )}
          </Card>

          <Card title="2 · What are you giving?">
            <div><label className={lbl}>Item *</label>
              <select className={inp} value={id} onChange={e => { setId(e.target.value); setLine({ item_id: e.target.value, qty: 0 }); }} required>
                <option value="">Select item…</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</option>)}
              </select></div>
            {item && (<>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${stockBadge(item).c}`}>{stockBadge(item).t}</span>
              <LinePicker item={item} value={line} onChange={setLine} />
            </>)}
          </Card>

          <Card title="3 · Note (optional)">
            <textarea className={inp} rows={2} placeholder={target === "Staff" ? "e.g. Taken on 25 Nov without requisition" : "Anything to remember about this issue…"} value={note} onChange={e => setNote(e.target.value)} />
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 self-start">
          <Card title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">To</dt>
                <dd className="text-right font-medium">{T.icon} {target === "Staff" ? (person ? `${person.name} (${person.role})` : "—") : (ref || "—")}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Item</dt><dd className="text-right font-medium">{item?.name ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Quantity</dt>
                <dd className="text-right font-medium">{line.qty > 0 ? `${line.qty} ${item?.tracking === "LENGTH_BASED" ? "meter" : item?.unit ?? ""}` : "—"}</dd></div>
              {item?.tracking === "SERIALIZED" && (line.serials?.length ?? 0) > 0 &&
                <div><dt className="text-slate-500">Serials</dt><dd className="text-xs break-all">{line.serials!.join(", ")}</dd></div>}
            </dl>
            <button className={btn + " w-full"} disabled={!ready}>Issue now</button>
            <Msg m={msg} />
          </Card>
        </div>
      </form>
    </Need>
  );
}