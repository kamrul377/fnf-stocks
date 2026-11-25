"use client";
import { useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Msg, Need, Table, btn, inp } from "@/components/ui";
import { returnDevice } from "@/services/inventoryService";
import { DeviceSerial } from "@/types/inventory";

export default function Rma() {
  const { user } = useAuth(); const { msg, run } = useAction();
  const all = useQ<DeviceSerial>(() => collection(db, "serials"), "s");
  const [sn, setSn] = useState(""); const [as, setAs] = useState<"RETURNED_USED" | "FAULTY_RMA">("RETURNED_USED"); const [note, setNote] = useState("");
  const rows = all.filter(d => ["FAULTY_RMA", "RETURNED_USED"].includes(d.status));
  return (<Need p="can_manage_rma_returns"><div className="space-y-6"><Card title="Return / Faulty (RMA)">
    <form className="grid gap-2 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); user && run(() => returnDevice(user, sn, as, note), "Recorded"); }}>
      <input className={inp} placeholder="Serial number" value={sn} onChange={e => setSn(e.target.value)} required />
      <select className={inp} value={as} onChange={e => setAs(e.target.value as any)}><option value="RETURNED_USED">Returned (used)</option><option value="FAULTY_RMA">Faulty (RMA)</option></select>
      <input className={inp} placeholder="Note / vendor ref" value={note} onChange={e => setNote(e.target.value)} /><button className={btn}>Save</button></form><Msg m={msg} /></Card>
    <Card title="Returned & RMA devices"><Table head={["Serial", "Status", "Last ref"]} rows={rows.map(d => [d.serial_number, d.status, d.history.at(-1)?.ref ?? ""])} /></Card></div></Need>);
}
