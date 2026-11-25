"use client";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQ } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Table } from "@/components/ui";
import { DeviceSerial, InventoryItem } from "@/types/inventory";

export default function MyStock() {
  const { user } = useAuth();
  const mine = useQ<DeviceSerial>(() => user ? query(collection(db, "serials"), where("holder_ref", "==", user.uid), where("status", "==", "WITH_TECHNICIAN")) : null, user?.uid ?? "");
  const items = useQ<InventoryItem>(() => collection(db, "items"), "i");
  return (<Card title="My Handover Stock"><Table head={["Item", "Serial", "MAC"]}
    rows={mine.map(s => [items.find(i => i.id === s.item_id)?.name ?? s.item_id, s.serial_number, s.mac_address ?? "-"])} />
    {!mine.length && <p className="text-sm text-slate-500">No devices in your possession.</p>}</Card>);
}
