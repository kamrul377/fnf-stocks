import { PermissionKey, Role } from "@/types/inventory";
type P = Record<PermissionKey, boolean> | undefined;
export const NAV: { href: string; label: string; perm?: PermissionKey; anyOf?: PermissionKey[] }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/requisitions", label: "Requisitions", anyOf: ["can_request_stock", "can_approve_requests"] },
  { href: "/my-stock", label: "My Handover Stock", anyOf: ["can_request_stock"] },
  { href: "/items", label: "Items", perm: "can_create_edit_items" },
  { href: "/purchases", label: "Purchases / Stock-In", perm: "can_record_purchase" },
  { href: "/withdraw", label: "Direct Withdraw", perm: "can_direct_withdraw" },
  { href: "/devices", label: "Serial & MAC Tracker" },
    { href: "/returns", label: "Receive from Field", perm: "can_manage_rma_returns" },
  { href: "/rma", label: "Returns & RMA", perm: "can_manage_rma_returns" },
  { href: "/ledger", label: "Stock Ledger", perm: "can_view_full_ledger" },
  { href: "/users", label: "Staff", perm: "can_create_users" },
  { href: "/settings/permissions", label: "Access & Permissions" },
];
export const visibleNav = (role: Role, perms: P) =>
  NAV.filter(n => role === "admin" || (!n.perm && !n.anyOf) ||
    (n.perm && perms?.[n.perm]) || n.anyOf?.some(p => perms?.[p]));
