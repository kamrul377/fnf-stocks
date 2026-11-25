import { PERMISSION_KEYS, Role, Tracking, Unit } from "@/types/inventory";
type Row = [string, string, Unit, Tracking, number];
const S = "SERIALIZED", L = "LENGTH_BASED", Q = "QUANTITY_BASED";
export const CATALOG: Row[] = [
  ["EPON ONU", "ONU/ONT", "pcs", S, 10], ["GPON ONU", "ONU/ONT", "pcs", S, 10], ["XPON ONU", "ONU/ONT", "pcs", S, 10],
  ["Dual-Band Wi-Fi Router", "Router", "pcs", S, 10], ["OLT", "OLT", "pcs", S, 1], ["MikroTik Router", "Router", "pcs", S, 2],
  ["Managed Switch", "Switch", "pcs", S, 2], ["PoE Switch", "Switch", "pcs", S, 2], ["SFP Module", "Optics", "pcs", S, 5],
  ["Media Converter", "Converter", "pcs", S, 5],
  ["1-Core Drop Fiber", "Fiber", "meter", L, 2000], ["2-Core Drop Fiber", "Fiber", "meter", L, 2000], ["4-Core Drop Fiber", "Fiber", "meter", L, 1000],
  ["Aerial Fiber 12-Core", "Fiber", "meter", L, 1000], ["Backbone Fiber 24-Core", "Fiber", "meter", L, 1000], ["Cat6 UTP Cable", "Cable", "meter", L, 500],
  ["Patch Cord", "Passive", "pcs", Q, 50], ["Pigtail", "Passive", "pcs", Q, 50], ["PLC Splitter", "Passive", "pcs", Q, 20],
  ["TJ Box", "Passive", "pcs", Q, 30], ["ODF", "Passive", "pcs", Q, 5], ["Coupler", "Passive", "pcs", Q, 50],
  ["Splice Sleeve", "Consumable", "pcs", Q, 200], ["RJ45 Connector", "Consumable", "pcs", Q, 200], ["Cable Tie", "Consumable", "pcs", Q, 500],
  ["S-Hook / Clamp", "Consumable", "pcs", Q, 200],
];
const all = (v: boolean) => Object.fromEntries(PERMISSION_KEYS.map(k => [k, v]));
const some = (on: string[]) => Object.fromEntries(PERMISSION_KEYS.map(k => [k, on.includes(k)]));
export const DEFAULT_PERMS: Record<Role, Record<string, boolean>> = {
  admin: all(true),
  manager: { ...all(true) },
  noc: some(["can_create_edit_items", "can_direct_withdraw", "can_request_stock", "can_manage_rma_returns", "can_view_full_ledger"]),
  support: some(["can_request_stock"]),
  technician: some(["can_request_stock"]),
};
