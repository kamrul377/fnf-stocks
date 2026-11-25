"use client";
import { useState } from "react";

import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { fulfillRequisition, IssueLine, rejectRequisition, submitRequisition } from "@/services/inventoryService";
import { InventoryItem, Purpose, Requisition, RequisitionLine } from "@/types/inventory";
import { collection, deleteDoc, doc, orderBy, query, where } from "firebase/firestore";
import { Card, DeleteBtn, LinePicker, Msg, btn, btn2, inp } from "@/components/ui";



function Fulfil({ req, items }: { req: Requisition; items: InventoryItem[] }) {
  const { user } = useAuth(); const { msg, run } = useAction();
  const [lines, setLines] = useState<IssueLine[]>(req.lines.map(l => ({ item_id: l.item_id, qty: l.qty })));
  const [reason, setReason] = useState("");
  return (<div className="mt-2 space-y-2 rounded-lg border p-3">
    {req.lines.map((l, i) => { const it = items.find(x => x.id === l.item_id); return it ? (<div key={i}><p className="text-xs text-slate-500">{l.item_name} × {l.qty}</p>
      <LinePicker item={it} value={lines[i]} onChange={v => setLines(lines.map((x, k) => k === i ? v : x))} /></div>) : null; })}
    <div className="flex gap-2"><button className={btn} onClick={() => user && run(() => fulfillRequisition(user, req.id, lines), "Issued")}>Approve & Issue</button></div>
    <div className="flex gap-2"><input className={inp} placeholder="Rejection reason" value={reason} onChange={e => setReason(e.target.value)} />
      <button className={btn2} onClick={() => user && reason && run(() => rejectRequisition(user, req.id, reason), "Rejected")}>Reject</button></div><Msg m={msg} /></div>);
}
export default function Requisitions() {
  const { user, can } = useAuth(); const { msg, run } = useAction();
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const approver = can("can_approve_requests");
  const reqs = useQ<Requisition>(() => user ? (approver ? query(collection(db, "requisitions"), orderBy("created_at", "desc"))
    : query(collection(db, "requisitions"), where("requested_by", "==", user.uid))) : null, `${user?.uid}${approver}`);
  const [purpose, setPurpose] = useState<Purpose>("New Client Connection"); const [ref, setRef] = useState("");
  const [urgency, setUrgency] = useState<"LOW" | "NORMAL" | "HIGH">("NORMAL"); const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<RequisitionLine[]>([]); const [pick, setPick] = useState(""); const [q, setQ] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const addLine = () => { const it = items.find(i => i.id === pick); if (it && q > 0) { setLines([...lines, { item_id: it.id, item_name: it.name, qty: q }]); setPick(""); setQ(1); } };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!user || !lines.length) return;
    run(async () => { await submitRequisition(user, { purpose, reference: ref, lines, urgency, notes }); setLines([]); setRef(""); setNotes(""); }, "Requisition submitted"); };
  const sorted = [...reqs].sort((a, b) => b.created_at - a.created_at);
  return (<div className="space-y-6">
    {can("can_request_stock") && <Card title="New Requisition"><form onSubmit={submit} className="grid gap-3 max-w-2xl">
      <div className="grid grid-cols-2 gap-2">
        <select className={inp} value={purpose} onChange={e => setPurpose(e.target.value as Purpose)}>{["New Client Connection", "Ticket/Maintenance", "POP Setup", "Personal Field Stock"].map(p => <option key={p}>{p}</option>)}</select>
        <input className={inp} placeholder="client_id / ticket_id / POP name" value={ref} onChange={e => setRef(e.target.value)} required={purpose !== "Personal Field Stock"} /></div>
      <div className="flex gap-2"><select className={inp} value={pick} onChange={e => setPick(e.target.value)}><option value="">Add item…</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select>
        <input className={inp + " max-w-24"} type="number" min={1} value={q} onChange={e => setQ(Number(e.target.value))} /><button type="button" className={btn2} onClick={addLine}>Add</button></div>
      {lines.map((l, i) => <p key={i} className="text-sm">{l.qty} × {l.item_name} <button type="button" className="text-red-600 ml-2" onClick={() => setLines(lines.filter((_, k) => k !== i))}>remove</button></p>)}
      <div className="grid grid-cols-3 gap-2"><select className={inp} value={urgency} onChange={e => setUrgency(e.target.value as any)}>{["LOW", "NORMAL", "HIGH"].map(u => <option key={u}>{u}</option>)}</select>
        <input className={inp + " col-span-2"} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <button className={btn} disabled={!lines.length}>Submit</button><Msg m={msg} /></form></Card>}
    <Card title="Requisitions">{sorted.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
      {sorted.map(r => (<div key={r.id} className="border-t border-slate-100 dark:border-slate-800 pt-3 text-sm">
        <div className="flex flex-wrap gap-2 items-center"><b>{r.purpose}</b><span>{r.reference}</span><span className="text-slate-500">by {r.requested_by_name}</span>
          <span className={`rounded-full px-2 text-xs ${r.status === "PENDING" ? "bg-amber-100 text-amber-800" : r.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{r.status}</span>
          <span className="text-xs">{r.urgency}</span>
          <DeleteBtn onDelete={() => deleteDoc(doc(db, "requisitions", r.id))} />
          {approver && r.status === "PENDING" && <button className={btn2} onClick={() => setOpen(open === r.id ? null : r.id)}>Process</button>}</div>
        <p className="text-slate-600 dark:text-slate-300">{r.lines.map(l => `${l.qty}× ${l.item_name}`).join(", ")}{r.notes ? ` — ${r.notes}` : ""}</p>
        {r.rejection_reason && <p className="text-red-600">Reason: {r.rejection_reason}</p>}
        {open === r.id && <Fulfil req={r} items={items} />}</div>))}</Card>
  </div>);
}
