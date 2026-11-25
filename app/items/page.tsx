"use client";
import { useState, useRef } from "react";
import { collection, deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { InventoryItem, Tracking, Unit } from "@/types/inventory";
import { Card, Msg, Need, Table, btn, inp, taka } from "@/components/ui";

type ItemFormState = {
  name: string;
  brand_model: string;
  category: string;
  unit: Unit;
  tracking: Tracking;
  min_stock: number;
  image_url: string;
};

const emptyForm: ItemFormState = {
  name: "",
  brand_model: "",
  category: "",
  unit: "pcs",
  tracking: "QUANTITY_BASED",
  min_stock: 0,
  image_url: "",
};

export default function Items() {
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  const { msg, run } = useAction();

  // Create form states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [f, setF] = useState<ItemFormState>(emptyForm);

  // Edit modal states
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<ItemFormState>(emptyForm);
  const [editPreview, setEditPreview] = useState<string>("");

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ছবি সিলেক্ট করে Base64 এ রূপান্তর করার কমন হেল্পার
  const processImageFile = (
    file: File | undefined,
    inputRef: React.RefObject<HTMLInputElement | null>,
    onSuccess: (base64: string) => void
  ) => {
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("ছবির সাইজ ৫০০ KB এর কম হতে হবে! দয়া করে ছোট সাইজের ছবি দিন।");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onSuccess(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Create ফর্মের ছবি হ্যান্ডলার
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processImageFile(e.target.files?.[0], fileInputRef, (base64) => {
      setImagePreview(base64);
      setF((prev) => ({ ...prev, image_url: base64 }));
    });
  };

  const removeImage = () => {
    setImagePreview("");
    setF((prev) => ({ ...prev, image_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // নতুন আইটেম তৈরি
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const ref = doc(collection(db, "items"));
      await setDoc(ref, {
        ...f,
        id: ref.id,
        current_stock: 0,
        avg_unit_cost: 0,
      });
      setF(emptyForm);
      setImagePreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, "Item created successfully!");
  };

  // Edit মোডাল ওপেন করা
  const openEdit = (item: InventoryItem) => {
    const anyItem = item as any;
    setEditingItem(item);
    setEditForm({
      name: item.name || "",
      brand_model: item.brand_model || "",
      category: item.category || "",
      unit: item.unit || "pcs",
      tracking: item.tracking || "QUANTITY_BASED",
      min_stock: item.min_stock ?? 0,
      image_url: anyItem.image_url || "",
    });
    setEditPreview(anyItem.image_url || "");
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const closeEdit = () => {
    setEditingItem(null);
    setEditForm(emptyForm);
    setEditPreview("");
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  // Edit ফর্মের ছবি হ্যান্ডলার
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processImageFile(e.target.files?.[0], editFileInputRef, (base64) => {
      setEditPreview(base64);
      setEditForm((prev) => ({ ...prev, image_url: base64 }));
    });
  };

  const removeEditImage = () => {
    setEditPreview("");
    setEditForm((prev) => ({ ...prev, image_url: "" }));
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  // আইটেম আপডেট সেভ করা
  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const targetId = editingItem.id;
    run(async () => {
      await updateDoc(doc(db, "items", targetId), {
        name: editForm.name.trim(),
        brand_model: editForm.brand_model.trim(),
        category: editForm.category.trim(),
        unit: editForm.unit,
        tracking: editForm.tracking,
        min_stock: Number(editForm.min_stock) || 0,
        image_url: editForm.image_url,
      });
      closeEdit();
    }, "Item updated successfully!");
  };

  // আইটেম ডিলিট করা
  const handleDelete = (item: InventoryItem) => {
    const confirmed = window.confirm(
      `"${item.name}" আইটেমটি কি আপনি নিশ্চিতভাবে ডিলিট করতে চান?`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    run(async () => {
      await deleteDoc(doc(db, "items", item.id));
    }, `"${item.name}" deleted successfully!`).finally(() => {
      setDeletingId(null);
    });
  };

  // সার্চ ফিল্টার
  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase()) ||
      (i.brand_model && i.brand_model.toLowerCase().includes(search.toLowerCase()))
  );

  // ট্র্যাকিং টাইপ ব্যাজ
  const formatTracking = (t: string) => {
    switch (t) {
      case "QUANTITY_BASED":
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            Quantity
          </span>
        );
      case "SERIALIZED":
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
            Serialized
          </span>
        );
      case "LENGTH_BASED":
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            Length / Drum
          </span>
        );
      default:
        return t;
    }
  };

  return (
    <Need p="can_create_edit_items">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Create Item Section */}
        <Card title="Create New Inventory Item">
          <form onSubmit={add} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Item Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Item Name *
                </label>
                <input
                  className={inp}
                  placeholder="e.g. Optical Fiber Cable"
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  required
                />
              </div>

              {/* Brand / Model */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Brand / Model
                </label>
                <input
                  className={inp}
                  placeholder="e.g. MikroTik RB750Gr3"
                  value={f.brand_model}
                  onChange={(e) => setF({ ...f, brand_model: e.target.value })}
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Category *
                </label>
                <input
                  className={inp}
                  placeholder="e.g. Router, Cable, ONU"
                  value={f.category}
                  onChange={(e) => setF({ ...f, category: e.target.value })}
                  required
                />
              </div>

              {/* Unit */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Unit
                </label>
                <select
                  className={inp}
                  value={f.unit}
                  onChange={(e) => setF({ ...f, unit: e.target.value as Unit })}
                >
                  {["pcs", "meter", "feet", "roll", "box"].map((u) => (
                    <option key={u} value={u}>
                      {u.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tracking Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Tracking Method
                </label>
                <select
                  className={inp}
                  value={f.tracking}
                  onChange={(e) => setF({ ...f, tracking: e.target.value as Tracking })}
                >
                  <option value="QUANTITY_BASED">Quantity Based (General)</option>
                  <option value="SERIALIZED">Serialized (MAC / SN)</option>
                  <option value="LENGTH_BASED">Length Based (Cable/Drum)</option>
                </select>
              </div>

              {/* Min Stock */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Min Stock Alert
                </label>
                <input
                  className={inp}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={f.min_stock}
                  onChange={(e) => setF({ ...f, min_stock: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Image Upload & Submit Row */}
            <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 cursor-pointer"
                      title="Remove Image"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs text-center p-1 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    No Image
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                    Item Photo (Optional)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">Max size: 500KB (JPG, PNG, WebP)</p>
                </div>
              </div>

              <button className={`${btn} sm:w-auto w-full px-6 py-2.5 font-medium cursor-pointer`}>
                + Create Item
              </button>
            </div>
          </form>
          <div className="mt-2">
            <Msg m={msg} />
          </div>
        </Card>

        {/* Items List Section */}
        <Card title={`Inventory Items (${filteredItems.length})`}>
          {/* Search Bar */}
          <div className="mb-4 max-w-sm">
            <input
              type="text"
              className={inp}
              placeholder="Search by item name, brand, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Table
            head={[
              "Item Details",
              "Category",
              "Tracking",
              "Current Stock",
              "Min Alert",
              "Avg Cost",
              "Actions",
            ]}
            rows={filteredItems.map((i: any) => {
              const isLowStock = i.current_stock <= i.min_stock;
              const isDeleting = deletingId === i.id;

              return [
                // Item Image + Name + Brand
                <div key={`${i.id}-details`} className="flex items-center gap-3 py-1">
                  {i.image_url ? (
                    <img
                      src={i.image_url}
                      alt={i.name}
                      className="w-10 h-10 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-medium shrink-0">
                      N/A
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{i.name}</div>
                    {i.brand_model && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {i.brand_model}
                      </div>
                    )}
                  </div>
                </div>,

                // Category
                <span key={`${i.id}-cat`} className="text-slate-700 dark:text-slate-300 font-medium">
                  {i.category}
                </span>,

                // Tracking Badge
                <span key={`${i.id}-track`}>{formatTracking(i.tracking)}</span>,

                // Current Stock with Low Stock Warning
                <div key={`${i.id}-stock`} className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${isLowStock
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-800 dark:text-slate-100"
                      }`}
                  >
                    {i.current_stock} {i.unit}
                  </span>
                  {isLowStock && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 rounded">
                      LOW
                    </span>
                  )}
                </div>,

                // Min Stock
                <span key={`${i.id}-min`} className="text-slate-500 dark:text-slate-400">
                  {i.min_stock} {i.unit}
                </span>,

                // Avg Cost
                <span
                  key={`${i.id}-cost`}
                  className="font-medium text-slate-800 dark:text-slate-200"
                >
                  {taka(i.avg_unit_cost)}
                </span>,

                // Edit & Delete Actions
                <div key={`${i.id}-actions`} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(i)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/25 transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(i)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30 dark:hover:bg-red-500/25 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>,
              ];
            })}
          />
        </Card>

        {/* Edit Item Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Item — {editingItem.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update item information, alert threshold, or photo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={saveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Item Name *
                    </label>
                    <input
                      className={inp}
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Brand / Model
                    </label>
                    <input
                      className={inp}
                      value={editForm.brand_model}
                      onChange={(e) => setEditForm({ ...editForm, brand_model: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Category *
                    </label>
                    <input
                      className={inp}
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Unit
                    </label>
                    <select
                      className={inp}
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value as Unit })}
                    >
                      {["pcs", "meter", "feet", "roll", "box"].map((u) => (
                        <option key={u} value={u}>
                          {u.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Tracking Method
                    </label>
                    <select
                      className={inp}
                      value={editForm.tracking}
                      onChange={(e) =>
                        setEditForm({ ...editForm, tracking: e.target.value as Tracking })
                      }
                    >
                      <option value="QUANTITY_BASED">Quantity Based (General)</option>
                      <option value="SERIALIZED">Serialized (MAC / SN)</option>
                      <option value="LENGTH_BASED">Length Based (Cable/Drum)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Min Stock Alert
                    </label>
                    <input
                      className={inp}
                      type="number"
                      min={0}
                      value={editForm.min_stock}
                      onChange={(e) =>
                        setEditForm({ ...editForm, min_stock: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                {/* Edit Image Section */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
                  {editPreview ? (
                    <div className="relative w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
                      <img src={editPreview} alt="Edit Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={removeEditImage}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 cursor-pointer"
                        title="Remove Image"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs text-center p-1 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                      No Image
                    </div>
                  )}

                  <div className="space-y-1 flex-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Change Item Photo (Max 500KB)
                    </label>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageChange}
                      className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`${btn} px-5 py-2 text-xs font-semibold cursor-pointer`}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Need>
  );
}