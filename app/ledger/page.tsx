"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { useQ } from "@/lib/hooks";
import { StockTransaction } from "@/types/inventory";
import { collection, deleteDoc, doc, limit, orderBy, query } from "firebase/firestore";
import { Card, DeleteBtn, Need, Table, btn2, inp } from "@/components/ui";

export default function Ledger() {
  const tx = useQ<StockTransaction>(() => query(collection(db, "transactions"), orderBy("at", "desc"), limit(500)), "t");
  const [type, setType] = useState(""); const [s, setS] = useState("");
  const rows = tx.filter(t => (!type || t.type === type) && (!s || JSON.stringify(t).toLowerCase().includes(s.toLowerCase())));
  const csv = () => {
    const head = ["date", "type", "item", "qty", "serials", "reference", "invoice", "by"];
    const body = rows.map(t => [new Date(t.at).toISOString(), t.type, t.item_name, t.qty, (t.serials ?? []).join(" "), t.reference ?? "", t.invoice_no ?? "", t.by_name]);
    const text = [head, ...body].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = "ledger.csv"; a.click();
  };
  return (<Need p="can_view_full_ledger"><Card title="Stock Ledger & Audit Log"><div className="flex flex-wrap gap-2">
    <select className={inp + " max-w-44"} value={type} onChange={e => setType(e.target.value)}><option value="">All types</option>{["PURCHASE", "WITHDRAW", "REQUEST_FULFILLED", "RETURN", "ADJUSTMENT"].map(t => <option key={t}>{t}</option>)}</select>
    <input className={inp + " max-w-64"} placeholder="Search…" value={s} onChange={e => setS(e.target.value)} /><button className={btn2} onClick={csv}>Export CSV</button></div>

    <Table head={["Date", "Type", "Item", "Qty", "Ref", "By", ""]}
  rows={rows.map(t => [new Date(t.at).toLocaleString(), t.type, t.item_name, t.qty, t.reference ?? t.invoice_no ?? "", t.by_name,
    <DeleteBtn onDelete={() => deleteDoc(doc(db, "transactions", t.id!))} />])} /></Card></Need>);
}
