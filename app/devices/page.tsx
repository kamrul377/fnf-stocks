"use client";
import { useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ } from "@/lib/hooks";
import { DeviceSerial } from "@/types/inventory";
import { Card, DeleteBtn, inp } from "@/components/ui";
import { deleteSerial } from "@/services/inventoryService";

export default function Devices() {
  const all = useQ<DeviceSerial>(() => collection(db, "serials"), "s"); const [q, setQ] = useState("");
  const k = q.trim().toUpperCase();
  const hits = k ? all.filter(d => d.serial_number.includes(k) || d.mac_address?.includes(k) || d.holder_ref?.toUpperCase().includes(k)).slice(0, 20) : [];
  <DeleteBtn onDelete={() => deleteSerial(d.serial_number)} />
  return (<div className="space-y-4"><Card title="Serial / MAC / Client ID lookup"><input className={inp} placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} /></Card>
    {hits.map(d => (<Card key={d.serial_number}><div className="flex flex-wrap gap-3 text-sm"><b>{d.serial_number}</b><span>{d.mac_address}</span><span className="rounded-full bg-teal-100 text-teal-800 px-2 text-xs">{d.status}</span><span>{d.holder_ref}</span></div>
      <ul className="text-xs text-slate-500 space-y-1">{d.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString()} — {h.status} {h.ref ?? ""}</li>)}</ul></Card>))}
    {k && !hits.length && <p className="text-sm text-slate-500">No match.</p>}</div>);
}
