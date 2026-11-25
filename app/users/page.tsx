"use client";
import { useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { useQ, useAction } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { Card, Msg, Need, Table, btn, inp } from "@/components/ui";
import { CREATABLE, createStaff } from "@/services/userService";
import { collection, doc, updateDoc } from "firebase/firestore";
import { Role, UserProfile } from "@/types/inventory";

// সব সম্ভাব্য রোল লিস্ট (Admin রোল পরিবর্তনের জন্য)
const ALL_ROLES: Role[] = ["admin", "manager", "technician", "noc", "support"];

export default function Users() {
  const { user } = useAuth();
  const { msg, run } = useAction();
  const users = useQ<UserProfile>(() => collection(db, "users"), "u");

  const roles: Role[] = useMemo(() => {
    if (!user) return ["technician"];
    const allowed = CREATABLE[user.role] || [];
    return allowed.length > 0 ? allowed : ALL_ROLES;
  }, [user]);

  const [f, setF] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    role: Role;
  }>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: roles.includes("technician") ? "technician" : roles[0] || "technician",
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [busyUid, setBusyUid] = useState<string | null>(null);

  // নতুন স্টাফ অ্যাকাউন্ট তৈরি
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    run(async () => {
      await createStaff(user, {
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        password: f.password,
        role: f.role,
      });
      setF((prev) => ({
        ...prev,
        name: "",
        email: "",
        phone: "",
        password: "",
      }));
    }, "Staff account created successfully!");
  };

  // Admin দ্বারা স্টাফের রোল পরিবর্তন
  const handleRoleChange = (targetUser: UserProfile, newRole: Role) => {
    if (!user || user.role !== "admin" || targetUser.role === newRole) return;

    setBusyUid(targetUser.uid);
    run(async () => {
      await updateDoc(doc(db, "users", targetUser.uid), { role: newRole });
    }, `${targetUser.name}-এর রোল "${newRole}"-এ আপডেট করা হয়েছে`).finally(() => {
      setBusyUid(null);
    });
  };

  // Admin দ্বারা স্টাফের Active / Disabled স্ট্যাটাস পরিবর্তন
  const handleStatusToggle = (targetUser: UserProfile) => {
    if (!user || user.role !== "admin" || targetUser.uid === user.uid) return;

    const nextActive = !targetUser.active;
    setBusyUid(targetUser.uid);
    run(async () => {
      await updateDoc(doc(db, "users", targetUser.uid), { active: nextActive });
    }, `${targetUser.name} ${nextActive ? "Enabled" : "Disabled"} করা হয়েছে`).finally(() => {
      setBusyUid(null);
    });
  };

  // ফিল্টার ও সার্চ
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  const activeCount = users.filter((u) => u.active).length;
  const disabledCount = users.length - activeCount;

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
      case "manager":
        return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300";
      case "storekeeper":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
      case "technician":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <Need p="can_create_users">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Staff
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {users.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active Accounts
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {activeCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Disabled Accounts
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {disabledCount}
            </p>
          </div>
        </div>

        {/* Create Staff Account Form */}
        <Card title="Create Staff Account">
          <form onSubmit={add} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Full Name *
                </label>
                <input
                  className={inp}
                  placeholder="e.g. Mahmudul Hasan"
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Email Address *
                </label>
                <input
                  className={inp}
                  type="email"
                  placeholder="staff@company.com"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Phone Number *
                </label>
                <input
                  className={inp}
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={f.phone}
                  onChange={(e) => setF({ ...f, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Password (Min 6 chars) *
                </label>
                <input
                  className={inp}
                  type="password"
                  minLength={6}
                  placeholder="••••••••"
                  value={f.password}
                  onChange={(e) => setF({ ...f, password: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Assign Role *
                </label>
                <select
                  className={inp}
                  value={f.role}
                  onChange={(e) => setF({ ...f, role: e.target.value as Role })}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className={`${btn} w-full py-2.5 font-semibold cursor-pointer`}
                >
                  + Create Account
                </button>
              </div>
            </div>
          </form>

          <div className="mt-3">
            <Msg m={msg} />
          </div>
        </Card>

        {/* Staff Directory & Role Management */}
        <Card title={`Staff Directory (${filteredUsers.length})`}>
          {/* Search & Role Filter Bar */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3 justify-between">
            <div className="max-w-sm w-full">
              <input
                type="text"
                className={inp}
                placeholder="Search by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Role:
              </label>
              <select
                className={`${inp} w-auto`}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Table
            head={["Staff Member", "Contact", "Role", "Status", "Actions"]}
            rows={filteredUsers.map((u) => {
              const isSelf = user?.uid === u.uid;
              const canEditRole = user?.role === "admin";
              const isBusy = busyUid === u.uid;

              return [
                // Name + Avatar
                <div key={`${u.uid}-name`} className="flex items-center gap-3 py-1">
                  <div className="w-9 h-9 rounded-full bg-brand/15 text-brand border border-brand/25 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {u.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>{u.name}</span>
                      {isSelf && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                  </div>
                </div>,

                // Phone
                <span key={`${u.uid}-phone`} className="text-sm text-slate-700 dark:text-slate-300">
                  {u.phone || "—"}
                </span>,

                // Role Badge + Admin Direct Role Selector
                <div key={`${u.uid}-role`} className="flex items-center gap-2">
                  {canEditRole ? (
                    <select
                      aria-label={`Change role for ${u.name}`}
                      disabled={isBusy}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer ${isBusy ? "opacity-50" : ""
                        }`}
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${roleBadgeClass(
                        u.role
                      )}`}
                    >
                      {u.role}
                    </span>
                  )}
                </div>,

                // Status Badge
                <span
                  key={`${u.uid}-status`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.active
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                  />
                  {u.active ? "Active" : "Disabled"}
                </span>,

                // Action Buttons (Enable / Disable)
                <div key={`${u.uid}-actions`} className="flex items-center gap-2">
                  {user?.role === "admin" && !isSelf ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStatusToggle(u)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold border transition cursor-pointer disabled:opacity-50 ${u.active
                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/25"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/25"
                        }`}
                    >
                      {u.active ? "Disable" : "Enable"}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                  )}
                </div>,
              ];
            })}
          />
        </Card>
      </div>
    </Need>
  );
}