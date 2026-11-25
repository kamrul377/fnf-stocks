"use client";
import { useState } from "react";
import { collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { InventoryItem, Tracking, Unit } from "@/types/inventory";
import { Card, DeleteBtn, Msg, Need, Table, btn, inp, taka } from "@/components/ui";
import { deleteDrum } from "@/services/inventoryService";

export default function Items() {
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i"); 
  const { msg, run } = useAction();
  const drums = useQ<Drum>(() => collection(db, "drums"), "d");


  const [f, setF] = useState({ name: "", brand_model: "", category: "", unit: "pcs" as Unit, tracking: "QUANTITY_BASED" as Tracking, min_stock: 0 });
  const add = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const ref = doc(collection(db, "items")); await setDoc(ref, { ...f, id: ref.id, current_stock: 0, avg_unit_cost: 0 });
    setF({ ...f, name: "", brand_model: "" }); }, "Item created"); };
  return (<Need p="can_create_edit_items"><div className="space-y-6">
    <Card title="Create Item"><form onSubmit={add} className="grid gap-2 sm:grid-cols-3">
      <input className={inp} placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />
      <input className={inp} placeholder="Brand / Model" value={f.brand_model} onChange={e => setF({ ...f, brand_model: e.target.value })} />
      <input className={inp} placeholder="Category" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} required />
      <select className={inp} value={f.unit} onChange={e => setF({ ...f, unit: e.target.value as Unit })}>{["pcs", "meter", "feet", "roll", "box"].map(u => <option key={u}>{u}</option>)}</select>
      <select className={inp} value={f.tracking} onChange={e => setF({ ...f, tracking: e.target.value as Tracking })}>{["SERIALIZED", "LENGTH_BASED", "QUANTITY_BASED"].map(u => <option key={u}>{u}</option>)}</select>
      <input className={inp} type="number" min={0} placeholder="Min stock alert" value={f.min_stock} onChange={e => setF({ ...f, min_stock: Number(e.target.value) })} />
      <button className={btn}>Create</button></form><Msg m={msg} /></Card>
    <Card title={`Items (${items.length})`}>
      <Table head={["Name", "Category", "Tracking", "Stock", "Min", "Avg cost"]}
      rows={items.map(i => [i.name, i.category, i.tracking, `${i.current_stock} ${i.unit}`, i.min_stock, taka(i.avg_unit_cost)])} /></Card>
  </div></Need>);
}
