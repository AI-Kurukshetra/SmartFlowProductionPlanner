// Core module types

export interface WorkCenter {
  id: string;
  plant_id: string;
  name: string;
  code?: string;
  created_at?: string;
}

export interface Resource {
  id: string;
  work_center_id: string;
  name: string;
  type?: string;
  capacity: number;
  status: string;
  created_at?: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  sku?: string;
  description?: string;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export interface BOM {
  id: string;
  product_id: string;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface BOMItem {
  id: string;
  bom_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  created_at?: string;
}

// Work orders
export interface WorkOrder {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  priority: number;
  due_date?: string;
  created_at?: string;
}

export interface Operation {
  id: string;
  work_order_id: string;
  name: string;
  sequence: number;
  duration_minutes: number;
  created_at?: string;
}

// Scheduling
export interface Schedule {
  id: string;
  work_order_id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at?: string;
}

export interface Constraint {
  id: string;
  resource_id: string;
  type: string;
  value?: string;
  created_at?: string;
}

// Inventory
export interface Inventory {
  id: string;
  plant_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_email?: string;
  created_at?: string;
}

// Production tracking
export interface ProductionRun {
  id: string;
  schedule_id: string;
  produced_quantity: number;
  start_time: string;
  end_time?: string;
  created_at?: string;
}

export interface ProductionLog {
  id: string;
  production_run_id: string;
  event: string;
  created_at?: string;
}

// Dashboard KPIs
export interface KPI {
  id: string;
  organization_id: string;
  name: string;
  value: number;
  recorded_at: string;
  created_at?: string;
}

// Demands (customer orders, forecasts)
export interface Demand {
  id: string;
  organization_id: string;
  product_id: string;
  quantity: number;
  due_date: string;
  status: string;
  source: string;
  notes?: string;
  work_order_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Calendars (plant working days, holidays)
export interface Calendar {
  id: string;
  plant_id: string;
  name: string;
  date: string;
  is_working_day: boolean;
  notes?: string;
  created_at?: string;
}

// Maintenance windows (resource unavailable)
export interface MaintenanceWindow {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// Quality gates (inspection points)
export interface QualityGate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: string;
  sequence: number;
  created_at?: string;
  updated_at?: string;
}

// Exceptions (downtime, deviations, alerts)
export interface Exception {
  id: string;
  organization_id: string;
  type: string;
  resource_id?: string;
  work_order_id?: string;
  description: string;
  severity: string;
  occurred_at: string;
  resolved_at?: string;
  created_at?: string;
  updated_at?: string;
}
