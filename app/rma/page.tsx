"use client";
import { useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Msg, Need, Table, btn, inp } from "@/components/ui";
import { recoverFiber, returnDevice } from "@/services/inventoryService";
import { ClientFiber, DeviceSerial } from "@/types/inventory";

function RecoverRow({ f }: { f: ClientFiber }) {
  const { user } = useAuth(); const { msg, run } = useAction();
  const out = f.issued - f.recovered - f.lost;
  const [len, setLen] = useState<string>(""); const [note, setNote] = useState("");
  const n = Number(len); const valid = len !== "" && n >= 0 && n <= out;
  return (
    <div className="rounded-xl border p-3 space-y-2 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <b>{f.item_name}</b><span>Issued: {f.issued} m · Outstanding: <b>{out} m</b></span>
      </div>
      <div className="flex flex-wrap gap-2">
        <input className={inp + " max-w-40"} type="number" min={0} max={out} placeholder="Recovered (m)" value={len} onChange={e => setLen(e.target.value)} />
        <input className={inp + " max-w-64"} placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <button className={btn} disabled={!valid} onClick={() => user && run(() => recoverFiber(user, f.client_id, f.item_id, n, note), "Fiber recovered")}>Recover & close</button>
      </div>
      {valid && <p className={n < out ? "text-amber-600" : "text-emerald-600"}>
        Back to stock: {n} m · Loss: {out - n} m</p>}
      {len !== "" && n > out && <p className="text-red-600">Cannot be more than {out} m.</p>}
      <Msg m={msg} />
    </div>
  );
}

export default function Rma() {
  const { user } = useAuth(); const { msg, run } = useAction();
  const all = useQ<DeviceSerial>(() => collection(db, "serials"), "s");
  const fiber = useQ<ClientFiber>(() => collection(db, "client_fiber"), "cf");
  const [sn, setSn] = useState(""); const [as, setAs] = useState<"RETURNED_USED" | "FAULTY_RMA">("RETURNED_USED"); const [note, setNote] = useState("");
  const [cid, setCid] = useState("");
  const rows = all.filter(d => ["FAULTY_RMA", "RETURNED_USED"].includes(d.status));
  const open = fiber.filter(f => cid.trim() && f.client_id.toLowerCase() === cid.trim().toLowerCase() && f.issued - f.recovered - f.lost > 0);
  const totalLoss = fiber.reduce((a, f) => a + f.lost, 0);

  return (
    <Need p="can_manage_rma_returns">
      <div className="space-y-6">
        <Card title="Recover fiber from a client (disconnect)">
          <p className="text-sm text-slate-500">Enter the Client ID. The fiber issued to this client will show up. Enter how many meters you got back. The rest is recorded as loss.</p>
          <input className={inp + " max-w-sm"} placeholder="Client ID" value={cid} onChange={e => setCid(e.target.value)} />
          {cid.trim() && open.length === 0 && <p className="text-sm text-slate-500">No outstanding fiber for this client.</p>}
          {open.map(f => <RecoverRow key={f.id} f={f} />)}
        </Card>

        <Card title={`Client fiber history · total loss ${totalLoss} m`}>
          <Table head={["Client", "Item", "Issued (m)", "Recovered (m)", "Loss (m)", "Outstanding (m)"]}
            rows={[...fiber].sort((a, b) => b.updated_at - a.updated_at).map(f =>
              [f.client_id, f.item_name, f.issued, f.recovered, f.lost, f.issued - f.recovered - f.lost])} />
        </Card>

        <Card title="Return / Faulty device (RMA)">
          <form className="grid gap-2 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); user && run(() => returnDevice(user, sn, as, note), "Recorded"); }}>
            <input className={inp} placeholder="Serial number" value={sn} onChange={e => setSn(e.target.value)} required />
            <select className={inp} value={as} onChange={e => setAs(e.target.value as any)}>
              <option value="RETURNED_USED">Returned (used)</option><option value="FAULTY_RMA">Faulty (RMA)</option></select>
            <input className={inp} placeholder="Note / vendor ref" value={note} onChange={e => setNote(e.target.value)} />
            <button className={btn}>Save</button>
          </form>
          <Msg m={msg} />
        </Card>

        <Card title="Returned & RMA devices">
          <Table head={["Serial", "Status", "Last ref"]} rows={rows.map(d => [d.serial_number, d.status, d.history.at(-1)?.ref ?? ""])} />
        </Card>
      </div>
    </Need>
  );
}