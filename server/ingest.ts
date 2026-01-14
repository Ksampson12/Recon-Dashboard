import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { storage } from "./storage";
import { InventoryVehicle, ServiceRo, ServiceRoDetail } from "@shared/schema";

const INCOMING_DIR = "data/incoming";
const PROCESSED_DIR = "data/processed";
const REJECTED_DIR = "data/rejected";
const BATCH_SIZE = 1000; // Process in batches

// Ensure dirs exist
[INCOMING_DIR, PROCESSED_DIR, REJECTED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// True streaming - process batches as we read, never hold entire file in memory
async function streamProcessFile(filePath: string, fileType: string): Promise<number> {
  // For RO details, truncate table first since we're doing full refresh
  if (fileType === "RO_CLOSED_DETAILS") {
    console.log("Truncating closed RO details for full refresh...");
    await storage.truncateRoDetails();
  }

  const parser = fs.createReadStream(filePath).pipe(
    parse({ 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    })
  );

  let batch: any[] = [];
  let totalRows = 0;
  let headerLogged = false;

  for await (const record of parser) {
    if (!headerLogged) {
      console.log("CSV Column Keys:", Object.keys(record).slice(0, 5).join(', ') + '...');
      headerLogged = true;
    }
    
    batch.push(record);
    totalRows++;

    // Process batch when full
    if (batch.length >= BATCH_SIZE) {
      await processRecords(fileType, batch);
      if (totalRows % 10000 === 0) {
        console.log(`Processed ${totalRows} rows...`);
      }
      batch = []; // Clear batch
    }
  }

  // Process remaining records
  if (batch.length > 0) {
    await processRecords(fileType, batch);
  }

  return totalRows;
}

export async function processFiles() {
  const files = fs.readdirSync(INCOMING_DIR);
  const processed = [];

  for (const file of files) {
    if (!file.endsWith(".csv")) continue;
    
    const filePath = path.join(INCOMING_DIR, file);
    try {
      const fileType = detectFileType(file);
      if (!fileType) throw new Error("Unknown file type");

      console.log(`Processing ${file} as ${fileType}...`);
      const rowCount = await streamProcessFile(filePath, fileType);
      console.log(`Completed ${file}: ${rowCount} rows processed`);
      
      // Move to processed
      const dest = path.join(PROCESSED_DIR, `${Date.now()}_${file}`);
      fs.renameSync(filePath, dest);
      
      await storage.logIngestion({
        fileName: file,
        fileType,
        rowCount,
        status: "SUCCESS"
      });
      processed.push(file);

    } catch (err: any) {
      console.error(`Error processing ${file}:`, err);
      // Move to rejected
      const dest = path.join(REJECTED_DIR, `${Date.now()}_${file}`);
      if (fs.existsSync(filePath)) fs.renameSync(filePath, dest);

      await storage.logIngestion({
        fileName: file,
        fileType: "UNKNOWN",
        status: "FAILED",
        errorMessage: err.message
      });
    }
  }

  if (processed.length > 0) {
    await storage.recomputeReconMetrics();
  }

  return processed;
}

function detectFileType(filename: string): string | null {
  const name = filename.toLowerCase();
  if (name.includes("inventory")) return "INVENTORY";
  // More robust matching for DMS patterns like "ServiceSalesClosed"
  if (name.includes("salesclosed") || (name.includes("service") && name.includes("closed") && !name.includes("detail"))) return "RO_CLOSED";
  if (name.includes("detailsclosed") || (name.includes("service") && name.includes("details") && name.includes("closed"))) return "RO_CLOSED_DETAILS";
  if (name.includes("salesopen") || (name.includes("service") && name.includes("open") && !name.includes("detail"))) return "RO_OPEN";
  if (name.includes("detailsopen") || (name.includes("service") && name.includes("details") && name.includes("open"))) return "RO_OPEN_DETAILS";
  return null;
}

async function processRecords(type: string, records: any[]) {
  const parseDate = (d: string) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.toISOString();
  };

  if (type === "INVENTORY") {
    const items: InventoryVehicle[] = records.map(r => {
      const stockType = (r.stocktype || r.StockType || "").toUpperCase();
      return {
        vin: r.vin || r.VIN,
        stockNo: r.stockno || r.stocknumber || r.StockNo,
        stockType: stockType,
        inventoryCompany: r.inventorycompany || r.InventoryCompany || null, // 1=ACF, 2=LCF, 3=CFMG
        entryDate: parseDate(r.entrydate || r.EntryDate || r.DateIn) || new Date().toISOString(),
        year: parseInt(r.year || r.Year) || 0,
        make: r.make || r.makenameupper || r.Make,
        model: r.model || r.Model,
        mileage: parseInt(r.mileage || r.Mileage || r.Miles) || 0,
        lotLocation: r.lotlocation || r.LotLocation || r.Location,
        soldDate: parseDate(r.solddate || r.vehiclesolddate || r.SoldDate),
        updatedAt: new Date(),
      };
    }).filter(i => {
      // Only include USED vehicles that are not sold
      const isUsed = i.stockType === "USED";
      const hasVinAndStock = i.vin && i.stockNo;
      return hasVinAndStock && isUsed;
    });
    
    if (items.length > 0) {
      await storage.upsertInventory(items);
    }
  }

  if (type === "RO_CLOSED" || type === "RO_OPEN") {
    const isOpen = type === "RO_OPEN";
    const items: ServiceRo[] = records.map(r => ({
      roNumber: r.ronumber || r.RONumber || r.RepairOrder,
      vin: r.vin || r.VIN,
      openDate: parseDate(r.opendate || r.OpenDate),
      closeDate: parseDate(r.closedate || r.CloseDate),
      roStatusCode: r.rostatuscode || r.Status,
      isOpen,
      updatedAt: new Date(),
    })).filter(i => i.roNumber && i.vin);

    if (items.length > 0) {
      await storage.upsertRos(items);
    }
  }

  if (type === "RO_CLOSED_DETAILS" || type === "RO_OPEN_DETAILS") {
    const items: ServiceRoDetail[] = records.map(r => ({
      roNumber: r.ronumber || r.RONumber || r.RepairOrder,
      opCode: String(r.opcode || r.OpCode || r.OperationCode || ""),
      opDescription: r.opcodedescription || r.opcodedesc || r.Description,
      laborType: r.labortype || r.LaborType || null,
      laborSale: parseFloat(r.laborsale || r.LaborSale) || 0,
      laborCost: parseFloat(r.laborcost || r.LaborCost) || 0,
      partsSale: parseFloat(r.partssale || r.PartsSale) || 0,
      partsCost: parseFloat(r.partscost || r.PartsCost) || 0,
    } as any)).filter(i => i.roNumber && i.opCode);
    
    if (items.length > 0) {
      await storage.upsertRoDetails(items);
    }
  }
}
