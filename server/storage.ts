import { db } from "./db";
import { 
  factReconVehicles, 
  inventoryVehicles, 
  ingestionLogs,
  serviceRos,
  serviceRoDetails,
  type FactReconVehicle,
  type InventoryVehicle,
  type ServiceRo,
  type ServiceRoDetail,
  type IngestionLog,
  type DashboardStats
} from "@shared/schema";
import { eq, desc, and, ilike, sql, count, avg, gt } from "drizzle-orm";

export interface IStorage {
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  getReconVehicles(filters?: {
    search?: string;
    location?: string;
    status?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: FactReconVehicle[]; total: number }>;
  
  getVehicle(vin: string): Promise<FactReconVehicle | undefined>;
  getVehicleRos(vin: string): Promise<(ServiceRo & { details: ServiceRoDetail[] })[]>;

  // Ingestion Logging
  logIngestion(log: Partial<IngestionLog>): Promise<IngestionLog>;
  getIngestionLogs(): Promise<IngestionLog[]>;

  // Data Access for ETL
  upsertInventory(items: InventoryVehicle[]): Promise<void>;
  upsertRos(items: ServiceRo[]): Promise<void>;
  upsertRoDetails(items: ServiceRoDetail[]): Promise<void>;
  
  // Recompute
  recomputeReconMetrics(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getDashboardStats(): Promise<DashboardStats> {
    const stats = await db.select({
      avg: sql<number>`avg(${factReconVehicles.reconDays})`,
      // median not strictly standard in all pg versions without extensions, using avg for now or simple approx
      countInProgress: count(sql`CASE WHEN ${factReconVehicles.reconStatus} = 'IN_PROGRESS' THEN 1 END`),
      countNoRecon: count(sql`CASE WHEN ${factReconVehicles.reconStatus} = 'NO_RECON_FOUND' THEN 1 END`),
      countCompleted: count(sql`CASE WHEN ${factReconVehicles.reconStatus} = 'COMPLETE' THEN 1 END`),
      countOverThreshold: count(sql`CASE WHEN ${factReconVehicles.reconDays} > 10 THEN 1 END`),
    }).from(factReconVehicles);

    const row = stats[0];
    return {
      avgReconDays: Number(row.avg) || 0,
      medianReconDays: 0, // Placeholder
      countInProgress: Number(row.countInProgress) || 0,
      countNoRecon: Number(row.countNoRecon) || 0,
      countCompleted: Number(row.countCompleted) || 0,
      countOverThreshold: Number(row.countOverThreshold) || 0,
    };
  }

  async getReconVehicles(filters: { search?: string; location?: string; status?: string; sortBy?: string; page?: number; limit?: number } = {}) {
    const conditions = [];
    if (filters.search) {
      conditions.push(
        sql`(${factReconVehicles.stockNo} ILIKE ${`%${filters.search}%`} OR ${factReconVehicles.vin} ILIKE ${`%${filters.search}%`})`
      );
    }
    if (filters.location && filters.location !== "All") {
      conditions.push(eq(factReconVehicles.lotLocation, filters.location));
    }
    if (filters.status && filters.status !== "All") {
      conditions.push(eq(factReconVehicles.reconStatus, filters.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Sort
    let orderBy = desc(factReconVehicles.reconDays);
    if (filters.sortBy === "days_asc") orderBy = sql`${factReconVehicles.reconDays} ASC`;
    else if (filters.sortBy === "date_desc") orderBy = desc(factReconVehicles.entryDate);
    else if (filters.sortBy === "date_asc") orderBy = sql`${factReconVehicles.entryDate} ASC`;

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(factReconVehicles).where(whereClause);
    const items = await db.select()
      .from(factReconVehicles)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return { items, total: Number(totalResult.count) };
  }

  async getVehicle(vin: string): Promise<FactReconVehicle | undefined> {
    const [vehicle] = await db.select().from(factReconVehicles).where(eq(factReconVehicles.vin, vin));
    return vehicle;
  }

  async getVehicleRos(vin: string) {
    const ros = await db.select().from(serviceRos).where(eq(serviceRos.vin, vin)).orderBy(desc(serviceRos.closeDate));
    
    const result = [];
    for (const ro of ros) {
      const details = await db.select().from(serviceRoDetails).where(eq(serviceRoDetails.roNumber, ro.roNumber));
      result.push({ ...ro, details });
    }
    return result;
  }

  async logIngestion(log: Partial<IngestionLog>): Promise<IngestionLog> {
    const [entry] = await db.insert(ingestionLogs).values(log as any).returning();
    return entry;
  }

  async getIngestionLogs(): Promise<IngestionLog[]> {
    return db.select().from(ingestionLogs).orderBy(desc(ingestionLogs.ingestedAt)).limit(20);
  }

  async upsertInventory(items: InventoryVehicle[]): Promise<void> {
    if (items.length === 0) return;
    // Postgres upsert
    await db.insert(inventoryVehicles)
      .values(items)
      .onConflictDoUpdate({
        target: inventoryVehicles.vin,
        set: {
          stockNo: sql`excluded.stock_no`,
          entryDate: sql`excluded.entry_date`,
          lotLocation: sql`excluded.lot_location`,
          mileage: sql`excluded.mileage`,
          soldDate: sql`excluded.sold_date`,
          updatedAt: sql`NOW()`
        }
      });
  }

  async upsertRos(items: ServiceRo[]): Promise<void> {
    if (items.length === 0) return;
    await db.insert(serviceRos)
      .values(items)
      .onConflictDoUpdate({
        target: serviceRos.roNumber,
        set: {
          closeDate: sql`excluded.close_date`,
          roStatusCode: sql`excluded.ro_status_code`,
          updatedAt: sql`NOW()`
        }
      });
  }

  async upsertRoDetails(items: ServiceRoDetail[]): Promise<void> {
    if (items.length === 0) return;
    // Just insert for now, simpler than diffing lines. 
    // In a real app we might delete existing lines for the RO first.
    // For MVP, assume we append or replace. Let's delete old lines for these ROs then insert.
    const roNumbers = [...new Set(items.map(i => i.roNumber))];
    if (roNumbers.length > 0) {
      await db.delete(serviceRoDetails).where(sql`${serviceRoDetails.roNumber} IN ${roNumbers}`);
      await db.insert(serviceRoDetails).values(items);
    }
  }

  async recomputeReconMetrics(): Promise<void> {
    // This is the core logic:
    // 1. Clear fact table (or truncate) - for full recompute
    // 2. Insert calculated data from inventory + ROs
    
    await db.execute(sql`TRUNCATE TABLE ${factReconVehicles}`);

    // This complex query does the "Last RO with OP 100" logic
    await db.execute(sql`
      INSERT INTO fact_recon_vehicles (
        vin, stock_no, entry_date, lot_location, year, make, model, mileage, sold_date,
        last_recon_ro_number, last_recon_close_date, recon_days, recon_status
      )
      SELECT 
        i.vin, i.stock_no, i.entry_date, i.lot_location, i.year, i.make, i.model, i.mileage, i.sold_date,
        
        -- Logic for last Recon RO
        recon.ro_number as last_recon_ro_number,
        recon.close_date as last_recon_close_date,
        
        -- Recon Days
        CASE 
          WHEN recon.close_date IS NOT NULL THEN (recon.close_date - i.entry_date)
          ELSE NULL 
        END as recon_days,

        -- Status
        CASE 
          WHEN recon.ro_number IS NOT NULL THEN 'COMPLETE'::recon_status
          WHEN open_recon.ro_number IS NOT NULL THEN 'IN_PROGRESS'::recon_status
          ELSE 'NO_RECON_FOUND'::recon_status
        END as recon_status

      FROM inventory_vehicles i
      
      -- Join to find the LATEST closed recon RO (Op Code 100)
      LEFT JOIN LATERAL (
        SELECT ro.ro_number, ro.close_date
        FROM service_ros ro
        JOIN service_ro_details d ON ro.ro_number = d.ro_number
        WHERE ro.vin = i.vin 
          AND d.op_code = '100'
          AND ro.close_date IS NOT NULL
        ORDER BY ro.close_date DESC
        LIMIT 1
      ) recon ON true

      -- Join to find if any OPEN recon RO exists (if no closed one found)
      LEFT JOIN LATERAL (
        SELECT ro.ro_number
        FROM service_ros ro
        JOIN service_ro_details d ON ro.ro_number = d.ro_number
        WHERE ro.vin = i.vin 
          AND d.op_code = '100'
          AND ro.close_date IS NULL
        LIMIT 1
      ) open_recon ON true
    `);
  }
}

export const storage = new DatabaseStorage();
