export type Role = "admin" | "manager" | "noc" | "support" | "technician";
export const PERMISSION_KEYS = [
  "can_view_dashboard_financials","can_create_edit_items","can_record_purchase",
  "can_direct_withdraw","can_request_stock","can_approve_requests",
  "can_manage_rma_returns","can_view_full_ledger","can_create_users","can_manage_suppliers",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type RolePermissions = Record<Role, Record<PermissionKey, boolean>>;

export interface UserProfile {
  uid: string; name: string; email: string; phone: string; role: Role;
  active: boolean; created_by: string; created_at: number;
}
export type Tracking = "SERIALIZED" | "LENGTH_BASED" | "QUANTITY_BASED";
export type Unit = "pcs" | "meter" | "feet" | "roll" | "box";
export interface InventoryItem {
  id: string; name: string; brand_model: string; category: string; unit: Unit;
  tracking: Tracking; min_stock: number;
  current_stock: number;      // units in stock | total meters | quantity
  avg_unit_cost: number;      // BDT (৳)
}
export type DeviceStatus = "IN_STOCK"|"ASSIGNED_CLIENT"|"ASSIGNED_POP"|"WITH_TECHNICIAN"|"FAULTY_RMA"|"RETURNED_USED";
export interface DeviceSerial {
  serial_number: string; mac_address?: string; item_id: string; status: DeviceStatus;
  holder_ref?: string; // client_id | pop_name | technician uid
  history: { at: number; status: DeviceStatus; ref?: string; by: string }[];
}
export interface Drum { id: string; item_id: string; initial_length: number; remaining_length: number; }
export type Purpose = "New Client Connection"|"Ticket/Maintenance"|"POP Setup"|"Personal Field Stock";
export interface RequisitionLine {
  item_id: string; item_name: string; qty: number; // meters for LENGTH_BASED
  serials?: string[]; drum_id?: string;            // filled at fulfilment
}
export interface Requisition {
  id: string; requested_by: string; requested_by_name: string; purpose: Purpose;
  reference: string; lines: RequisitionLine[]; urgency: "LOW"|"NORMAL"|"HIGH"; notes: string;
  status: "PENDING"|"APPROVED_ISSUED"|"REJECTED"; rejection_reason?: string;
  processed_by?: string; created_at: number; processed_at?: number;
}
export type TxType = "PURCHASE"|"WITHDRAW"|"REQUEST_FULFILLED"|"RETURN"|"ADJUSTMENT";
export interface StockTransaction {
  id?: string; type: TxType; item_id: string; item_name: string; qty: number; // signed
  serials?: string[]; drum_id?: string; reference?: string; invoice_no?: string;
  unit_cost?: number; by: string; by_name: string; at: number; note?: string;
}
