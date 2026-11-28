// "use client";
// import { useState, useRef } from "react";
// import { collection, deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useQ, useAction } from "@/lib/hooks";
// import { InventoryItem, Tracking, Unit } from "@/types/inventory";
// import { Card, Msg, Need, Table, btn, inp, taka } from "@/components/ui";

// type ItemFormState = {
//   name: string;
//   brand_model: string;
//   category: string;
//   unit: Unit;
//   tracking: Tracking;
//   min_stock: number;
//   image_url: string;
// };

// const emptyForm: ItemFormState = {
//   name: "",
//   brand_model: "",
//   category: "",
//   unit: "pcs",
//   tracking: "QUANTITY_BASED",
//   min_stock: 0,
//   image_url: "",
// };

// export default function Items() {
//   const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
//   const { msg, run } = useAction();

//   // Create form states
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [search, setSearch] = useState("");
//   const [imagePreview, setImagePreview] = useState<string>("");
//   const [f, setF] = useState<ItemFormState>(emptyForm);

//   // Edit modal states
//   const editFileInputRef = useRef<HTMLInputElement>(null);
//   const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
//   const [editForm, setEditForm] = useState<ItemFormState>(emptyForm);
//   const [editPreview, setEditPreview] = useState<string>("");

//   // Delete confirmation state
//   const [deletingId, setDeletingId] = useState<string | null>(null);

//   // ছবি সিলেক্ট করে Base64 এ রূপান্তর করার কমন হেল্পার
//   const processImageFile = (
//     file: File | undefined,
//     inputRef: React.RefObject<HTMLInputElement | null>,
//     onSuccess: (base64: string) => void
//   ) => {
//     if (!file) return;

//     if (file.size > 500 * 1024) {
//       alert("ছবির সাইজ ৫০০ KB এর কম হতে হবে! দয়া করে ছোট সাইজের ছবি দিন।");
//       if (inputRef.current) inputRef.current.value = "";
//       return;
//     }

//     const reader = new FileReader();
//     reader.onloadend = () => {
//       const base64String = reader.result as string;
//       onSuccess(base64String);
//     };
//     reader.readAsDataURL(file);
//   };

//   // Create ফর্মের ছবি হ্যান্ডলার
//   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     processImageFile(e.target.files?.[0], fileInputRef, (base64) => {
//       setImagePreview(base64);
//       setF((prev) => ({ ...prev, image_url: base64 }));
//     });
//   };

//   const removeImage = () => {
//     setImagePreview("");
//     setF((prev) => ({ ...prev, image_url: "" }));
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   // নতুন আইটেম তৈরি
//   const add = (e: React.FormEvent) => {
//     e.preventDefault();
//     run(async () => {
//       const ref = doc(collection(db, "items"));
//       await setDoc(ref, {
//         ...f,
//         id: ref.id,
//         current_stock: 0,
//         avg_unit_cost: 0,
//       });
//       setF(emptyForm);
//       setImagePreview("");
//       if (fileInputRef.current) fileInputRef.current.value = "";
//     }, "Item created successfully!");
//   };

//   // Edit মোডাল ওপেন করা
//   const openEdit = (item: InventoryItem) => {
//     const anyItem = item as any;
//     setEditingItem(item);
//     setEditForm({
//       name: item.name || "",
//       brand_model: item.brand_model || "",
//       category: item.category || "",
//       unit: item.unit || "pcs",
//       tracking: item.tracking || "QUANTITY_BASED",
//       min_stock: item.min_stock ?? 0,
//       image_url: anyItem.image_url || "",
//     });
//     setEditPreview(anyItem.image_url || "");
//     if (editFileInputRef.current) editFileInputRef.current.value = "";
//   };

//   const closeEdit = () => {
//     setEditingItem(null);
//     setEditForm(emptyForm);
//     setEditPreview("");
//     if (editFileInputRef.current) editFileInputRef.current.value = "";
//   };

//   // Edit ফর্মের ছবি হ্যান্ডলার
//   const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     processImageFile(e.target.files?.[0], editFileInputRef, (base64) => {
//       setEditPreview(base64);
//       setEditForm((prev) => ({ ...prev, image_url: base64 }));
//     });
//   };

//   const removeEditImage = () => {
//     setEditPreview("");
//     setEditForm((prev) => ({ ...prev, image_url: "" }));
//     if (editFileInputRef.current) editFileInputRef.current.value = "";
//   };

//   // আইটেম আপডেট সেভ করা
//   const saveEdit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!editingItem) return;

//     const targetId = editingItem.id;
//     run(async () => {
//       await updateDoc(doc(db, "items", targetId), {
//         name: editForm.name.trim(),
//         brand_model: editForm.brand_model.trim(),
//         category: editForm.category.trim(),
//         unit: editForm.unit,
//         tracking: editForm.tracking,
//         min_stock: Number(editForm.min_stock) || 0,
//         image_url: editForm.image_url,
//       });
//       closeEdit();
//     }, "Item updated successfully!");
//   };

//   // আইটেম ডিলিট করা
//   const handleDelete = (item: InventoryItem) => {
//     const confirmed = window.confirm(
//       `"${item.name}" আইটেমটি কি আপনি নিশ্চিতভাবে ডিলিট করতে চান?`
//     );
//     if (!confirmed) return;

//     setDeletingId(item.id);
//     run(async () => {
//       await deleteDoc(doc(db, "items", item.id));
//     }, `"${item.name}" deleted successfully!`).finally(() => {
//       setDeletingId(null);
//     });
//   };

//   // সার্চ ফিল্টার
//   const filteredItems = items.filter(
//     (i) =>
//       i.name.toLowerCase().includes(search.toLowerCase()) ||
//       i.category.toLowerCase().includes(search.toLowerCase()) ||
//       (i.brand_model && i.brand_model.toLowerCase().includes(search.toLowerCase()))
//   );

//   // ট্র্যাকিং টাইপ ব্যাজ
//   const formatTracking = (t: string) => {
//     switch (t) {
//       case "QUANTITY_BASED":
//         return (
//           <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
//             Quantity
//           </span>
//         );
//       case "SERIALIZED":
//         return (
//           <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
//             Serialized
//           </span>
//         );
//       case "LENGTH_BASED":
//         return (
//           <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
//             Length / Drum
//           </span>
//         );
//       default:
//         return t;
//     }
//   };

//   return (
//     <Need p="can_create_edit_items">
//       <div className="space-y-6 max-w-6xl mx-auto">
//         {/* Create Item Section */}
//         <Card title="Create New Inventory Item">
//           <form onSubmit={add} className="space-y-4">
//             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//               {/* Item Name */}
//               <div className="space-y-1">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                   Item Name *
//                 </label>
//                 <input
//                   className={inp}
//                   placeholder="e.g. Optical Fiber Cable"
//                   value={f.name}
//                   onChange={(e) => setF({ ...f, name: e.target.value })}
//                   required
//                 />
//               </div>

//               {/* Brand / Model */}
//               <div className="space-y-1">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                   Brand / Model
//                 </label>
//                 <input
//                   className={inp}
//                   placeholder="e.g. MikroTik RB750Gr3"
//                   value={f.brand_model}
//                   onChange={(e) => setF({ ...f, brand_model: e.target.value })}
//                 />
//               </div>

//               {/* Category */}
//               <div className="space-y-1">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                   Category *
//                 </label>
//                 <input
//                   className={inp}
//                   placeholder="e.g. Router, Cable, ONU"
//                   value={f.category}
//                   onChange={(e) => setF({ ...f, category: e.target.value })}
//                   required
//                 />
//               </div>

//               {/* Unit */}
//               <div className="space-y-1">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                   Unit
//                 </label>
//                 <select
//                   className={inp}
//                   value={f.unit}
//                   onChange={(e) => setF({ ...f, unit: e.target.value as Unit })}
//                 >
//                   {["pcs", "meter", "feet", "roll", "box"].map((u) => (
//                     <option key={u} value={u}>
//                       {u.toUpperCase()}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Tracking Type */}
//               <div className="space-y-1">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                   Tracking Method
//                 </label>
//                 <select
//                   className={inp}
//                   value={f.tracking}
//                   onChange={(e) => setF({ ...f, tracking: e.target.value as Tracking })}
//                 >
//                   <option value="QUANTITY_BASED">Quantity Based (General)</option>
//                   <option value="SERIALIZED">Serialized (MAC / SN)</option>
//                   <option value="LENGTH_BASED">Length Based (Cable/Drum)</option>
//                 </select>
//               </div>

//               {/* Min Stock */}
//               <div className="space-y-1">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                   Min Stock Alert
//                 </label>
//                 <input
//                   className={inp}
//                   type="number"
//                   min={0}
//                   placeholder="0"
//                   value={f.min_stock}
//                   onChange={(e) => setF({ ...f, min_stock: Number(e.target.value) })}
//                 />
//               </div>
//             </div>

//             {/* Image Upload & Submit Row */}
//             <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//               <div className="flex items-center gap-4">
//                 {imagePreview ? (
//                   <div className="relative w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
//                     <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
//                     <button
//                       type="button"
//                       onClick={removeImage}
//                       className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 cursor-pointer"
//                       title="Remove Image"
//                     >
//                       ✕
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs text-center p-1 bg-slate-50 dark:bg-slate-800/50 shrink-0">
//                     No Image
//                   </div>
//                 )}

//                 <div className="space-y-1">
//                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                     Item Photo (Optional)
//                   </label>
//                   <input
//                     ref={fileInputRef}
//                     type="file"
//                     accept="image/*"
//                     onChange={handleImageChange}
//                     className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 cursor-pointer"
//                   />
//                   <p className="text-[11px] text-slate-400">Max size: 500KB (JPG, PNG, WebP)</p>
//                 </div>
//               </div>

//               <button className={`${btn} sm:w-auto w-full px-6 py-2.5 font-medium cursor-pointer`}>
//                 + Create Item
//               </button>
//             </div>
//           </form>
//           <div className="mt-2">
//             <Msg m={msg} />
//           </div>
//         </Card>

//         {/* Items List Section */}
//         <Card title={`Inventory Items (${filteredItems.length})`}>
//           {/* Search Bar */}
//           <div className="mb-4 max-w-sm">
//             <input
//               type="text"
//               className={inp}
//               placeholder="Search by item name, brand, or category..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//           </div>

//           <Table
//             head={[
//               "Item Details",
//               "Category",
//               "Tracking",
//               "Current Stock",
//               "Min Alert",
//               "Avg Cost",
//               "Actions",
//             ]}
//             rows={filteredItems.map((i: any) => {
//               const isLowStock = i.current_stock <= i.min_stock;
//               const isDeleting = deletingId === i.id;

//               return [
//                 // Item Image + Name + Brand
//                 <div key={`${i.id}-details`} className="flex items-center gap-3 py-1">
//                   {i.image_url ? (
//                     <img
//                       src={i.image_url}
//                       alt={i.name}
//                       className="w-10 h-10 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
//                     />
//                   ) : (
//                     <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-medium shrink-0">
//                       N/A
//                     </div>
//                   )}
//                   <div>
//                     <div className="font-semibold text-slate-800 dark:text-slate-100">{i.name}</div>
//                     {i.brand_model && (
//                       <div className="text-xs text-slate-500 dark:text-slate-400">
//                         {i.brand_model}
//                       </div>
//                     )}
//                   </div>
//                 </div>,

//                 // Category
//                 <span key={`${i.id}-cat`} className="text-slate-700 dark:text-slate-300 font-medium">
//                   {i.category}
//                 </span>,

//                 // Tracking Badge
//                 <span key={`${i.id}-track`}>{formatTracking(i.tracking)}</span>,

//                 // Current Stock with Low Stock Warning
//                 <div key={`${i.id}-stock`} className="flex items-center gap-2">
//                   <span
//                     className={`font-semibold ${isLowStock
//                         ? "text-red-600 dark:text-red-400"
//                         : "text-slate-800 dark:text-slate-100"
//                       }`}
//                   >
//                     {i.current_stock} {i.unit}
//                   </span>
//                   {isLowStock && (
//                     <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 rounded">
//                       LOW
//                     </span>
//                   )}
//                 </div>,

//                 // Min Stock
//                 <span key={`${i.id}-min`} className="text-slate-500 dark:text-slate-400">
//                   {i.min_stock} {i.unit}
//                 </span>,

//                 // Avg Cost
//                 <span
//                   key={`${i.id}-cost`}
//                   className="font-medium text-slate-800 dark:text-slate-200"
//                 >
//                   {taka(i.avg_unit_cost)}
//                 </span>,

//                 // Edit & Delete Actions
//                 <div key={`${i.id}-actions`} className="flex items-center gap-2">
//                   <button
//                     type="button"
//                     onClick={() => openEdit(i)}
//                     className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/25 transition cursor-pointer"
//                   >
//                     Edit
//                   </button>
//                   <button
//                     type="button"
//                     disabled={isDeleting}
//                     onClick={() => handleDelete(i)}
//                     className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30 dark:hover:bg-red-500/25 transition disabled:opacity-50 cursor-pointer"
//                   >
//                     {isDeleting ? "Deleting..." : "Delete"}
//                   </button>
//                 </div>,
//               ];
//             })}
//           />
//         </Card>

//         {/* Edit Item Modal */}
//         {editingItem && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
//             <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
//               <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
//                 <div>
//                   <h3 className="text-base font-bold text-slate-900 dark:text-white">
//                     Edit Item — {editingItem.name}
//                   </h3>
//                   <p className="text-xs text-slate-500 dark:text-slate-400">
//                     Update item information, alert threshold, or photo
//                   </p>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={closeEdit}
//                   className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer"
//                 >
//                   ✕
//                 </button>
//               </div>

//               <form onSubmit={saveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
//                 <div className="grid gap-4 sm:grid-cols-2">
//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Item Name *
//                     </label>
//                     <input
//                       className={inp}
//                       value={editForm.name}
//                       onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
//                       required
//                     />
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Brand / Model
//                     </label>
//                     <input
//                       className={inp}
//                       value={editForm.brand_model}
//                       onChange={(e) => setEditForm({ ...editForm, brand_model: e.target.value })}
//                     />
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Category *
//                     </label>
//                     <input
//                       className={inp}
//                       value={editForm.category}
//                       onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
//                       required
//                     />
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Unit
//                     </label>
//                     <select
//                       className={inp}
//                       value={editForm.unit}
//                       onChange={(e) => setEditForm({ ...editForm, unit: e.target.value as Unit })}
//                     >
//                       {["pcs", "meter", "feet", "roll", "box"].map((u) => (
//                         <option key={u} value={u}>
//                           {u.toUpperCase()}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Tracking Method
//                     </label>
//                     <select
//                       className={inp}
//                       value={editForm.tracking}
//                       onChange={(e) =>
//                         setEditForm({ ...editForm, tracking: e.target.value as Tracking })
//                       }
//                     >
//                       <option value="QUANTITY_BASED">Quantity Based (General)</option>
//                       <option value="SERIALIZED">Serialized (MAC / SN)</option>
//                       <option value="LENGTH_BASED">Length Based (Cable/Drum)</option>
//                     </select>
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Min Stock Alert
//                     </label>
//                     <input
//                       className={inp}
//                       type="number"
//                       min={0}
//                       value={editForm.min_stock}
//                       onChange={(e) =>
//                         setEditForm({ ...editForm, min_stock: Number(e.target.value) })
//                       }
//                     />
//                   </div>
//                 </div>

//                 {/* Edit Image Section */}
//                 <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
//                   {editPreview ? (
//                     <div className="relative w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
//                       <img src={editPreview} alt="Edit Preview" className="w-full h-full object-cover" />
//                       <button
//                         type="button"
//                         onClick={removeEditImage}
//                         className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 cursor-pointer"
//                         title="Remove Image"
//                       >
//                         ✕
//                       </button>
//                     </div>
//                   ) : (
//                     <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs text-center p-1 bg-slate-50 dark:bg-slate-800/50 shrink-0">
//                       No Image
//                     </div>
//                   )}

//                   <div className="space-y-1 flex-1">
//                     <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Change Item Photo (Max 500KB)
//                     </label>
//                     <input
//                       ref={editFileInputRef}
//                       type="file"
//                       accept="image/*"
//                       onChange={handleEditImageChange}
//                       className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 cursor-pointer"
//                     />
//                   </div>
//                 </div>

//                 <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
//                   <button
//                     type="button"
//                     onClick={closeEdit}
//                     className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     type="submit"
//                     className={`${btn} px-5 py-2 text-xs font-semibold cursor-pointer`}
//                   >
//                     Save Changes
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}
//       </div>
//     </Need>
//   );
// }



// "use client";

// import { useMemo, useRef, useState } from "react";
// import {
//   addDoc,
//   collection,
//   deleteDoc,
//   doc,
//   setDoc,
//   updateDoc,
// } from "firebase/firestore";
// import { auth, db } from "@/lib/firebase";
// import { useQ, useAction } from "@/lib/hooks";
// import { InventoryItem, Tracking, Unit } from "@/types/inventory";
// import { Card, Msg, Need, Table, btn, inp, taka } from "@/components/ui";

// type ItemFormState = {
//   name: string;
//   brand_model: string;
//   category: string;
//   unit: Unit;
//   tracking: Tracking;
//   min_stock: number;
//   image_url: string;
// };

// const emptyForm: ItemFormState = {
//   name: "",
//   brand_model: "",
//   category: "",
//   unit: "pcs",
//   tracking: "QUANTITY_BASED",
//   min_stock: 0,
//   image_url: "",
// };

// export default function Items() {
//   const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
//   const { msg, run } = useAction();

//   // Create form states
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [search, setSearch] = useState("");
//   const [categoryFilter, setCategoryFilter] = useState("");
//   const [onlyLowStock, setOnlyLowStock] = useState(false);
//   const [imagePreview, setImagePreview] = useState<string>("");
//   const [f, setF] = useState<ItemFormState>(emptyForm);

//   // Edit modal states
//   const editFileInputRef = useRef<HTMLInputElement>(null);
//   const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
//   const [editForm, setEditForm] = useState<ItemFormState>(emptyForm);
//   const [editPreview, setEditPreview] = useState<string>("");

//   // Action loading states
//   const [deletingId, setDeletingId] = useState<string | null>(null);
//   const [clearingId, setClearingId] = useState<string | null>(null);

//   // ছবি সিলেক্ট করে Base64 এ রূপান্তর করার কমন হেল্পার
//   const processImageFile = (
//     file: File | undefined,
//     inputRef: React.RefObject<HTMLInputElement | null>,
//     onSuccess: (base64: string) => void
//   ) => {
//     if (!file) return;

//     if (file.size > 500 * 1024) {
//       alert("ছবির সাইজ ৫০০ KB এর কম হতে হবে! দয়া করে ছোট সাইজের ছবি দিন।");
//       if (inputRef.current) inputRef.current.value = "";
//       return;
//     }

//     const reader = new FileReader();
//     reader.onloadend = () => {
//       const base64String = reader.result as string;
//       onSuccess(base64String);
//     };
//     reader.readAsDataURL(file);
//   };

//   // Create ফর্মের ছবি হ্যান্ডলার
//   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     processImageFile(e.target.files?.[0], fileInputRef, (base64) => {
//       setImagePreview(base64);
//       setF((prev) => ({ ...prev, image_url: base64 }));
//     });
//   };

//   const removeImage = () => {
//     setImagePreview("");
//     setF((prev) => ({ ...prev, image_url: "" }));
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   // নতুন আইটেম তৈরি
//   const add = (e: React.FormEvent) => {
//     e.preventDefault();
//     run(async () => {
//       const ref = doc(collection(db, "items"));
//       await setDoc(ref, {
//         ...f,
//         name: f.name.trim(),
//         brand_model: f.brand_model.trim(),
//         category: f.category.trim(),
//         id: ref.id,
//         current_stock: 0,
//         avg_unit_cost: 0,
//       });
//       setF(emptyForm);
//       setImagePreview("");
//       if (fileInputRef.current) fileInputRef.current.value = "";
//     }, "Item created successfully!");
//   };

//   // Edit মোডাল ওপেন করা
//   const openEdit = (item: InventoryItem) => {
//     const anyItem = item as any;
//     setEditingItem(item);
//     setEditForm({
//       name: item.name || "",
//       brand_model: item.brand_model || "",
//       category: item.category || "",
//       unit: item.unit || "pcs",
//       tracking: item.tracking || "QUANTITY_BASED",
//       min_stock: item.min_stock ?? 0,
//       image_url: anyItem.image_url || "",
//     });
//     setEditPreview(anyItem.image_url || "");
//     if (editFileInputRef.current) editFileInputRef.current.value = "";
//   };

//   const closeEdit = () => {
//     setEditingItem(null);
//     setEditForm(emptyForm);
//     setEditPreview("");
//     if (editFileInputRef.current) editFileInputRef.current.value = "";
//   };

//   // Edit ফর্মের ছবি হ্যান্ডলার
//   const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     processImageFile(e.target.files?.[0], editFileInputRef, (base64) => {
//       setEditPreview(base64);
//       setEditForm((prev) => ({ ...prev, image_url: base64 }));
//     });
//   };

//   const removeEditImage = () => {
//     setEditPreview("");
//     setEditForm((prev) => ({ ...prev, image_url: "" }));
//     if (editFileInputRef.current) editFileInputRef.current.value = "";
//   };

//   // আইটেম আপডেট সেভ করা
//   const saveEdit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!editingItem) return;

//     const targetId = editingItem.id;
//     run(async () => {
//       await updateDoc(doc(db, "items", targetId), {
//         name: editForm.name.trim(),
//         brand_model: editForm.brand_model.trim(),
//         category: editForm.category.trim(),
//         unit: editForm.unit,
//         tracking: editForm.tracking,
//         min_stock: Number(editForm.min_stock) || 0,
//         image_url: editForm.image_url,
//       });
//       closeEdit();
//     }, "Item updated successfully!");
//   };

//   // আইটেমের বর্তমান স্টক Clear (0) করা (Only users with "can_clear_stock" permission)
//   const handleClearStock = (item: any) => {
//     const prevStock = Number(item.current_stock) || 0;
//     if (prevStock === 0) return;

//     const confirmed = window.confirm(
//       `"${item.name}" এর বর্তমান স্টক (${prevStock} ${item.unit}) কি আপনি 0 করতে চান?`
//     );
//     if (!confirmed) return;

//     setClearingId(item.id);
//     run(async () => {
//       await updateDoc(doc(db, "items", item.id), {
//         current_stock: 0,
//       });

//       const user = auth.currentUser;
//       await addDoc(collection(db, "transactions"), {
//         at: Date.now(),
//         type: "ADJUSTMENT",
//         item_id: item.id,
//         item_name: item.name,
//         qty: -prevStock,
//         reference: "STOCK_CLEARED",
//         by_name: user?.displayName || user?.email || "System Admin",
//       });
//     }, `"${item.name}" stock cleared to 0!`).finally(() => {
//       setClearingId(null);
//     });
//   };

//   // আইটেম ডিলিট করা
//   const handleDelete = (item: InventoryItem) => {
//     const confirmed = window.confirm(
//       `"${item.name}" আইটেমটি কি আপনি নিশ্চিতভাবে ডিলিট করতে চান?`
//     );
//     if (!confirmed) return;

//     setDeletingId(item.id);
//     run(async () => {
//       await deleteDoc(doc(db, "items", item.id));
//     }, `"${item.name}" deleted successfully!`).finally(() => {
//       setDeletingId(null);
//     });
//   };

//   // Unique categories for quick filter
//   const categories = useMemo(() => {
//     const set = new Set(
//       items.map((i) => i.category?.trim()).filter(Boolean) as string[]
//     );
//     return Array.from(set).sort();
//   }, [items]);

//   // সার্চ ও ফিল্টার
//   const filteredItems = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     return items.filter((i: any) => {
//       const matchesSearch =
//         !q ||
//         i.name?.toLowerCase().includes(q) ||
//         i.category?.toLowerCase().includes(q) ||
//         (i.brand_model && i.brand_model.toLowerCase().includes(q));
//       const matchesCategory = !categoryFilter || i.category === categoryFilter;
//       const matchesLow =
//         !onlyLowStock ||
//         (Number(i.current_stock) || 0) <= (Number(i.min_stock) || 0);
//       return matchesSearch && matchesCategory && matchesLow;
//     });
//   }, [items, search, categoryFilter, onlyLowStock]);

//   // Quick summary stats
//   const stats = useMemo(() => {
//     const totalItems = items.length;
//     const lowStockCount = items.filter(
//       (i: any) => (Number(i.current_stock) || 0) <= (Number(i.min_stock) || 0)
//     ).length;
//     const totalValue = items.reduce(
//       (sum, i: any) =>
//         sum + (Number(i.current_stock) || 0) * (Number(i.avg_unit_cost) || 0),
//       0
//     );
//     return { totalItems, lowStockCount, totalValue };
//   }, [items]);

//   // ট্র্যাকিং টাইপ ব্যাজ
//   const formatTracking = (t: string) => {
//     switch (t) {
//       case "QUANTITY_BASED":
//         return (
//           <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800">
//             Quantity
//           </span>
//         );
//       case "SERIALIZED":
//         return (
//           <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800">
//             Serialized
//           </span>
//         );
//       case "LENGTH_BASED":
//         return (
//           <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
//             Length / Drum
//           </span>
//         );
//       default:
//         return t;
//     }
//   };

//   return (
//     <Need p="can_create_edit_items">
//       <div className="space-y-6 max-w-6xl mx-auto">
//         {/* Top Summary Strip */}
//         <div className="grid gap-3 sm:grid-cols-3">
//           <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
//             <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
//               Total Items
//             </p>
//             <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
//               {stats.totalItems}
//             </p>
//           </div>
//           <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
//             <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
//               Low / Zero Stock Alerts
//             </p>
//             <p className="mt-1 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
//               {stats.lowStockCount}
//             </p>
//           </div>
//           <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
//             <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
//               Estimated Stock Value
//             </p>
//             <p className="mt-1 text-2xl font-bold tracking-tight text-teal-700 dark:text-teal-400">
//               {taka(stats.totalValue)}
//             </p>
//           </div>
//         </div>

//         {/* Create Item Section */}
//         <Card title="Create New Inventory Item">
//           <form onSubmit={add} className="space-y-5">
//             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//               <div className="space-y-1.5">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
//                   Item Name *
//                 </label>
//                 <input
//                   className={inp + " w-full rounded-xl"}
//                   placeholder="e.g. Optical Fiber Cable"
//                   value={f.name}
//                   onChange={(e) => setF({ ...f, name: e.target.value })}
//                   required
//                 />
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
//                   Brand / Model
//                 </label>
//                 <input
//                   className={inp + " w-full rounded-xl"}
//                   placeholder="e.g. MikroTik RB750Gr3"
//                   value={f.brand_model}
//                   onChange={(e) => setF({ ...f, brand_model: e.target.value })}
//                 />
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
//                   Category *
//                 </label>
//                 <input
//                   className={inp + " w-full rounded-xl"}
//                   placeholder="e.g. Router, Cable, ONU"
//                   value={f.category}
//                   onChange={(e) => setF({ ...f, category: e.target.value })}
//                   required
//                 />
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
//                   Unit
//                 </label>
//                 <select
//                   className={inp + " w-full rounded-xl"}
//                   value={f.unit}
//                   onChange={(e) => setF({ ...f, unit: e.target.value as Unit })}
//                 >
//                   {["pcs", "meter", "feet", "roll", "box"].map((u) => (
//                     <option key={u} value={u}>
//                       {u.toUpperCase()}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
//                   Tracking Method
//                 </label>
//                 <select
//                   className={inp + " w-full rounded-xl"}
//                   value={f.tracking}
//                   onChange={(e) =>
//                     setF({ ...f, tracking: e.target.value as Tracking })
//                   }
//                 >
//                   <option value="QUANTITY_BASED">Quantity Based (General)</option>
//                   <option value="SERIALIZED">Serialized (MAC / SN)</option>
//                   <option value="LENGTH_BASED">Length Based (Cable/Drum)</option>
//                 </select>
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
//                   Min Stock Alert
//                 </label>
//                 <input
//                   className={inp + " w-full rounded-xl"}
//                   type="number"
//                   min={0}
//                   placeholder="0"
//                   value={f.min_stock}
//                   onChange={(e) =>
//                     setF({ ...f, min_stock: Number(e.target.value) })
//                   }
//                 />
//               </div>
//             </div>

//             {/* Image Upload & Submit Row */}
//             <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//               <div className="flex items-center gap-4">
//                 {imagePreview ? (
//                   <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
//                     <img
//                       src={imagePreview}
//                       alt="Preview"
//                       className="w-full h-full object-cover"
//                     />
//                     <button
//                       type="button"
//                       onClick={removeImage}
//                       className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] hover:bg-rose-700 cursor-pointer shadow-xs"
//                       title="Remove Image"
//                     >
//                       ✕
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[11px] text-center p-1 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
//                     No Photo
//                   </div>
//                 )}

//                 <div className="space-y-1">
//                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
//                     Item Photo (Optional)
//                   </label>
//                   <input
//                     ref={fileInputRef}
//                     type="file"
//                     accept="image/*"
//                     onChange={handleImageChange}
//                     className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-950 dark:file:text-teal-300 hover:file:bg-teal-100 dark:hover:file:bg-teal-900 cursor-pointer"
//                   />
//                   <p className="text-[11px] text-slate-400">
//                     Max 500KB (JPG, PNG, WebP)
//                   </p>
//                 </div>
//               </div>

//               <button
//                 className={`${btn} sm:w-auto w-full px-6 py-2.5 rounded-xl font-semibold shadow-xs cursor-pointer transition`}
//               >
//                 + Create Item
//               </button>
//             </div>
//           </form>
//           <div className="mt-2">
//             <Msg m={msg} />
//           </div>
//         </Card>

//         {/* Items List Section */}
//         <Card title={`Inventory Items (${filteredItems.length})`}>
//           {/* Modern Filter Toolbar */}
//           <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//               <div className="relative w-full sm:max-w-sm">
//                 <input
//                   type="text"
//                   className={inp + " w-full rounded-xl pr-8"}
//                   placeholder="Search item name, brand, or category..."
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                 />
//                 {search && (
//                   <button
//                     type="button"
//                     onClick={() => setSearch("")}
//                     aria-label="Clear search"
//                     className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
//                   >
//                     ✕
//                   </button>
//                 )}
//               </div>

//               <div className="flex flex-wrap items-center gap-2">
//                 <select
//                   className={inp + " rounded-xl text-xs"}
//                   value={categoryFilter}
//                   onChange={(e) => setCategoryFilter(e.target.value)}
//                 >
//                   <option value="">All Categories</option>
//                   {categories.map((cat) => (
//                     <option key={cat} value={cat}>
//                       {cat}
//                     </option>
//                   ))}
//                 </select>

//                 <button
//                   type="button"
//                   onClick={() => setOnlyLowStock((prev) => !prev)}
//                   className={`rounded-xl px-3 py-2 text-xs font-semibold border transition cursor-pointer ${
//                     onlyLowStock
//                       ? "bg-rose-600 text-white border-rose-600"
//                       : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
//                   }`}
//                 >
//                   Low / Zero Stock
//                 </button>

//                 {(search || categoryFilter || onlyLowStock) && (
//                   <button
//                     type="button"
//                     onClick={() => {
//                       setSearch("");
//                       setCategoryFilter("");
//                       setOnlyLowStock(false);
//                     }}
//                     className="rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
//                   >
//                     Reset
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>

//           <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
//             <Table
//               head={[
//                 "Item Details",
//                 "Category",
//                 "Tracking",
//                 "Current Stock",
//                 "Min Alert",
//                 "Avg Cost",
//                 "Actions",
//               ]}
//               rows={
//                 filteredItems.length > 0
//                   ? filteredItems.map((i: any) => {
//                       const currentStock = Number(i.current_stock) || 0;
//                       const minStock = Number(i.min_stock) || 0;
//                       const isLowStock = currentStock <= minStock;
//                       const isDeleting = deletingId === i.id;
//                       const isClearing = clearingId === i.id;

//                       return [
//                         <div
//                           key={`${i.id}-details`}
//                           className="flex items-center gap-3 py-1"
//                         >
//                           {i.image_url ? (
//                             <img
//                               src={i.image_url}
//                               alt={i.name}
//                               className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
//                             />
//                           ) : (
//                             <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-semibold shrink-0">
//                               N/A
//                             </div>
//                           )}
//                           <div>
//                             <div className="font-semibold text-slate-900 dark:text-slate-100">
//                               {i.name}
//                             </div>
//                             {i.brand_model && (
//                               <div className="text-xs text-slate-500 dark:text-slate-400">
//                                 {i.brand_model}
//                               </div>
//                             )}
//                           </div>
//                         </div>,

//                         <span
//                           key={`${i.id}-cat`}
//                           className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
//                         >
//                           {i.category}
//                         </span>,

//                         <span key={`${i.id}-track`}>
//                           {formatTracking(i.tracking)}
//                         </span>,

//                         <div key={`${i.id}-stock`} className="flex items-center gap-2">
//                           <span
//                             className={`font-semibold tabular-nums ${
//                               isLowStock
//                                 ? "text-rose-600 dark:text-rose-400"
//                                 : "text-slate-900 dark:text-slate-100"
//                             }`}
//                           >
//                             {currentStock} {i.unit}
//                           </span>
//                           {currentStock === 0 ? (
//                             <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded">
//                               EMPTY
//                             </span>
//                           ) : (
//                             isLowStock && (
//                               <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 rounded">
//                                 LOW
//                               </span>
//                             )
//                           )}
//                         </div>,

//                         <span
//                           key={`${i.id}-min`}
//                           className="tabular-nums text-xs text-slate-500 dark:text-slate-400"
//                         >
//                           {minStock} {i.unit}
//                         </span>,

//                         <span
//                           key={`${i.id}-cost`}
//                           className="tabular-nums font-medium text-slate-800 dark:text-slate-200"
//                         >
//                           {taka(i.avg_unit_cost)}
//                         </span>,

//                         <div
//                           key={`${i.id}-actions`}
//                           className="flex flex-wrap items-center gap-1.5"
//                         >
//                           <Need p="can_clear_stock">
//                             <button
//                               type="button"
//                               disabled={currentStock === 0 || isClearing}
//                               onClick={() => handleClearStock(i)}
//                               title={
//                                 currentStock === 0
//                                   ? "Stock is already 0"
//                                   : "Clear current stock to 0"
//                               }
//                               className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
//                             >
//                               {isClearing ? "Clearing..." : "Clear Stock"}
//                             </button>
//                           </Need>

//                           <button
//                             type="button"
//                             onClick={() => openEdit(i)}
//                             className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30 dark:hover:bg-teal-500/25 transition cursor-pointer"
//                           >
//                             Edit
//                           </button>

//                           <button
//                             type="button"
//                             disabled={isDeleting}
//                             onClick={() => handleDelete(i)}
//                             className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/25 transition disabled:opacity-50 cursor-pointer"
//                           >
//                             {isDeleting ? "Deleting..." : "Delete"}
//                           </button>
//                         </div>,
//                       ];
//                     })
//                   : [
//                       [
//                         <td
//                           key="empty"
//                           colSpan={7}
//                           className="py-10 text-center text-sm text-slate-500 dark:text-slate-400"
//                         >
//                           No inventory items match your filter.
//                         </td>,
//                       ],
//                     ]
//               }
//             />
//           </div>
//         </Card>

//         {/* Edit Item Modal */}
//         {editingItem && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
//             <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
//               <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
//                 <div>
//                   <h3 className="text-base font-bold text-slate-900 dark:text-white">
//                     Edit Item — {editingItem.name}
//                   </h3>
//                   <p className="text-xs text-slate-500 dark:text-slate-400">
//                     Update item details, stock alert threshold, or photo
//                   </p>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={closeEdit}
//                   className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer"
//                 >
//                   ✕
//                 </button>
//               </div>

//               <form
//                 onSubmit={saveEdit}
//                 className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
//               >
//                 <div className="grid gap-4 sm:grid-cols-2">
//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Item Name *
//                     </label>
//                     <input
//                       className={inp + " w-full rounded-xl"}
//                       value={editForm.name}
//                       onChange={(e) =>
//                         setEditForm({ ...editForm, name: e.target.value })
//                       }
//                       required
//                     />
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Brand / Model
//                     </label>
//                     <input
//                       className={inp + " w-full rounded-xl"}
//                       value={editForm.brand_model}
//                       onChange={(e) =>
//                         setEditForm({ ...editForm, brand_model: e.target.value })
//                       }
//                     />
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Category *
//                     </label>
//                     <input
//                       className={inp + " w-full rounded-xl"}
//                       value={editForm.category}
//                       onChange={(e) =>
//                         setEditForm({ ...editForm, category: e.target.value })
//                       }
//                       required
//                     />
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Unit
//                     </label>
//                     <select
//                       className={inp + " w-full rounded-xl"}
//                       value={editForm.unit}
//                       onChange={(e) =>
//                         setEditForm({ ...editForm, unit: e.target.value as Unit })
//                       }
//                     >
//                       {["pcs", "meter", "feet", "roll", "box"].map((u) => (
//                         <option key={u} value={u}>
//                           {u.toUpperCase()}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Tracking Method
//                     </label>
//                     <select
//                       className={inp + " w-full rounded-xl"}
//                       value={editForm.tracking}
//                       onChange={(e) =>
//                         setEditForm({
//                           ...editForm,
//                           tracking: e.target.value as Tracking,
//                         })
//                       }
//                     >
//                       <option value="QUANTITY_BASED">Quantity Based (General)</option>
//                       <option value="SERIALIZED">Serialized (MAC / SN)</option>
//                       <option value="LENGTH_BASED">Length Based (Cable/Drum)</option>
//                     </select>
//                   </div>

//                   <div className="space-y-1">
//                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Min Stock Alert
//                     </label>
//                     <input
//                       className={inp + " w-full rounded-xl"}
//                       type="number"
//                       min={0}
//                       value={editForm.min_stock}
//                       onChange={(e) =>
//                         setEditForm({
//                           ...editForm,
//                           min_stock: Number(e.target.value),
//                         })
//                       }
//                     />
//                   </div>
//                 </div>

//                 {/* Edit Image Section */}
//                 <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
//                   {editPreview ? (
//                     <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
//                       <img
//                         src={editPreview}
//                         alt="Edit Preview"
//                         className="w-full h-full object-cover"
//                       />
//                       <button
//                         type="button"
//                         onClick={removeEditImage}
//                         className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] hover:bg-rose-700 cursor-pointer"
//                         title="Remove Image"
//                       >
//                         ✕
//                       </button>
//                     </div>
//                   ) : (
//                     <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[11px] text-center p-1 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
//                       No Photo
//                     </div>
//                   )}

//                   <div className="space-y-1 flex-1">
//                     <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
//                       Change Item Photo (Max 500KB)
//                     </label>
//                     <input
//                       ref={editFileInputRef}
//                       type="file"
//                       accept="image/*"
//                       onChange={handleEditImageChange}
//                       className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-950 dark:file:text-teal-300 hover:file:bg-teal-100 dark:hover:file:bg-teal-900 cursor-pointer"
//                     />
//                   </div>
//                 </div>

//                 <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
//                   <button
//                     type="button"
//                     onClick={closeEdit}
//                     className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     type="submit"
//                     className={`${btn} px-5 py-2 text-xs font-semibold rounded-xl cursor-pointer`}
//                   >
//                     Save Changes
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}
//       </div>
//     </Need>
//   );
// }





"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { InventoryItem, Tracking, Unit } from "@/types/inventory";
import { Msg, Need, Table, btn, btn2, inp, taka } from "@/components/ui";

type Item = InventoryItem & { image_url?: string };
type Form = { name: string; brand_model: string; category: string; unit: Unit; tracking: Tracking; min_stock: number; image_url: string };
const empty: Form = { name: "", brand_model: "", category: "", unit: "pcs", tracking: "SERIALIZED", min_stock: 0, image_url: "" };

const TRACK: { key: Tracking; icon: string; title: string; desc: string; unit: Unit }[] = [
  { key: "SERIALIZED", icon: "📟", title: "Device", desc: "ONU, router, switch. Every unit has a serial / MAC.", unit: "pcs" },
  { key: "LENGTH_BASED", icon: "🧵", title: "Fiber / Cable", desc: "Counted in meters, taken from a drum.", unit: "meter" },
  { key: "QUANTITY_BASED", icon: "📦", title: "Quantity", desc: "Patch cord, splitter, connector. Simple count.", unit: "pcs" },
];
type St = "IN" | "LOW" | "OUT";
const stOf = (i: Item): St => (i.current_stock <= 0 ? "OUT" : i.current_stock <= i.min_stock ? "LOW" : "IN");
const ST = {
  IN: { label: "In stock", badge: "bg-emerald-500/90 text-white", soft: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", bar: "bg-emerald-500" },
  LOW: { label: "Low stock", badge: "bg-amber-500/90 text-white", soft: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", bar: "bg-amber-500" },
  OUT: { label: "Out of stock", badge: "bg-red-600/90 text-white", soft: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", bar: "bg-red-500" },
} as const;
const lbl = "mb-1 block text-xs font-medium text-slate-500";

function Stat({ icon, label, value, tone = "" }: { icon: string; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-xl dark:bg-teal-950/40">{icon}</div>
      <div><div className="text-xs text-slate-500">{label}</div><div className={`text-xl font-semibold ${tone}`}>{value}</div></div>
    </div>
  );
}

export default function Items() {
  const { user, can } = useAuth(); const { msg, run } = useAction();
  const items = useQ<Item>(() => collection(db, "items"), "i");
  const isAdmin = user?.role === "admin"; const showMoney = can("can_view_dashboard_financials");

  const [view, setView] = useState<"grid" | "list">("grid");
  useEffect(() => { try { const v = localStorage.getItem("items_view"); if (v === "grid" || v === "list") setView(v); } catch {} }, []);
  const changeView = (v: "grid" | "list") => { setView(v); try { localStorage.setItem("items_view", v); } catch {} };

  const [search, setSearch] = useState(""); const [cat, setCat] = useState("All"); const [status, setStatus] = useState<"ALL" | St>("ALL");
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; item: Item }>(null);
  const [f, setF] = useState<Form>(empty); const fileRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map(i => i.category?.trim()).filter(Boolean))).sort()], [items]);
  const counts = { ALL: items.length, IN: items.filter(i => stOf(i) === "IN").length, LOW: items.filter(i => stOf(i) === "LOW").length, OUT: items.filter(i => stOf(i) === "OUT").length };
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => (cat === "All" || i.category === cat) && (status === "ALL" || stOf(i) === status) &&
      (!q || `${i.name} ${i.brand_model} ${i.category}`.toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search, cat, status]);
  const value = items.reduce((a, i) => a + i.current_stock * i.avg_unit_cost, 0);

  const openCreate = () => { setF(empty); setModal({ mode: "create" }); };
  const openEdit = (i: Item) => {
    setF({ name: i.name, brand_model: i.brand_model ?? "", category: i.category, unit: i.unit, tracking: i.tracking, min_stock: i.min_stock ?? 0, image_url: i.image_url ?? "" });
    setModal({ mode: "edit", item: i }); setMenu(null);
  };
  const pickImage = (file?: File) => {
    if (!file) return;
    if (file.size > 500 * 1024) { alert("ছবির সাইজ ৫০০ KB এর কম হতে হবে।"); if (fileRef.current) fileRef.current.value = ""; return; }
    const r = new FileReader(); r.onloadend = () => setF(p => ({ ...p, image_url: r.result as string })); r.readAsDataURL(file);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault(); if (!modal) return;
    const data = { name: f.name.trim(), brand_model: f.brand_model.trim(), category: f.category.trim(), unit: f.unit, tracking: f.tracking, min_stock: Number(f.min_stock) || 0, image_url: f.image_url };
    run(async () => {
      if (modal.mode === "create") { const ref = doc(collection(db, "items")); await setDoc(ref, { ...data, id: ref.id, current_stock: 0, avg_unit_cost: 0 }); }
      else await updateDoc(doc(db, "items", modal.item.id), data);
      setModal(null);
    }, modal.mode === "create" ? "Item created" : "Item updated");
  };
  const clearStock = (i: Item) => {
    setMenu(null); if (!user || i.current_stock <= 0) return;
    if (!confirm(`"${i.name}" এর স্টক (${i.current_stock} ${i.unit}) 0 করবেন?`)) return;
    run(async () => {
      const b = writeBatch(db);
      b.update(doc(db, "items", i.id), { current_stock: 0 });
      b.set(doc(collection(db, "transactions")), { type: "ADJUSTMENT", item_id: i.id, item_name: i.name, qty: -i.current_stock,
        reference: "STOCK_CLEARED", note: "Stock cleared to 0", by: user.uid, by_name: user.name, at: Date.now() });
      await b.commit();
    }, `"${i.name}" stock cleared`);
  };
  const remove = (i: Item) => { setMenu(null); if (confirm(`"${i.name}" ডিলিট করবেন? এটি ফেরানো যাবে না।`)) run(() => deleteDoc(doc(db, "items", i.id)), `"${i.name}" deleted`); };

  const tabs: { k: "ALL" | St; label: string }[] = [{ k: "ALL", label: "All" }, { k: "IN", label: "In stock" }, { k: "LOW", label: "Low" }, { k: "OUT", label: "Out of stock" }];

  /* ---------- list view rows ---------- */
  const head = ["Item", "Category", "Type", "Available", "Alert at", ...(showMoney ? ["Avg cost"] : []), "Status", ""];
  const rows = list.map(i => {
    const s = stOf(i), t = TRACK.find(x => x.key === i.tracking)!;
    return [
      <div key="n" className="flex min-w-[12rem] items-center gap-3">
        {i.image_url ? <img src={i.image_url} alt={i.name} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
          : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-lg dark:bg-slate-800">{t.icon}</div>}
        <div className="min-w-0"><div className="truncate font-medium">{i.name}</div>{i.brand_model && <div className="truncate text-xs text-slate-500">{i.brand_model}</div>}</div>
      </div>,
      <span key="c" className="rounded-md bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{i.category}</span>,
      <span key="t" className="whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{t.icon} {t.title}</span>,
      <b key="a" className="whitespace-nowrap tabular-nums">{i.current_stock.toLocaleString("en-BD")} {i.unit}</b>,
      <span key="m" className="whitespace-nowrap text-slate-500">{i.min_stock} {i.unit}</span>,
      ...(showMoney ? [<span key="p" className="whitespace-nowrap">{taka(i.avg_unit_cost)}</span>] : []),
      <span key="s" className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${ST[s].soft}`}>{ST[s].label}</span>,
      <div key="x" className="flex items-center justify-end gap-3 whitespace-nowrap text-xs">
        <button className="font-medium text-teal-700 hover:underline dark:text-teal-300" onClick={() => openEdit(i)}>Edit</button>
        {isAdmin && <button className="text-amber-700 hover:underline disabled:opacity-40 dark:text-amber-400" disabled={i.current_stock <= 0} onClick={() => clearStock(i)}>Clear stock</button>}
        <button className="text-red-600 hover:underline" onClick={() => remove(i)}>Delete</button>
      </div>,
    ];
  });

  return (
    <Need p="can_create_edit_items">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-xl font-semibold">Items</h1><p className="text-sm text-slate-500">Everything you keep in stock, in one place.</p></div>
          <button className={btn} onClick={openCreate}>+ Add item</button>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 gap-3 ${showMoney ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <Stat icon="📦" label="Total items" value={items.length} />
          <Stat icon="⚠️" label="Low / out of stock" value={counts.LOW + counts.OUT} tone="text-amber-600" />
          <Stat icon="🗂️" label="Categories" value={cats.length - 1} />
          {showMoney && <Stat icon="৳" label="Stock value" value={taka(value)} tone="text-brand" />}
        </div>

        {/* Toolbar */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input className={inp + " pl-9"} placeholder="Search name, brand or category…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {tabs.map(t => (
                  <button key={t.k} onClick={() => setStatus(t.k)}
                    className={`rounded-lg px-3 py-1 text-sm transition ${status === t.k ? "bg-white font-medium shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>
                    {t.label} <span className="text-xs opacity-60">{counts[t.k]}</span></button>
                ))}
              </div>
              {/* view toggle */}
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="View">
                <button onClick={() => changeView("grid")} title="Grid view" aria-pressed={view === "grid"}
                  className={`rounded-lg px-3 py-1 text-sm transition ${view === "grid" ? "bg-white font-medium shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>▦ Grid</button>
                <button onClick={() => changeView("list")} title="List view" aria-pressed={view === "list"}
                  className={`rounded-lg px-3 py-1 text-sm transition ${view === "list" ? "bg-white font-medium shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>☰ List</button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`rounded-full border px-3 py-1 text-xs transition ${cat === c ? "border-brand bg-brand text-white" : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}>{c}</button>
            ))}
          </div>
        </div>
        {!modal && <Msg m={msg} />}

        {/* Content */}
        {list.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
            <div className="text-4xl">📭</div>
            <p className="mt-2 font-medium">{items.length === 0 ? "No items yet" : "No items match your filter"}</p>
            <p className="mb-4 text-sm text-slate-500">{items.length === 0 ? "Add your first item, or seed the catalog from Settings." : "Try a different search or category."}</p>
            {items.length === 0 ? <button className={btn} onClick={openCreate}>+ Add item</button>
              : <button className={btn2} onClick={() => { setSearch(""); setCat("All"); setStatus("ALL"); }}>Reset filters</button>}
          </div>
        ) : view === "list" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <Table head={head} rows={rows} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map(i => {
              const s = stOf(i), t = TRACK.find(x => x.key === i.tracking)!;
              const pct = s === "OUT" ? 0 : Math.max(6, Math.min(100, (i.current_stock / Math.max(i.min_stock * 2, 1)) * 100));
              return (
                <div key={i.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                    {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                      : <div className="grid h-full place-items-center text-5xl opacity-60">{t.icon}</div>}
                    <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur ${ST[s].badge}`}>{ST[s].label}</span>
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-slate-700 backdrop-blur">{t.icon} {t.title}</span>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <div className="truncate font-semibold">{i.name}</div>
                      <div className="truncate text-xs text-slate-500">{[i.brand_model, i.category].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-semibold tabular-nums">{i.current_stock.toLocaleString("en-BD")} <span className="text-sm font-normal text-slate-500">{i.unit}</span></span>
                        {showMoney && <span className="text-xs text-slate-500">{taka(i.avg_unit_cost)} / {i.unit}</span>}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-1.5 rounded-full ${ST[s].bar}`} style={{ width: `${pct}%` }} /></div>
                      <div className="mt-1 text-xs text-slate-500">Alert when below {i.min_stock} {i.unit}</div>
                    </div>
                    <div className="relative flex gap-2">
                      <button className={btn2 + " flex-1"} onClick={() => openEdit(i)}>✏️ Edit</button>
                      <button className={btn2} onClick={() => setMenu(menu === i.id ? null : i.id)} aria-label="More actions">⋯</button>
                      {menu === i.id && (<>
                        <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                        <div className="absolute bottom-full right-0 z-20 mb-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-xl dark:border-slate-700 dark:bg-slate-800">
                          {isAdmin && <button disabled={i.current_stock <= 0} onClick={() => clearStock(i)} className="block w-full px-3 py-2 text-left hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700">Clear stock to 0</button>}
                          <button onClick={() => remove(i)} className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">Delete item</button>
                        </div>
                      </>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create / Edit modal */}
        {modal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
            <form onSubmit={save} onClick={e => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div><h3 className="text-lg font-semibold">{modal.mode === "create" ? "Add new item" : "Edit item"}</h3>
                  <p className="text-sm text-slate-500">{modal.mode === "create" ? "Fill in the basics. You can add stock later from Purchases." : modal.item.name}</p></div>
                <button type="button" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setModal(null)}>✕</button>
              </div>

              <div>
                <label className={lbl}>What kind of item is it?</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TRACK.map(t => {
                    const locked = modal.mode === "edit" && t.key !== f.tracking;
                    return (
                      <button type="button" key={t.key} disabled={modal.mode === "edit"}
                        onClick={() => setF({ ...f, tracking: t.key, unit: t.unit })}
                        className={`rounded-xl border p-3 text-left transition ${f.tracking === t.key ? "border-brand bg-teal-50 ring-1 ring-brand dark:bg-teal-950/30" : "border-slate-200 dark:border-slate-700"} ${locked ? "opacity-40" : modal.mode === "edit" ? "" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                        <div className="font-medium">{t.icon} {t.title}</div><div className="mt-0.5 text-xs text-slate-500">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
                {modal.mode === "edit" && <p className="mt-1 text-xs text-slate-500">Item type cannot be changed after creation.</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={lbl}>Item name *</label><input className={inp} placeholder="e.g. GPON ONU" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required autoFocus /></div>
                <div><label className={lbl}>Brand / model</label><input className={inp} placeholder="e.g. Huawei HG8310M" value={f.brand_model} onChange={e => setF({ ...f, brand_model: e.target.value })} /></div>
                <div><label className={lbl}>Category *</label>
                  <input className={inp} list="cat-list" placeholder="e.g. ONU, Fiber, Router" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} required />
                  <datalist id="cat-list">{cats.filter(c => c !== "All").map(c => <option key={c} value={c} />)}</datalist></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Unit</label>
                    <select className={inp} value={f.unit} onChange={e => setF({ ...f, unit: e.target.value as Unit })}>{["pcs", "meter", "feet", "roll", "box"].map(u => <option key={u}>{u}</option>)}</select></div>
                  <div><label className={lbl}>Low stock alert</label>
                    <input className={inp} type="number" min={0} value={f.min_stock} onChange={e => setF({ ...f, min_stock: Number(e.target.value) })} /></div>
                </div>
              </div>

              <div>
                <label className={lbl}>Photo (optional, max 500 KB)</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 text-xs text-slate-400 hover:border-brand dark:border-slate-700">
                    {f.image_url ? <img src={f.image_url} alt="Preview" className="h-full w-full object-cover" /> : "＋ Photo"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickImage(e.target.files?.[0])} />
                  <div className="flex gap-2">
                    <button type="button" className={btn2} onClick={() => fileRef.current?.click()}>{f.image_url ? "Change" : "Upload"}</button>
                    {f.image_url && <button type="button" className={btn2} onClick={() => { setF({ ...f, image_url: "" }); if (fileRef.current) fileRef.current.value = ""; }}>Remove</button>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="min-w-0 flex-1"><Msg m={msg} /></div>
                <div className="flex gap-2">
                  <button type="button" className={btn2} onClick={() => setModal(null)}>Cancel</button>
                  <button className={btn}>{modal.mode === "create" ? "Create item" : "Save changes"}</button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </Need>
  );
}