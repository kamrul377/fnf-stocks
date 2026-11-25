"use client";
import { useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, LinePicker, Msg, Need, btn, inp } from "@/components/ui";
import { directWithdraw, IssueLine } from "@/services/inventoryService";
import { DeviceStatus, InventoryItem, UserProfile } from "@/types/inventory";

const TARGETS: Record<string, DeviceStatus> = { Client: "ASSIGNED_CLIENT", POP: "ASSIGNED_POP", Technician: "WITH_TECHNICIAN" };
export default function Withdraw() {
  const { user } = useAuth(); const { msg, run } = useAction();
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const users = useQ<UserProfile>(() => collection(db, "users"), "u");
  const [id, setId] = useState(""); const [type, setType] = useState("Client"); const [ref, setRef] = useState("");
  const [line, setLine] = useState<IssueLine>({ item_id: "", qty: 0 });
  const item = items.find(i => i.id === id);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!user || !item) return;
    run(() => directWithdraw(user, [{ ...line, item_id: item.id }], { status: TARGETS[type], reference: ref }), "Issued successfully"); };
  return (<Need p="can_direct_withdraw"><Card title="Direct Withdraw / Issue"><form onSubmit={submit} className="grid gap-3 max-w-2xl">
    <select className={inp} value={id} onChange={e => { setId(e.target.value); setLine({ item_id: e.target.value, qty: 0 }); }} required><option value="">Select item</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</option>)}</select>
    <div className="grid grid-cols-2 gap-2">
      <select className={inp} value={type} onChange={e => { setType(e.target.value); setRef(""); }}>{Object.keys(TARGETS).map(t => <option key={t}>{t}</option>)}</select>
      {type === "Technician" ? <select className={inp} value={ref} onChange={e => setRef(e.target.value)} required><option value="">Select technician</option>{users.filter(u => u.role === "technician").map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}</select>
        : <input className={inp} placeholder={type === "Client" ? "client_id" : "POP name"} value={ref} onChange={e => setRef(e.target.value)} required />}</div>
    {item && <LinePicker item={item} value={line} onChange={setLine} />}
    <button className={btn} disabled={!item}>Issue</button><Msg m={msg} /></form></Card></Need>);
}
