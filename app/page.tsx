"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { InventoryItem } from "@/types/inventory";

const taka = (n: number) => "৳" + Math.round(n).toLocaleString("en-BD");

export default function Dashboard() {
  const { can } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  useEffect(() => onSnapshot(collection(db, "items"), s => setItems(s.docs.map(d => ({ ...(d.data() as InventoryItem), id: d.id }))), () => {}), []);
  const low = items.filter(i => i.current_stock <= i.min_stock);
  const value = items.reduce((a, i) => a + i.current_stock * i.avg_unit_cost, 0);
  const card = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5";
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}><div className="text-sm text-slate-500">Items</div><div className="text-2xl font-semibold">{items.length}</div></div>
        <div className={card}><div className="text-sm text-slate-500">Low stock</div><div className="text-2xl font-semibold text-amber-600">{low.length}</div></div>
        {can("can_view_dashboard_financials") && <div className={card}><div className="text-sm text-slate-500">Stock value</div><div className="text-2xl font-semibold text-brand">{taka(value)}</div></div>}
      </div>
      <div className={card}>
        <h2 className="font-semibold mb-3">Low Stock Alerts</h2>
        {low.length === 0 ? <p className="text-sm text-slate-500">All good.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Item</th><th>Stock</th><th>Min</th></tr></thead>
            <tbody>{low.map(i => <tr key={i.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2">{i.name}</td><td>{i.current_stock} {i.unit}</td><td>{i.min_stock}</td></tr>)}</tbody></table></div>)}
      </div>
    </div>
  );
}
