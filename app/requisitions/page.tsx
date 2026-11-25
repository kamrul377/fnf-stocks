"use client";
import { useMemo, useState } from "react";
import { collection, deleteDoc, doc, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { fulfillRequisition, IssueLine, rejectRequisition, submitRequisition } from "@/services/inventoryService";
import { InventoryItem, Purpose, Requisition, RequisitionLine } from "@/types/inventory";
import { Card, DeleteBtn, LinePicker, Msg, btn, btn2, inp } from "@/components/ui";

const PURPOSES: { key: Purpose; icon: string; title: string; hint: string; ref: string }[] = [
  { key: "New Client Connection", icon: "🏠", title: "New Client Connection", hint: "ONU, fiber, patch cord for a new customer", ref: "Client ID" },
  { key: "Existing Client", icon: "🔁", title: "Existing Client", hint: "Replacement, upgrade, extra device or reconnection", ref: "Client ID" },
  { key: "Ticket/Maintenance", icon: "🛠️", title: "Ticket / Maintenance", hint: "Repair work linked to a support ticket", ref: "Ticket ID or Client ID" },
  { key: "POP Setup", icon: "📡", title: "POP Setup", hint: "Switch, OLT, SFP, backbone fiber for a POP", ref: "POP name" },
  { key: "Personal Field Stock", icon: "🎒", title: "Personal Field Stock", hint: "Items to keep with you for field work", ref: "Reference (optional)" },
];
const REASONS = ["Faulty device replacement", "Speed / package upgrade", "Extra / additional device", "Relocation / shifting", "Reconnection", "Other"];
const URGENCY = [
  { key: "LOW", label: "Low", hint: "Within a week", cls: "border-slate-400" },
  { key: "NORMAL", label: "Normal", hint: "1–2 days", cls: "border-teal-500" },
  { key: "HIGH", label: "Urgent", hint: "Today", cls: "border-red-500" },
] as const;
const STATUS = {
  PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  APPROVED_ISSUED: { label: "Approved & issued", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
} as const;
const stockBadge = (i: InventoryItem) =>
  i.current_stock <= 0 ? { t: "Out of stock", c: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" }
    : i.current_stock <= i.min_stock ? { t: `Low · ${i.current_stock} ${i.unit}`, c: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" }
      : { t: `${i.current_stock.toLocaleString("en-BD")} ${i.unit} available`, c: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
const qtyLabel = (i?: InventoryItem) => (i?.tracking === "LENGTH_BASED" ? "meters" : i?.unit ?? "pcs");
const lbl = "text-xs font-medium text-slate-500 mb-1 block";

/* ---------------- Approver panel ---------------- */
function Fulfil({ req, items }: { req: Requisition; items: InventoryItem[] }) {
  const { user } = useAuth(); const { msg, run } = useAction();
  const [lines, setLines] = useState<IssueLine[]>(req.lines.map(l => ({ item_id: l.item_id, qty: l.qty })));
  const [reason, setReason] = useState("");
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20 p-4">
      <p className="text-sm font-medium">Choose what to issue</p>
      {req.old_serial && <p className="text-xs text-slate-500">Old device to recover: <b>{req.old_serial}</b>. Log it later from Returns & RMA.</p>}
      {req.lines.map((l, i) => {
        const it = items.find(x => x.id === l.item_id);
        if (!it) return <p key={i} className="text-sm text-red-600">{l.item_name}: item no longer exists</p>;
        return (
          <div key={i} className="rounded-lg bg-white dark:bg-slate-900 border p-3 space-y-2">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <b>{l.item_name} × {l.qty} {qtyLabel(it)}</b>
              <span className={`rounded-full px-2 text-xs ${stockBadge(it).c}`}>{stockBadge(it).t}</span>
            </div>
            {l.note && <p className="text-xs text-slate-500">Note: {l.note}</p>}
            {it.tracking === "SERIALIZED" && <p className="text-xs text-slate-500">Select exactly {l.qty} serial(s).</p>}
            <LinePicker item={it} value={lines[i]} onChange={v => setLines(lines.map((x, k) => (k === i ? v : x)))} />
          </div>
        );
      })}
      <button className={btn} onClick={() => user && run(() => fulfillRequisition(user, req.id, lines), "Issued successfully")}>✓ Approve & Issue</button>
      <div className="flex gap-2">
        <input className={inp} placeholder="Reason (required to reject)" value={reason} onChange={e => setReason(e.target.value)} />
        <button className={btn2} onClick={() => user && reason.trim() && run(() => rejectRequisition(user, req.id, reason.trim()), "Rejected")}>Reject</button>
      </div>
      <Msg m={msg} />
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function Requisitions() {
  const { user, can } = useAuth(); const { msg, run } = useAction();
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const approver = can("can_approve_requests");
  const reqs = useQ<Requisition>(() => user ? (approver ? query(collection(db, "requisitions"), orderBy("created_at", "desc"))
    : query(collection(db, "requisitions"), where("requested_by", "==", user.uid))) : null, `${user?.uid}${approver}`);

  // form state
  const [purpose, setPurpose] = useState<Purpose>("New Client Connection");
  const [ref, setRef] = useState(""); const [cName, setCName] = useState(""); const [cPhone, setCPhone] = useState(""); const [addr, setAddr] = useState("");
  const [needBy, setNeedBy] = useState("");
  const [reason, setReason] = useState(REASONS[0]); const [oldSerial, setOldSerial] = useState("");
  const [urgency, setUrgency] = useState<"LOW" | "NORMAL" | "HIGH">("NORMAL"); const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<RequisitionLine[]>([]);
  const [search, setSearch] = useState(""); const [cat, setCat] = useState("All");
  // list state
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | Requisition["status"]>("ALL"); const [lq, setLq] = useState("");

  const P = PURPOSES.find(p => p.key === purpose)!;
  const isClient = purpose === "New Client Connection" || purpose === "Existing Client";
  const needsRef = purpose !== "Personal Field Stock";
  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map(i => i.category))).sort()], [items]);
  const shown = items.filter(i => (cat === "All" || i.category === cat) &&
    (!search || `${i.name} ${i.brand_model}`.toLowerCase().includes(search.toLowerCase())));
  const inCart = (id: string) => lines.find(l => l.item_id === id);
  const add = (i: InventoryItem) => !inCart(i.id) && setLines([...lines, { item_id: i.id, item_name: i.name, qty: 1 }]);
  const setQty = (id: string, q: number) => setLines(lines.map(l => (l.item_id === id ? { ...l, qty: Math.max(1, q || 1) } : l)));
  const setNote = (id: string, note: string) => setLines(lines.map(l => (l.item_id === id ? { ...l, note } : l)));
  const remove = (id: string) => setLines(lines.filter(l => l.item_id !== id));
  const canSubmit = lines.length > 0 && (!needsRef || ref.trim().length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !canSubmit) return;
    run(async () => {
      await submitRequisition(user, {
        purpose, reference: ref.trim(), urgency, notes, needed_by: needBy || undefined,
        reason: purpose === "Existing Client" ? reason : undefined,
        old_serial: purpose === "Existing Client" ? oldSerial.trim() || undefined : undefined,
        contact_name: isClient ? cName || undefined : undefined,
        contact_phone: isClient ? cPhone || undefined : undefined,
        address: isClient ? addr || undefined : undefined,
        lines: lines.map(l => ({ ...l, note: l.note || undefined })),
      });
      setLines([]); setRef(""); setNotes(""); setCName(""); setCPhone(""); setAddr(""); setNeedBy(""); setOldSerial("");
    }, "Requisition submitted. You can track it below.");
  };

  const sorted = [...reqs].sort((a, b) => b.created_at - a.created_at);
  const count = (s: "ALL" | Requisition["status"]) => (s === "ALL" ? sorted.length : sorted.filter(r => r.status === s).length);
  const list = sorted.filter(r => (tab === "ALL" || r.status === tab) &&
    (!lq || `${r.reference} ${r.requested_by_name} ${r.purpose} ${r.lines.map(l => l.item_name).join(" ")}`.toLowerCase().includes(lq.toLowerCase())));

  return (
    <div className="space-y-8">
      {can("can_request_stock") && (
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 */}
            <Card title="1 · What is this for?">
              <div className="grid gap-2 sm:grid-cols-2">
                {PURPOSES.map(p => (
                  <button type="button" key={p.key} onClick={() => setPurpose(p.key)}
                    className={`text-left rounded-xl border p-3 transition ${purpose === p.key
                      ? "border-brand bg-teal-50 dark:bg-teal-950/30 ring-1 ring-brand"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    <div className="font-medium">{p.icon} {p.title}</div>
                    <div className="text-xs text-slate-500">{p.hint}</div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Step 2 */}
            <Card title="2 · Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={lbl}>{P.ref}{needsRef && " *"}</label>
                  <input className={inp} value={ref} onChange={e => setRef(e.target.value)} required={needsRef} placeholder={P.ref} /></div>
                <div><label className={lbl}>Needed by (optional)</label>
                  <input className={inp} type="date" value={needBy} onChange={e => setNeedBy(e.target.value)} /></div>
                {purpose === "Existing Client" && (<>
                  <div><label className={lbl}>Why does the client need it? *</label>
                    <select className={inp} value={reason} onChange={e => setReason(e.target.value)}>{REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
                  <div><label className={lbl}>Old device serial (if replacing)</label>
                    <input className={inp} value={oldSerial} onChange={e => setOldSerial(e.target.value)} placeholder="Serial or MAC of old device" /></div>
                </>)}
                {isClient && (<>
                  <div><label className={lbl}>Client name</label><input className={inp} value={cName} onChange={e => setCName(e.target.value)} /></div>
                  <div><label className={lbl}>Client phone</label><input className={inp} value={cPhone} onChange={e => setCPhone(e.target.value)} /></div>
                  <div className="sm:col-span-2"><label className={lbl}>{purpose === "New Client Connection" ? "Installation address" : "Client address"}</label>
                    <input className={inp} value={addr} onChange={e => setAddr(e.target.value)} /></div>
                </>)}
              </div>
              <div><label className={lbl}>How urgent?</label>
                <div className="grid grid-cols-3 gap-2">
                  {URGENCY.map(u => (
                    <button type="button" key={u.key} onClick={() => setUrgency(u.key)}
                      className={`rounded-xl border-2 p-2 text-center transition ${urgency === u.key ? `${u.cls} bg-slate-50 dark:bg-slate-800` : "border-transparent bg-slate-100 dark:bg-slate-800/50"}`}>
                      <div className="text-sm font-medium">{u.label}</div><div className="text-xs text-slate-500">{u.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Step 3 */}
            <Card title="3 · Pick items">
              <input className={inp} placeholder="Search ONU, switch, fiber…" value={search} onChange={e => setSearch(e.target.value)} />
              <div className="flex flex-wrap gap-1.5">
                {cats.map(c => (
                  <button type="button" key={c} onClick={() => setCat(c)}
                    className={`rounded-full px-3 py-1 text-xs border ${cat === c ? "bg-brand text-white border-brand" : "border-slate-300 dark:border-slate-700"}`}>{c}</button>
                ))}
              </div>
              <div className="max-h-80 overflow-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                {shown.length === 0 && <p className="p-4 text-sm text-slate-500">No items found.</p>}
                {shown.map(i => {
                  const b = stockBadge(i), sel = inCart(i.id); return (
                    <div key={i.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{i.name}</div>
                        <div className="text-xs text-slate-500">{[i.brand_model, i.category].filter(Boolean).join(" · ")}</div>
                      </div>
                      <span className={`hidden sm:inline rounded-full px-2 py-0.5 text-xs ${b.c}`}>{b.t}</span>
                      {sel ? <span className="text-xs text-emerald-600 font-medium">✓ Added</span>
                        : <button type="button" className={btn2} onClick={() => add(i)}>+ Add</button>}
                    </div>);
                })}
              </div>
            </Card>

            {/* Step 4 */}
            <Card title="4 · Extra notes (optional)">
              <textarea className={inp} rows={3} placeholder="Anything the store team should know…" value={notes} onChange={e => setNotes(e.target.value)} />
            </Card>
          </div>

          {/* Summary cart */}
          <div className="lg:sticky lg:top-20 self-start">
            <Card title={`Your request (${lines.length})`}>
              <p className="text-xs text-slate-500">{P.icon} {P.title}{ref ? ` · ${ref}` : ""} · {urgency === "HIGH" ? "Urgent" : urgency === "LOW" ? "Low" : "Normal"}</p>
              {lines.length === 0 && <p className="text-sm text-slate-500">No items yet. Add items from the list.</p>}
              {lines.map(l => {
                const it = items.find(i => i.id === l.item_id); return (
                  <div key={l.item_id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-2">
                    <div className="flex justify-between gap-2 text-sm"><b>{l.item_name}</b>
                      <button type="button" className="text-red-600 text-xs" onClick={() => remove(l.item_id)}>Remove</button></div>
                    <div className="flex items-center gap-2">
                      <button type="button" className={btn2} onClick={() => setQty(l.item_id, l.qty - 1)}>−</button>
                      <input className={inp + " text-center"} type="number" min={1} value={l.qty} onChange={e => setQty(l.item_id, Number(e.target.value))} />
                      <button type="button" className={btn2} onClick={() => setQty(l.item_id, l.qty + 1)}>+</button>
                      <span className="text-xs text-slate-500 w-14">{qtyLabel(it)}</span>
                    </div>
                    {it && l.qty > it.current_stock && <p className="text-xs text-amber-600">Only {it.current_stock} in stock. This may be delayed.</p>}
                    <input className={inp} placeholder="Note for this item (optional)" value={l.note ?? ""} onChange={e => setNote(l.item_id, e.target.value)} />
                  </div>);
              })}
              <button className={btn + " w-full"} disabled={!canSubmit}>Submit requisition</button>
              {!canSubmit && lines.length > 0 && needsRef && <p className="text-xs text-amber-600">Enter the {P.ref.toLowerCase()} to continue.</p>}
              <Msg m={msg} />
            </Card>
          </div>
        </form>
      )}

      {/* ---------------- List ---------------- */}
      <Card title={approver ? "All requisitions" : "My requisitions"}>
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "PENDING", "APPROVED_ISSUED", "REJECTED"] as const).map(s => (
            <button key={s} onClick={() => setTab(s)}
              className={`rounded-full px-3 py-1 text-sm border ${tab === s ? "bg-brand text-white border-brand" : "border-slate-300 dark:border-slate-700"}`}>
              {s === "ALL" ? "All" : STATUS[s].label} ({count(s)})</button>
          ))}
          <input className={inp + " sm:ml-auto sm:max-w-64"} placeholder="Search…" value={lq} onChange={e => setLq(e.target.value)} />
        </div>
        {list.length === 0 && <p className="text-sm text-slate-500">Nothing here yet.</p>}
        <div className="space-y-3">
          {list.map(r => {
            const p = PURPOSES.find(x => x.key === r.purpose); const st = STATUS[r.status]; return (
              <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{p?.icon} {r.purpose}</b>
                  {r.reference && <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">{r.reference}</span>}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                  {r.urgency === "HIGH" && <span className="rounded-full bg-red-600 text-white px-2 py-0.5 text-xs">Urgent</span>}
                  <span className="ml-auto flex items-center gap-3">
                    {approver && r.status === "PENDING" && <button type="button" className={btn2} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Close" : "Process"}</button>}
                    <DeleteBtn onDelete={() => deleteDoc(doc(db, "requisitions", r.id))} />
                  </span>
                </div>
                <p className="text-xs text-slate-500">By {r.requested_by_name} · {new Date(r.created_at).toLocaleString()}{r.needed_by ? ` · needed by ${r.needed_by}` : ""}</p>
                {r.reason && <p className="text-xs text-slate-500">🔁 {r.reason}{r.old_serial ? ` · old device: ${r.old_serial}` : ""}</p>}
                {(r.contact_name || r.contact_phone || r.address) && <p className="text-xs text-slate-500">👤 {[r.contact_name, r.contact_phone, r.address].filter(Boolean).join(" · ")}</p>}
                <div className="flex flex-wrap gap-2">
                  {r.lines.map((l, i) => (
                    <div key={i} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-xs">
                      <b>{l.qty}× {l.item_name}</b>{l.note ? ` — ${l.note}` : ""}
                      {l.serials?.length ? <div className="text-slate-500">Serial: {l.serials.join(", ")}</div> : null}
                      {l.drum_id ? <div className="text-slate-500">Drum: {l.drum_id}</div> : null}
                    </div>))}
                </div>
                {r.notes && <p className="text-slate-600 dark:text-slate-300">📝 {r.notes}</p>}
                {r.rejection_reason && <p className="text-red-600">Rejected: {r.rejection_reason}</p>}
                {r.processed_at && <p className="text-xs text-slate-500">Processed {new Date(r.processed_at).toLocaleString()}</p>}
                {open === r.id && <Fulfil req={r} items={items} />}
              </div>);
          })}
        </div>
      </Card>
    </div>
  );
}