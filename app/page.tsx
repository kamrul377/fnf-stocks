"use client";
import { useMemo, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { InventoryItem } from "@/types/inventory";

const taka = (n: number) => "৳" + Math.round(n).toLocaleString("en-BD");
const num = (n: number) => n.toLocaleString("en-BD");

type Status = "OUT" | "LOW" | "IN";
const statusOf = (i: InventoryItem): Status =>
  i.current_stock <= 0 ? "OUT" : i.current_stock <= i.min_stock ? "LOW" : "IN";

const BADGE: Record<Status, { label: string; cls: string; bar: string }> = {
  OUT: { label: "Out of stock", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", bar: "bg-red-500" },
  LOW: { label: "Low stock", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", bar: "bg-amber-500" },
  IN: { label: "In stock", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", bar: "bg-emerald-500" },
};
const TYPE_LABEL = { SERIALIZED: "Device (serial/MAC)", LENGTH_BASED: "Fiber / Cable (length)", QUANTITY_BASED: "Quantity" };
const ORDER: Record<Status, number> = { OUT: 0, LOW: 1, IN: 2 };

export default function Dashboard() {
  const { can } = useAuth();
  const items = useQ<InventoryItem>(() => collection(db, "items"), "items");
  const [tab, setTab] = useState<"ALL" | Status>("ALL");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => ({
    ALL: items.length,
    IN: items.filter(i => statusOf(i) === "IN").length,
    LOW: items.filter(i => statusOf(i) === "LOW").length,
    OUT: items.filter(i => statusOf(i) === "OUT").length,
  }), [items]);

  const totalValue = items.reduce((a, i) => a + i.current_stock * i.avg_unit_cost, 0);
  const showMoney = can("can_view_dashboard_financials");

  const rows = items
    .filter(i => tab === "ALL" || statusOf(i) === tab)
    .filter(i => !search || `${i.name} ${i.brand_model} ${i.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => ORDER[statusOf(a)] - ORDER[statusOf(b)] || a.name.localeCompare(b.name));

  const card = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5";
  const tabs: { key: "ALL" | Status; label: string }[] = [
    { key: "ALL", label: "All" }, { key: "IN", label: "In stock" },
    { key: "LOW", label: "Low" }, { key: "OUT", label: "Out of stock" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards (click to filter) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <button onClick={() => setTab("ALL")} className={`${card} text-left`}>
          <div className="text-sm text-slate-500">Total products</div>
          <div className="text-2xl font-semibold">{counts.ALL}</div>
        </button>
        <button onClick={() => setTab("IN")} className={`${card} text-left`}>
          <div className="text-sm text-slate-500">In stock</div>
          <div className="text-2xl font-semibold text-emerald-600">{counts.IN}</div>
        </button>
        <button onClick={() => setTab("LOW")} className={`${card} text-left`}>
          <div className="text-sm text-slate-500">Low stock</div>
          <div className="text-2xl font-semibold text-amber-600">{counts.LOW}</div>
        </button>
        <button onClick={() => setTab("OUT")} className={`${card} text-left`}>
          <div className="text-sm text-slate-500">Out of stock</div>
          <div className="text-2xl font-semibold text-red-600">{counts.OUT}</div>
        </button>
        {showMoney && (
          <div className={card}>
            <div className="text-sm text-slate-500">Total stock value</div>
            <div className="text-2xl font-semibold text-brand">{taka(totalValue)}</div>
          </div>
        )}
      </div>

      {/* Stock table */}
      <div className={card}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h2 className="font-semibold mr-2">Current Stock</h2>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1 text-sm border transition ${tab === t.key
                ? "bg-brand text-white border-brand" : "border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product…"
            className="ml-auto w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm" />
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No products yet. Admin can seed the catalog from Settings → Access & Permissions.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No products match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Product</th>
                  <th className="pr-3">Type</th>
                  <th className="pr-3">Available</th>
                  <th className="pr-3">Alert at</th>
                  <th className="pr-3">Status</th>
                  {showMoney && <th className="text-right">Value</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(i => {
                  const st = statusOf(i), b = BADGE[st];
                  const pct = Math.min(100, (i.current_stock / Math.max(i.min_stock * 2, 1)) * 100);
                  return (
                    <tr key={i.id} className="border-t border-slate-100 dark:border-slate-800 align-middle">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{i.name}</div>
                        <div className="text-xs text-slate-500">{[i.brand_model, i.category].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="pr-3 text-slate-600 dark:text-slate-300">{TYPE_LABEL[i.tracking]}</td>
                      <td className="pr-3 min-w-[9rem]">
                        <div className="font-semibold">{num(i.current_stock)} {i.unit}</div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className={`h-1.5 rounded-full ${b.bar}`} style={{ width: `${st === "OUT" ? 0 : Math.max(pct, 4)}%` }} />
                        </div>
                      </td>
                      <td className="pr-3 text-slate-500">{num(i.min_stock)} {i.unit}</td>
                      <td className="pr-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.cls}`}>{b.label}</span></td>
                      {showMoney && <td className="text-right">{taka(i.current_stock * i.avg_unit_cost)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}