import { pgTable, text, serial, integer, boolean, timestamp, date, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const reconStatusEnum = pgEnum("recon_status", ["IN_PROGRESS", "COMPLETE"]);

// === CORE TABLES ===

// 1. Inventory Vehicles (Anchor)
export const inventoryVehicles = pgTable("inventory_vehicles", {
  vin: text("vin").primaryKey(),
  stockNo: text("stock_no").notNull(),
  stockType: text("stock_type"), // USED, NEW, DEMO - we filter to USED only
  inventoryCompany: text("inventory_company"), // 1=ACF, 2=LCF, 3=CFMG
  entryDate: date("entry_date").notNull(), // Inventory Entry Date
  year: integer("year"),
  make: text("make"),
  model: text("model"),
  mileage: integer("mileage"),
  lotLocation: text("lot_location"),
  soldDate: date("sold_date"), // Optional
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Service RO Header (Closed & Open)
export const serviceRos = pgTable("service_ros", {
  roNumber: text("ro_number").primaryKey(),
  vin: text("vin").notNull(), 
  openDate: date("open_date"),
  closeDate: date("close_date"), // Nullable for open ROs
  roStatusCode: text("ro_status_code"),
  isOpen: boolean("is_open").default(false), // To distinguish between open/closed exports
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Service RO Details (Lines)
export const serviceRoDetails = pgTable("service_ro_details", {
  id: serial("id").primaryKey(),
  roNumber: text("ro_number").notNull(),
  opCode: text("op_code").notNull(),
  opDescription: text("op_description"),
  laborType: text("labor_type"), // ISP, CPM, etc.
  laborSale: numeric("labor_sale"), // Labor sale amount
  laborCost: numeric("labor_cost"), // Labor cost amount
  partsSale: numeric("parts_sale"), // Parts sale amount
  partsCost: numeric("parts_cost"), // Parts cost amount
});

// === DERIVED/FACT TABLES ===

// 4. Fact Recon Vehicle (Computed Metrics)
// One row per VIN/stock with current computed metrics
export const factReconVehicles = pgTable("fact_recon_vehicles", {
  vin: text("vin").primaryKey(), // Matches inventoryVehicles.vin
  
  // Denormalized fields for fast dashboard rendering
  stockNo: text("stock_no"),
  inventoryCompany: text("inventory_company"), // 1=ACF, 2=LCF, 3=CFMG
  entryDate: date("entry_date"),
  lotLocation: text("lot_location"),
  year: integer("year"),
  make: text("make"),
  model: text("model"),
  mileage: integer("mileage"),
  soldDate: date("sold_date"),

  // Computed Recon Outputs
  lastReconRoNumber: text("last_recon_ro_number"), // The RO triggering "Complete"
  lastReconCloseDate: date("last_recon_close_date"),
  reconDays: integer("recon_days"), // last_recon_close_date - entry_date
  reconStatus: reconStatusEnum("recon_status").default("IN_PROGRESS"),
  
  // Cost tracking
  totalLaborCost: numeric("total_labor_cost"), // Sum of all labor costs
  totalPartsCost: numeric("total_parts_cost"), // Sum of all parts costs
  totalReconCost: numeric("total_recon_cost"), // Labor + Parts

  computedAt: timestamp("computed_at").defaultNow(),
});

// 5. ETL Import Log
export const ingestionLogs = pgTable("ingestion_logs", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // INVENTORY, SERVICE_CLOSED, SERVICE_DETAILS, etc.
  ingestedAt: timestamp("ingested_at").defaultNow(),
  rowCount: integer("row_count"),
  status: text("status").notNull(), // SUCCESS, FAILED
  errorMessage: text("error_message"),
});

// === SCHEMAS ===

export const insertInventorySchema = createInsertSchema(inventoryVehicles);
export const insertRoSchema = createInsertSchema(serviceRos);
export const insertRoDetailSchema = createInsertSchema(serviceRoDetails);

// === EXPLICIT TYPES ===

export type InventoryVehicle = typeof inventoryVehicles.$inferSelect;
export type ServiceRo = typeof serviceRos.$inferSelect;
export type ServiceRoDetail = typeof serviceRoDetails.$inferSelect;
export type FactReconVehicle = typeof factReconVehicles.$inferSelect;
export type IngestionLog = typeof ingestionLogs.$inferSelect;

export type ReconStatus = "IN_PROGRESS" | "COMPLETE";

// API Response Types
export interface DashboardStats {
  avgReconDays: number;
  medianReconDays: number;
  countInProgress: number;
  countCompleted: number;
  countOverThreshold: number; // e.g. over 10 days
  totalReconCost: number; // Sum of all recon costs
}
