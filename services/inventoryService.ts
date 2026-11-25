import { doc, collection, runTransaction, Transaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeviceSerial, DeviceStatus, Drum, InventoryItem, Requisition, StockTransaction, UserProfile } from "@/types/inventory";

const itemRef = (id: string) => doc(db, "items", id);
const serialRef = (sn: string) => doc(db, "serials", sn.trim().toUpperCase());
const drumRef = (id: string) => doc(db, "drums", id);
const clean = <T,>(o: T) => JSON.parse(JSON.stringify(o)) as T; // strips undefined

function logTx(t: Transaction, u: UserProfile, p: Omit<StockTransaction, "by" | "by_name" | "at">) {
  t.set(doc(collection(db, "transactions")), clean({ ...p, by: u.uid, by_name: u.name, at: Date.now() }));
}

/* ---------- PURCHASE / STOCK-IN ---------- */
export interface PurchaseInput {
  item_id: string; invoice_no: string; supplier?: string; unit_cost: number;
  qty?: number;                                              // QUANTITY_BASED
  units?: { serial_number: string; mac_address?: string }[]; // SERIALIZED
  drums?: { id: string; length: number }[];                  // LENGTH_BASED
}
export async function recordPurchase(u: UserProfile, p: PurchaseInput) {
  return runTransaction(db, async t => {
    const item = (await t.get(itemRef(p.item_id))).data() as InventoryItem | undefined;
    if (!item) throw new Error("Item not found");
    let added = 0; const serials: string[] = [];

    if (item.tracking === "SERIALIZED") {
      const units = p.units ?? [];
      if (!units.length) throw new Error("Add at least one serial");
      const norm = units.map(x => x.serial_number.trim().toUpperCase());
      if (new Set(norm).size !== norm.length) throw new Error("Duplicate serial in input");
      const snaps = await Promise.all(norm.map(s => t.get(serialRef(s))));
      snaps.forEach((s, i) => { if (s.exists()) throw new Error(`Serial already exists: ${norm[i]}`); });
      units.forEach((x, i) => {
        const d: DeviceSerial = { serial_number: norm[i], mac_address: x.mac_address?.trim().toUpperCase() || undefined,
          item_id: item.id, status: "IN_STOCK", history: [{ at: Date.now(), status: "IN_STOCK", by: u.uid }] };
        t.set(serialRef(norm[i]), clean(d)); serials.push(norm[i]);
      });
      added = units.length;
    } else if (item.tracking === "LENGTH_BASED") {
      const drums = p.drums ?? [];
      if (!drums.length) throw new Error("Add at least one drum");
      const snaps = await Promise.all(drums.map(d => t.get(drumRef(d.id))));
      snaps.forEach((s, i) => { if (s.exists()) throw new Error(`Drum already exists: ${drums[i].id}`); });
      drums.forEach(d => {
        if (d.length <= 0) throw new Error("Length must be > 0");
        t.set(drumRef(d.id), { id: d.id, item_id: item.id, initial_length: d.length, remaining_length: d.length } as Drum);
        added += d.length;
      });
    } else {
      if (!p.qty || p.qty <= 0) throw new Error("Quantity must be > 0");
      added = p.qty;
    }
    const newStock = item.current_stock + added; // weighted-average cost
    const avg = newStock ? (item.avg_unit_cost * item.current_stock + p.unit_cost * added) / newStock : p.unit_cost;
    t.update(itemRef(item.id), { current_stock: newStock, avg_unit_cost: avg });
    logTx(t, u, { type: "PURCHASE", item_id: item.id, item_name: item.name, qty: added,
      serials: serials.length ? serials : undefined, invoice_no: p.invoice_no, unit_cost: p.unit_cost });
  });
}

/* ---------- ISSUE (shared by direct withdraw + requisition fulfilment) ---------- */
export interface IssueLine { item_id: string; qty: number; serials?: string[]; drum_id?: string; }
export interface IssueTarget { status: DeviceStatus; reference: string; }

/** Phase 1: every read. Phase 2: every write (Firestore requires reads first). */
async function issueLines(t: Transaction, u: UserProfile, lines: IssueLine[], tg: IssueTarget, type: "WITHDRAW" | "REQUEST_FULFILLED") {
  const loaded: { item: InventoryItem; sn?: string[]; cur?: DeviceSerial[]; drum?: Drum }[] = [];
  for (const l of lines) {
    const item = (await t.get(itemRef(l.item_id))).data() as InventoryItem | undefined;
    if (!item) throw new Error("Item not found");
    if (item.current_stock < l.qty) throw new Error(`${item.name}: insufficient stock (${item.current_stock})`);
    if (item.tracking === "SERIALIZED") {
      const sn = (l.serials ?? []).map(s => s.trim().toUpperCase());
      if (sn.length !== l.qty) throw new Error(`${item.name}: select exactly ${l.qty} serial(s)`);
      const cur = (await Promise.all(sn.map(s => t.get(serialRef(s))))).map(s => s.data() as DeviceSerial | undefined);
      cur.forEach((d, k) => {
        if (!d || d.item_id !== item.id || !["IN_STOCK", "RETURNED_USED"].includes(d.status)) throw new Error(`Serial unavailable: ${sn[k]}`);
      });
      loaded.push({ item, sn, cur: cur as DeviceSerial[] });
    } else if (item.tracking === "LENGTH_BASED") {
      if (!l.drum_id) throw new Error(`${item.name}: choose a drum`);
      const drum = (await t.get(drumRef(l.drum_id))).data() as Drum | undefined;
      if (!drum || drum.item_id !== item.id) throw new Error("Invalid drum");
      if (drum.remaining_length < l.qty) throw new Error(`${item.name}: drum ${drum.id} has only ${drum.remaining_length} left`);
      loaded.push({ item, drum });
    } else loaded.push({ item });
  }
  lines.forEach((l, i) => {
    const { item, sn, cur, drum } = loaded[i];
    sn?.forEach((s, k) => t.update(serialRef(s), { status: tg.status, holder_ref: tg.reference,
      history: [...cur![k].history, { at: Date.now(), status: tg.status, ref: tg.reference, by: u.uid }] }));
    if (drum) t.update(drumRef(drum.id), { remaining_length: drum.remaining_length - l.qty });
    t.update(itemRef(item.id), { current_stock: item.current_stock - l.qty });
    logTx(t, u, { type, item_id: item.id, item_name: item.name, qty: -l.qty, serials: sn, drum_id: drum?.id, reference: tg.reference });
  });
}

export const directWithdraw = (u: UserProfile, lines: IssueLine[], tg: IssueTarget) =>
  runTransaction(db, t => issueLines(t, u, lines, tg, "WITHDRAW"));

/* ---------- REQUISITIONS ---------- */
export async function submitRequisition(u: UserProfile,
  r: Omit<Requisition, "id" | "status" | "created_at" | "requested_by" | "requested_by_name">) {
  const ref = doc(collection(db, "requisitions"));
  await runTransaction(db, async t => {
    t.set(ref, clean({ ...r, id: ref.id, requested_by: u.uid, requested_by_name: u.name, status: "PENDING", created_at: Date.now() }));
  });
  return ref.id;
}

export async function fulfillRequisition(u: UserProfile, reqId: string, lines: IssueLine[]) {
  return runTransaction(db, async t => {
    const rRef = doc(db, "requisitions", reqId);
    const req = (await t.get(rRef)).data() as Requisition | undefined;
    if (!req || req.status !== "PENDING") throw new Error("Requisition is not pending");
    const target: IssueTarget = req.purpose === "Personal Field Stock"
      ? { status: "WITH_TECHNICIAN", reference: req.requested_by }
      : req.purpose === "POP Setup" ? { status: "ASSIGNED_POP", reference: req.reference }
      : { status: "ASSIGNED_CLIENT", reference: req.reference };
    await issueLines(t, u, lines, target, "REQUEST_FULFILLED");
    t.update(rRef, clean({ status: "APPROVED_ISSUED", processed_by: u.uid, processed_at: Date.now(),
      lines: req.lines.map((l, i) => ({ ...l, serials: lines[i]?.serials, drum_id: lines[i]?.drum_id })) }));
  });
}

export async function rejectRequisition(u: UserProfile, reqId: string, reason: string) {
  return runTransaction(db, async t => {
    const rRef = doc(db, "requisitions", reqId);
    const req = (await t.get(rRef)).data() as Requisition | undefined;
    if (!req || req.status !== "PENDING") throw new Error("Requisition is not pending");
    t.update(rRef, { status: "REJECTED", rejection_reason: reason, processed_by: u.uid, processed_at: Date.now() });
  });
}

/* ---------- RETURN / RMA (serialized devices) ---------- */
export async function returnDevice(u: UserProfile, serial: string, as: "RETURNED_USED" | "FAULTY_RMA", note = "") {
  return runTransaction(db, async t => {
    const sRef = serialRef(serial), d = (await t.get(sRef)).data() as DeviceSerial | undefined;
    if (!d) throw new Error("Serial not found");
    const item = (await t.get(itemRef(d.item_id))).data() as InventoryItem;
    t.update(sRef, { status: as, history: [...d.history, { at: Date.now(), status: as, ref: note, by: u.uid }] });
    if (as === "RETURNED_USED") t.update(itemRef(item.id), { current_stock: item.current_stock + 1 });
    logTx(t, u, { type: "RETURN", item_id: item.id, item_name: item.name, qty: as === "RETURNED_USED" ? 1 : 0,
      serials: [d.serial_number], reference: d.holder_ref, note: `${as} ${note}` });
  });
}


export async function deleteSerial(sn: string) {
  return runTransaction(db, async t => {
    const sRef = serialRef(sn), d = (await t.get(sRef)).data() as DeviceSerial | undefined;
    if (!d) return;
    const item = (await t.get(itemRef(d.item_id))).data() as InventoryItem | undefined;
    if (item && ["IN_STOCK", "RETURNED_USED"].includes(d.status))
      t.update(itemRef(item.id), { current_stock: Math.max(0, item.current_stock - 1) });
    t.delete(sRef);
  });
}
export async function deleteDrum(id: string) {
  return runTransaction(db, async t => {
    const dRef = drumRef(id), d = (await t.get(dRef)).data() as Drum | undefined;
    if (!d) return;
    const item = (await t.get(itemRef(d.item_id))).data() as InventoryItem | undefined;
    if (item) t.update(itemRef(item.id), { current_stock: Math.max(0, item.current_stock - d.remaining_length) });
    t.delete(dRef);
  });
}