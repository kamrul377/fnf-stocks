"use client";
import { useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Msg, Need, btn, inp, taka } from "@/components/ui";
import { recordPurchase } from "@/services/inventoryService";
import { InventoryItem } from "@/types/inventory";

export default function Purchases() {
  const { user } = useAuth();
  const { msg, run } = useAction();
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");

  const [id, setId] = useState("");
  const [inv, setInv] = useState("");
  const [sup, setSup] = useState("");
  const [cost, setCost] = useState<string>("");
  const [qty, setQty] = useState<string>("");

  // Serialized ও Length-Based আইটেমের জন্য আলাদা রো (Row) স্টেট
  const [serialRows, setSerialRows] = useState([{ serial_number: "", mac_address: "" }]);
  const [drumRows, setDrumRows] = useState([{ id: "", length: "" }]);

  const item = items.find((i) => i.id === id);

  // আইটেম পরিবর্তন হলে ইনপুট রিসেট
  const handleItemChange = (newId: string) => {
    setId(newId);
    setQty("");
    setSerialRows([{ serial_number: "", mac_address: "" }]);
    setDrumRows([{ id: "", length: "" }]);
  };

  // --- Serialized Row Handlers ---
  const addSerialRow = () => setSerialRows([...serialRows, { serial_number: "", mac_address: "" }]);
  const removeSerialRow = (idx: number) => {
    if (serialRows.length > 1) setSerialRows(serialRows.filter((_, i) => i !== idx));
  };
  const updateSerialRow = (idx: number, field: "serial_number" | "mac_address", val: string) => {
    const updated = [...serialRows];
    updated[idx][field] = val;
    setSerialRows(updated);
  };

  // --- Fiber / Drum Row Handlers ---
  const addDrumRow = () => setDrumRows([...drumRows, { id: "", length: "" }]);
  const removeDrumRow = (idx: number) => {
    if (drumRows.length > 1) setDrumRows(drumRows.filter((_, i) => i !== idx));
  };
  const updateDrumRow = (idx: number, field: "id" | "length", val: string) => {
    const updated = [...drumRows];
    updated[idx][field] = val;
    setDrumRows(updated);
  };

  // মোট পরিমাণ ও মোট খরচ ক্যালকুলেশন
  const unitCostNum = Number(cost) || 0;
  const totalLength = drumRows.reduce((sum, d) => sum + (Number(d.length) || 0), 0);
  const totalQuantity =
    item?.tracking === "QUANTITY_BASED"
      ? Number(qty) || 0
      : item?.tracking === "SERIALIZED"
        ? serialRows.filter((s) => s.serial_number.trim()).length
        : totalLength;

  const totalCost = totalQuantity * unitCostNum;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !item) return;

    run(async () => {
      await recordPurchase(user, {
        item_id: item.id,
        invoice_no: inv.trim(),
        supplier: sup.trim(),
        unit_cost: unitCostNum,
        qty: item.tracking === "QUANTITY_BASED" ? Number(qty) : totalQuantity,
        units:
          item.tracking === "SERIALIZED"
            ? serialRows.map((s) => ({
              serial_number: s.serial_number.trim(),
              mac_address: s.mac_address.trim(),
            }))
            : undefined,
        drums:
          item.tracking === "LENGTH_BASED"
            ? drumRows.map((d) => ({
              id: d.id.trim(),
              length: Number(d.length),
            }))
            : undefined,
      });

      // সাবমিট সফল হলে ফর্ম ক্লিয়ার করা
      setInv("");
      setSup("");
      setCost("");
      setQty("");
      setSerialRows([{ serial_number: "", mac_address: "" }]);
      setDrumRows([{ id: "", length: "" }]);
    }, "Stock-In recorded successfully!");
  };

  return (
    <Need p="can_record_purchase">
      <div className="max-w-3xl mx-auto">
        <Card title="Record Purchase / Stock-In">
          <form onSubmit={submit} className="space-y-5">
            {/* Step 1: Select Item */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase">
                Select Inventory Item *
              </label>
              <select
                className={inp}
                value={id}
                onChange={(e) => handleItemChange(e.target.value)}
                required
              >
                <option value="">-- Choose an item to stock-in --</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} {i.brand_model ? `(${i.brand_model})` : ""} — [{i.tracking}]
                  </option>
                ))}
              </select>

              {/* Selected Item Quick Info Banner */}
              {item && (
                <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {(item as any).image_url && (
                      <img
                        src={(item as any).image_url}
                        alt={item.name}
                        className="w-10 h-10 rounded object-cover border"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <p className="text-gray-500">Category: {item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Current Stock</p>
                    <p className="font-bold text-gray-800 text-sm">
                      {item.current_stock} {item.unit}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Invoice, Supplier & Unit Cost (All Required) */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">
                  Invoice / Memo No *
                </label>
                <input
                  className={inp}
                  placeholder="e.g. INV-2026-01"
                  value={inv}
                  onChange={(e) => setInv(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">
                  Supplier Name *
                </label>
                <input
                  className={inp}
                  placeholder="e.g. Star Tech / Vendor"
                  value={sup}
                  onChange={(e) => setSup(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">
                  Unit Cost (৳{item ? ` / ${item.unit}` : ""}) *
                </label>
                <input
                  className={inp}
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Step 3: Dynamic Stock Input Based on Tracking Type */}
            {item?.tracking === "QUANTITY_BASED" && (
              <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 space-y-1.5">
                <label className="text-xs font-semibold text-blue-900 uppercase">
                  Purchase Quantity ({item.unit}) *
                </label>
                <input
                  className={inp}
                  type="number"
                  min={1}
                  placeholder={`Enter total ${item.unit} received`}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
              </div>
            )}

            {/* FIBER / LENGTH_BASED INPUT (Crystal Clear Drum ID + Length) */}
            {item?.tracking === "LENGTH_BASED" && (
              <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase">
                      Fiber Drums / Rolls Details *
                    </h4>
                    <p className="text-xs text-amber-700">
                      Enter each drum/roll ID and its exact length in <strong>{item.unit}</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addDrumRow}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700"
                  >
                    + Add Another Drum
                  </button>
                </div>

                <div className="space-y-2">
                  {drumRows.map((drum, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          className={inp}
                          placeholder={`Drum ID (e.g. DRUM-0${idx + 1})`}
                          value={drum.id}
                          onChange={(e) => updateDrumRow(idx, "id", e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-5 relative">
                        <input
                          className={inp}
                          type="number"
                          min={1}
                          step="0.01"
                          placeholder={`Length (${item.unit})`}
                          value={drum.length}
                          onChange={(e) => updateDrumRow(idx, "length", e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {drumRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDrumRow(idx)}
                            className="text-red-500 hover:text-red-700 font-bold text-sm px-2 py-1"
                            title="Remove Drum"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-amber-200/70 flex justify-between text-xs font-semibold text-amber-900">
                  <span>Total Drums: {drumRows.length}</span>
                  <span>
                    Total Fiber Length: {totalLength} {item.unit}
                  </span>
                </div>
              </div>
            )}

            {/* SERIALIZED INPUT (Clear Serial + MAC boxes) */}
            {item?.tracking === "SERIALIZED" && (
              <div className="p-4 rounded-lg bg-purple-50/50 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-purple-900 uppercase">
                      Serialized Devices (ONU / Router) *
                    </h4>
                    <p className="text-xs text-purple-700">
                      Enter Serial Number and MAC Address for each unit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSerialRow}
                    className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    + Add Unit
                  </button>
                </div>

                <div className="space-y-2">
                  {serialRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          className={inp}
                          placeholder="Serial Number (SN) *"
                          value={row.serial_number}
                          onChange={(e) => updateSerialRow(idx, "serial_number", e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-5">
                        <input
                          className={inp}
                          placeholder="MAC Address *"
                          value={row.mac_address}
                          onChange={(e) => updateSerialRow(idx, "mac_address", e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {serialRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSerialRow(idx)}
                            className="text-red-500 hover:text-red-700 font-bold text-sm px-2 py-1"
                            title="Remove Unit"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-purple-200/70 text-xs font-semibold text-purple-900">
                  Total Units to Stock-In: {serialRows.length} {item.unit}
                </div>
              </div>
            )}

            {/* Total Cost Summary & Submit */}
            {item && (
              <div className="p-3.5 rounded-lg bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-gray-400 block">Total Purchase Value</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {taka(totalCost)}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    ({totalQuantity} {item.unit} × {taka(unitCostNum)})
                  </span>
                </div>

                <button className={`${btn} bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 font-semibold`}>
                  ✓ Confirm Stock-In
                </button>
              </div>
            )}

            <Msg m={msg} />
          </form>
        </Card>
      </div>
    </Need>
  );
}