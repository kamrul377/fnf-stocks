"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Table } from "@/components/ui";
import { DeviceSerial, InventoryItem, Requisition } from "@/types/inventory";

const card = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5";
const since = (d: DeviceSerial) => d.history[d.history.length - 1]?.at ?? 0;

function Stat({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-xl dark:bg-teal-950/40">{icon}</div>
      <div><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-semibold">{value}</div></div>
    </div>
  );
}

export default function MyStock() {
  const { user } = useAuth();
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const reqs = useQ<Requisition>(() => (user ? query(collection(db, "requisitions"), where("requested_by", "==", user.uid)) : null), `r-${user?.uid}`);

  const [all, setAll] = useState<DeviceSerial[]>([]);
  const [err, setErr] = useState(""); const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, "serials"), where("holder_ref", "==", user.uid)),
      s => { setAll(s.docs.map(d => d.data() as DeviceSerial)); setErr(""); setLoaded(true); },
      e => { setErr(e.message); setLoaded(true); }
    );
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemName = (id: string) => items.find(i => i.id === id)?.name ?? id;
  const mine = useMemo(() => all.filter(d => d.status === "WITH_TECHNICIAN").sort((a, b) => since(b) - since(a)), [all]);
  const issued = useMemo(() => reqs.filter(r => r.status === "APPROVED_ISSUED").sort((a, b) => (b.processed_at ?? 0) - (a.processed_at ?? 0)).slice(0, 10), [reqs]);
  const pending = reqs.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-semibold">My Handover Stock</h1>
        <p className="text-sm text-slate-500">Devices that are in your hands right now.</p></div>

      {err && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Could not load your stock: {err}
          {err.includes("permission") && <div className="mt-1 text-xs">Publish the latest <code>firestore.rules</code> in Firebase and reload.</div>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat icon="📟" label="Devices with me" value={loaded ? mine.length : "…"} />
        <Stat icon="⏳" label="My pending requests" value={pending} />
        <Stat icon="✅" label="Issued on my requests" value={issued.length} />
      </div>

      <Card title={`Devices with me (${mine.length})`}>
        {mine.length > 0 ? (
          <Table head={["Item", "Serial", "MAC", "Since"]}
            rows={mine.map(s => [<b key="i">{itemName(s.item_id)}</b>, s.serial_number, s.mac_address ?? "—", new Date(since(s)).toLocaleDateString()])} />
        ) : loaded && !err ? (
          <div className="py-6 text-center text-sm text-slate-500">
            <div className="text-3xl">🎒</div>
            <p className="mt-2 font-medium text-slate-700 dark:text-slate-200">No devices assigned to you</p>
            <p className="mt-1">Devices show here when a manager assigns them to you, or when a &quot;Personal Field Stock&quot; request is approved.</p>
            <p>Devices issued for a client are listed under that client, see below.</p>
          </div>
        ) : null}
      </Card>

      <div className={card + " space-y-3"}>
        <h2 className="font-semibold">Issued on my requisitions</h2>
        {issued.length === 0 && <p className="text-sm text-slate-500">Nothing issued on your requests yet.</p>}
        {issued.map(r => (
          <div key={r.id} className="space-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <b>{r.purpose}</b>{r.reference && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{r.reference}</span>}
              <span className="ml-auto text-xs text-slate-500">{r.processed_at ? new Date(r.processed_at).toLocaleString() : ""}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {r.lines.map((l, i) => (
                <div key={i} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs dark:bg-slate-800">
                  <b>{l.qty}× {l.item_name}</b>
                  {l.serials?.length ? <div className="text-slate-500">Serial: {l.serials.join(", ")}</div> : null}
                  {l.drum_id ? <div className="text-slate-500">Drum: {l.drum_id}</div> : null}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {r.purpose === "Personal Field Stock" ? "Kept with you." : r.purpose === "POP Setup" ? `Sent to POP ${r.reference}.` : `Assigned to client ${r.reference}.`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}