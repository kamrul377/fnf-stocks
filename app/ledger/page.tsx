// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { db } from "@/lib/firebase";
// import { useQ } from "@/lib/hooks";
// import { StockTransaction } from "@/types/inventory";
// import {
//   collection,
//   deleteDoc,
//   doc,
//   limit,
//   orderBy,
//   query,
//   writeBatch,
// } from "firebase/firestore";
// import { Card, DeleteBtn, Need, Table, btn2, inp } from "@/components/ui";

// const TX_TYPES = [
//   "PURCHASE",
//   "WITHDRAW",
//   "REQUEST_FULFILLED",
//   "RETURN",
//   "ADJUSTMENT",
// ] as const;

// const TYPE_STYLES: Record<string, string> = {
//   PURCHASE:
//     "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
//   WITHDRAW:
//     "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
//   REQUEST_FULFILLED:
//     "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
//   RETURN:
//     "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
//   ADJUSTMENT:
//     "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
// };

// export default function Ledger() {
//   const tx = useQ<StockTransaction>(
//     () => query(collection(db, "transactions"), orderBy("at", "desc"), limit(500)),
//     "t"
//   );

//   const [type, setType] = useState("");
//   const [s, setS] = useState("");
//   const [selectedIds, setSelectedIds] = useState<string[]>([]);
//   const [bulkDeleting, setBulkDeleting] = useState(false);

//   const rows = useMemo(() => {
//     const qStr = s.trim().toLowerCase();
//     return tx.filter((t) => {
//       const matchesType = !type || t.type === type;
//       const matchesSearch =
//         !qStr ||
//         [
//           t.item_name,
//           t.type,
//           t.reference,
//           t.invoice_no,
//           t.note,
//           t.by_name,
//           ...(t.serials ?? []),
//           String(t.qty ?? ""),
//         ]
//           .filter(Boolean)
//           .some((val) => String(val).toLowerCase().includes(qStr));
//       return matchesType && matchesSearch;
//     });
//   }, [tx, type, s]);

//   // Keep selectedIds synced with currently visible/existing rows
//   useEffect(() => {
//     const validIds = new Set(rows.map((r) => r.id).filter(Boolean) as string[]);
//     setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
//   }, [rows]);

//   const allVisibleSelected =
//     rows.length > 0 && rows.every((r) => r.id && selectedIds.includes(r.id));

//   const toggleSelectAll = () => {
//     if (allVisibleSelected) {
//       setSelectedIds([]);
//     } else {
//       setSelectedIds(rows.map((r) => r.id).filter(Boolean) as string[]);
//     }
//   };

//   const toggleSelectOne = (id?: string) => {
//     if (!id) return;
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
//     );
//   };

//   const handleBulkDelete = async () => {
//     if (selectedIds.length === 0 || bulkDeleting) return;
//     const confirmed = window.confirm(
//       `Are you sure you want to delete ${selectedIds.length} selected transaction(s)? This action cannot be undone.`
//     );
//     if (!confirmed) return;

//     setBulkDeleting(true);
//     try {
//       // Firestore batch supports up to 500 operations per batch
//       for (let i = 0; i < selectedIds.length; i += 450) {
//         const chunk = selectedIds.slice(i, i + 450);
//         const batch = writeBatch(db);
//         chunk.forEach((id) => {
//           batch.delete(doc(db, "transactions", id));
//         });
//         await batch.commit();
//       }
//       setSelectedIds([]);
//     } finally {
//       setBulkDeleting(false);
//     }
//   };

//   const csv = () => {
//     const head = ["date", "type", "item", "qty", "serials", "reference", "invoice", "note", "by"];
//     const body = rows.map((t) => [
//       new Date(t.at).toISOString(),
//       t.type,
//       t.item_name,
//       t.qty,
//       (t.serials ?? []).join(" "),
//       t.reference ?? "",
//       t.invoice_no ?? "",
//       t.note ?? "",
//       t.by_name,
//     ]);
//     const text = [head, ...body]
//       .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
//       .join("\n");
//     const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8;" }));
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   const totalQty = useMemo(
//     () => rows.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
//     [rows]
//   );

//   const hasActiveFilters = Boolean(type || s.trim());

//   return (
//     <Need p="can_view_full_ledger">
//       <Card title="Stock Ledger & Audit Log">
//         <div className="space-y-4">
//           {/* Top Summary & Actions */}
//           <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//             <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
//               <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
//                 Showing {rows.length} of {tx.length} entries
//               </span>
//               <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
//                 Total Qty: {totalQty.toLocaleString()}
//               </span>
//             </div>

//             <div className="flex items-center gap-2">
//               {hasActiveFilters && (
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setType("");
//                     setS("");
//                   }}
//                   className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
//                 >
//                   Reset Filters
//                 </button>
//               )}
//               <button
//                 type="button"
//                 className={btn2 + " flex items-center gap-1.5"}
//                 onClick={csv}
//               >
//                 <span>Export CSV</span>
//               </button>
//             </div>
//           </div>

//           {/* Search & Type Filter Bar */}
//           <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
//             <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
//               {/* Search Input */}
//               <div className="relative w-full lg:max-w-sm">
//                 <input
//                   type="text"
//                   className={inp + " w-full pr-8"}
//                   placeholder="Search item, ref, invoice, note, user, serial..."
//                   value={s}
//                   onChange={(e) => setS(e.target.value)}
//                 />
//                 {s && (
//                   <button
//                     type="button"
//                     aria-label="Clear search"
//                     onClick={() => setS("")}
//                     className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-xs text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
//                   >
//                     ✕
//                   </button>
//                 )}
//               </div>

//               {/* Filter chips */}
//               <div className="flex flex-wrap items-center gap-1.5">
//                 <button
//                   type="button"
//                   onClick={() => setType("")}
//                   className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
//                     type === ""
//                       ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900"
//                       : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
//                   }`}
//                 >
//                   All
//                 </button>
//                 {TX_TYPES.map((t) => (
//                   <button
//                     key={t}
//                     type="button"
//                     onClick={() => setType(type === t ? "" : t)}
//                     className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
//                       type === t
//                         ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900"
//                         : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
//                     }`}
//                   >
//                     {t.replace("_", " ")}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Bulk Action Bar (Visible when items are selected) */}
//           {selectedIds.length > 0 && (
//             <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-2.5 text-sm dark:border-rose-900/70 dark:bg-rose-950/40">
//               <div className="flex items-center gap-2 font-medium text-rose-900 dark:text-rose-200">
//                 <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 text-xs font-semibold text-white">
//                   {selectedIds.length}
//                 </span>
//                 <span>selected for deletion</span>
//               </div>

//               <div className="flex items-center gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setSelectedIds([])}
//                   className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-neutral-900 dark:text-rose-200"
//                 >
//                   Clear Selection
//                 </button>
//                 <button
//                   type="button"
//                   disabled={bulkDeleting}
//                   onClick={handleBulkDelete}
//                   className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                   {bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Data Table */}
//           <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
//             <Table
//               head={[
//                 <input
//                   key="select-all"
//                   type="checkbox"
//                   aria-label="Select all visible rows"
//                   checked={allVisibleSelected}
//                   onChange={toggleSelectAll}
//                   className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-rose-600"
//                 />,
//                 "Date",
//                 "Type",
//                 "Item",
//                 "Qty",
//                 "Ref",
//                 "Note",
//                 "By",
//                 "",
//               ]}
//               rows={
//                 rows.length > 0
//                   ? rows.map((t) => {
//                       const isSelected = Boolean(t.id && selectedIds.includes(t.id));
//                       const badgeStyle =
//                         TYPE_STYLES[t.type] ??
//                         "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700";

//                       return [
//                         <input
//                           key={`cb-${t.id}`}
//                           type="checkbox"
//                           aria-label={`Select ${t.item_name}`}
//                           checked={isSelected}
//                           onChange={() => toggleSelectOne(t.id)}
//                           className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-rose-600"
//                         />,
//                         <span
//                           key={`date-${t.id}`}
//                           className="whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-400"
//                         >
//                           {new Date(t.at).toLocaleString()}
//                         </span>,
//                         <span
//                           key={`type-${t.id}`}
//                           className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${badgeStyle}`}
//                         >
//                           {t.type.replace("_", " ")}
//                         </span>,
//                         <div key={`item-${t.id}`} className="font-medium text-neutral-900 dark:text-neutral-100">
//                           {t.item_name}
//                         </div>,
//                         <span
//                           key={`qty-${t.id}`}
//                           className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200"
//                         >
//                           {t.qty}
//                         </span>,
//                         <span
//                           key={`ref-${t.id}`}
//                           className="font-mono text-xs text-neutral-600 dark:text-neutral-400"
//                         >
//                           {t.reference ?? t.invoice_no ?? "—"}
//                         </span>,
//                         <span
//                           key={`note-${t.id}`}
//                           className="block max-w-xs text-xs text-neutral-600 dark:text-neutral-400"
//                           title={t.note ?? ""}
//                         >
//                           {t.note || "—"}
//                         </span>,
//                         <span
//                           key={`by-${t.id}`}
//                           className="text-xs text-neutral-700 dark:text-neutral-300"
//                         >
//                           {t.by_name}
//                         </span>,
//                         <DeleteBtn
//                           key={`del-${t.id}`}
//                           onDelete={async () => {
//                             if (!t.id) return;
//                             await deleteDoc(doc(db, "transactions", t.id));
//                             setSelectedIds((prev) => prev.filter((id) => id !== t.id));
//                           }}
//                         />,
//                       ];
//                     })
//                   : [
//                       [
//                         <td
//                           key="empty"
//                           colSpan={9}
//                           className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
//                         >
//                           No matching ledger entries found.
//                         </td>,
//                       ],
//                     ]
//               }
//             />
//           </div>
//         </div>
//       </Card>
//     </Need>
//   );
// }




"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { useQ } from "@/lib/hooks";
import { StockTransaction } from "@/types/inventory";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import { Card, DeleteBtn, Need, Table, btn2, inp } from "@/components/ui";

const TX_TYPES = [
  "PURCHASE",
  "WITHDRAW",
  "REQUEST_FULFILLED",
  "RETURN",
  "ADJUSTMENT",
] as const;

const TYPE_STYLES: Record<string, string> = {
  PURCHASE:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  WITHDRAW:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
  REQUEST_FULFILLED:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  RETURN:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  ADJUSTMENT:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
};

export default function Ledger() {
  const tx = useQ<StockTransaction>(
    () => query(collection(db, "transactions"), orderBy("at", "desc"), limit(500)),
    "t"
  );

  const [type, setType] = useState("");
  const [s, setS] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const rows = useMemo(() => {
    const qStr = s.trim().toLowerCase();

    return tx.filter((t) => {
      const matchesType = !type || t.type === type;

      const matchesSearch =
        !qStr ||
        [
          t.item_name,
          t.type,
          t.reference,
          t.invoice_no,
          t.note,
          t.by_name,
          ...(t.serials ?? []),
          String(t.qty ?? ""),
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(qStr));

      return matchesType && matchesSearch;
    });
  }, [tx, type, s]);

  // Keep selectedIds synced with currently visible/existing rows
  useEffect(() => {
    const validIds = new Set(
      rows.map((r) => r.id).filter(Boolean) as string[]
    );

    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [rows]);

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => r.id && selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id).filter(Boolean) as string[]);
    }
  };

  const toggleSelectOne = (id?: string) => {
    if (!id) return;

    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || bulkDeleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.length} selected transaction(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setBulkDeleting(true);

    try {
      // Firestore batch supports up to 500 operations per batch
      for (let i = 0; i < selectedIds.length; i += 450) {
        const chunk = selectedIds.slice(i, i + 450);
        const batch = writeBatch(db);

        chunk.forEach((id) => {
          batch.delete(doc(db, "transactions", id));
        });

        await batch.commit();
      }

      setSelectedIds([]);
    } finally {
      setBulkDeleting(false);
    }
  };

  const csv = () => {
    const head = [
      "date",
      "type",
      "item",
      "qty",
      "serials",
      "reference",
      "invoice",
      "note",
      "by",
    ];

    const body = rows.map((t) => [
      new Date(t.at).toISOString(),
      t.type,
      t.item_name,
      t.qty,
      (t.serials ?? []).join(" "),
      t.reference ?? "",
      t.invoice_no ?? "",
      t.note ?? "",
      t.by_name,
    ]);

    const text = [head, ...body]
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8;" })
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const totalQty = useMemo(
    () => rows.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    [rows]
  );

  const hasActiveFilters = Boolean(type || s.trim());

  return (
    <Need p="can_view_full_ledger">
      <Card title="Stock Ledger & Audit Log">
        <div className="space-y-4">
          {/* Top Summary & Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                Showing {rows.length} of {tx.length} entries
              </span>

              <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                Total Qty: {totalQty.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setType("");
                    setS("");
                  }}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Reset Filters
                </button>
              )}

              <button
                type="button"
                className={btn2 + " flex items-center gap-1.5"}
                onClick={csv}
              >
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Type Filter Bar */}
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Input */}
              <div className="relative w-full lg:max-w-sm">
                <input
                  type="text"
                  className={inp + " w-full pr-8"}
                  placeholder="Search item, ref, invoice, note, user, serial..."
                  value={s}
                  onChange={(e) => setS(e.target.value)}
                />

                {s && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setS("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-xs text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setType("")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    type === ""
                      ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  All
                </button>

                {TX_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(type === t ? "" : t)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      type === t
                        ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900"
                        : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-2.5 text-sm dark:border-rose-900/70 dark:bg-rose-950/40">
              <div className="flex items-center gap-2 font-medium text-rose-900 dark:text-rose-200">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 text-xs font-semibold text-white">
                  {selectedIds.length}
                </span>

                <span>selected for deletion</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-neutral-900 dark:text-rose-200"
                >
                  Clear Selection
                </button>

                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={handleBulkDelete}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkDeleting
                    ? "Deleting..."
                    : `Delete Selected (${selectedIds.length})`}
                </button>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            {/* Select All - moved outside Table head to fix TypeScript error */}
            <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
              <input
                type="checkbox"
                aria-label="Select all visible rows"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-rose-600"
              />
              <span>
                {allVisibleSelected
                  ? "Deselect all visible rows"
                  : "Select all visible rows"}
              </span>
            </div>

            <Table
              head={[
                "Select",
                "Date",
                "Type",
                "Item",
                "Qty",
                "Ref",
                "Note",
                "By",
                "",
              ]}
              rows={
                rows.length > 0
                  ? rows.map((t) => {
                      const isSelected = Boolean(
                        t.id && selectedIds.includes(t.id)
                      );

                      const badgeStyle =
                        TYPE_STYLES[t.type] ??
                        "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700";

                      return [
                        <input
                          key={`cb-${t.id}`}
                          type="checkbox"
                          aria-label={`Select ${t.item_name}`}
                          checked={isSelected}
                          onChange={() => toggleSelectOne(t.id)}
                          className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-rose-600"
                        />,

                        <span
                          key={`date-${t.id}`}
                          className="whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-400"
                        >
                          {new Date(t.at).toLocaleString()}
                        </span>,

                        <span
                          key={`type-${t.id}`}
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${badgeStyle}`}
                        >
                          {t.type.replace("_", " ")}
                        </span>,

                        <div
                          key={`item-${t.id}`}
                          className="font-medium text-neutral-900 dark:text-neutral-100"
                        >
                          {t.item_name}
                        </div>,

                        <span
                          key={`qty-${t.id}`}
                          className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200"
                        >
                          {t.qty}
                        </span>,

                        <span
                          key={`ref-${t.id}`}
                          className="font-mono text-xs text-neutral-600 dark:text-neutral-400"
                        >
                          {t.reference ?? t.invoice_no ?? "—"}
                        </span>,

                        <span
                          key={`note-${t.id}`}
                          className="block max-w-xs text-xs text-neutral-600 dark:text-neutral-400"
                          title={t.note ?? ""}
                        >
                          {t.note || "—"}
                        </span>,

                        <span
                          key={`by-${t.id}`}
                          className="text-xs text-neutral-700 dark:text-neutral-300"
                        >
                          {t.by_name}
                        </span>,

                        <DeleteBtn
                          key={`del-${t.id}`}
                          onDelete={async () => {
                            if (!t.id) return;

                            await deleteDoc(
                              doc(db, "transactions", t.id)
                            );

                            setSelectedIds((prev) =>
                              prev.filter((id) => id !== t.id)
                            );
                          }}
                        />,
                      ];
                    })
                  : [
                      [
                        <td
                          key="empty"
                          colSpan={9}
                          className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
                        >
                          No matching ledger entries found.
                        </td>,
                      ],
                    ]
              }
            />
          </div>
        </div>
      </Card>
    </Need>
  );
}
