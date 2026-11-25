"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Msg, Need, Table, btn, inp } from "@/components/ui";
import { CREATABLE, createStaff } from "@/services/userService";
import { collection, doc, updateDoc } from "firebase/firestore";
import { Role, UserProfile } from "@/types/inventory";

export default function Users() {
  const { user } = useAuth(); const { msg, run } = useAction();
  const users = useQ<UserProfile>(() => collection(db, "users"), "u");
  const roles = user ? CREATABLE[user.role] : [];
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", role: "technician" as Role });
  const add = (e: React.FormEvent) => { e.preventDefault(); if (!user) return;
    run(async () => { await createStaff(user, f); setF({ ...f, name: "", email: "", phone: "", password: "" }); }, "Account created"); };
  return (<Need p="can_create_users"><div className="space-y-6"><Card title="Create Staff Account"><form onSubmit={add} className="grid gap-2 sm:grid-cols-3">
    <input className={inp} placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />
    <input className={inp} type="email" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
    <input className={inp} placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
    <input className={inp} type="password" minLength={6} placeholder="Password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required />
    <select className={inp} value={f.role} onChange={e => setF({ ...f, role: e.target.value as Role })}>{roles.map(r => <option key={r}>{r}</option>)}</select>
    <button className={btn}>Create</button></form><Msg m={msg} /></Card>
    <Card title="Staff">
      <Table head={["Name", "Email", "Phone", "Role", "Status"]} rows={users.map(u => [u.name, u.email, u.phone, u.role,
  <span className="flex gap-2 items-center">{u.active ? "Active" : "Disabled"}
    {user?.role === "admin" && u.uid !== user.uid &&
      <button className="text-xs text-red-600 hover:underline" onClick={() => updateDoc(doc(db, "users", u.uid), { active: !u.active })}>{u.active ? "Disable" : "Enable"}</button>}
  </span>])} />
    </Card>
    </div></Need>);
}
