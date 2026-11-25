"use client";
import { useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Msg, Need, btn, inp } from "@/components/ui";
import { recordPurchase } from "@/services/inventoryService";
import { InventoryItem } from "@/types/inventory";

export default function Purchases() {
  const { user } = useAuth(); const { msg, run } = useAction();
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const [id, setId] = useState(""); const [inv, setInv] = useState(""); const [sup, setSup] = useState(""); const [cost, setCost] = useState(0);
  const [qty, setQty] = useState(0); const [text, setText] = useState("");
  const item = items.find(i => i.id === id);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean).map(l => l.split(/[,\t ]+/));
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!user || !item) return; run(async () => {
    await recordPurchase(user, { item_id: item.id, invoice_no: inv, supplier: sup, unit_cost: cost, qty,
      units: item.tracking === "SERIALIZED" ? lines.map(l => ({ serial_number: l[0], mac_address: l[1] })) : undefined,
      drums: item.tracking === "LENGTH_BASED" ? lines.map(l => ({ id: l[0], length: Number(l[1]) })) : undefined });
    setText(""); setQty(0); }, "Stock-in recorded"); };
  return (<Need p="can_record_purchase"><Card title="Purchase / Stock-In"><form onSubmit={submit} className="grid gap-3 max-w-2xl">
    <select className={inp} value={id} onChange={e => setId(e.target.value)} required><option value="">Select item</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.tracking})</option>)}</select>
    <div className="grid grid-cols-3 gap-2">
      <input className={inp} placeholder="Invoice no" value={inv} onChange={e => setInv(e.target.value)} required />
      <input className={inp} placeholder="Supplier" value={sup} onChange={e => setSup(e.target.value)} />
      <input className={inp} type="number" min={0} step="0.01" placeholder={`Unit cost ৳${item?.tracking === "LENGTH_BASED" ? " / meter" : ""}`} value={cost || ""} onChange={e => setCost(Number(e.target.value))} required /></div>
    {item?.tracking === "SERIALIZED" && <textarea className={inp} rows={6} placeholder={"One unit per line:\nSERIAL1, MAC1\nSERIAL2, MAC2"} value={text} onChange={e => setText(e.target.value)} />}
    {item?.tracking === "LENGTH_BASED" && <textarea className={inp} rows={5} placeholder={"One drum per line:\nDRUM-001, 2000\nDRUM-002, 1500"} value={text} onChange={e => setText(e.target.value)} />}
    {item?.tracking === "QUANTITY_BASED" && <input className={inp} type="number" min={1} placeholder="Quantity" value={qty || ""} onChange={e => setQty(Number(e.target.value))} />}
    <button className={btn} disabled={!item}>Record Stock-In</button><Msg m={msg} /></form></Card></Need>);
}
