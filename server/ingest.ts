import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { storage } from "./storage";
import { InventoryVehicle, ServiceRo, ServiceRoDetail } from "@shared/schema";

const INCOMING_DIR = "data/incoming";
const PROCESSED_DIR = "data/processed";
const REJECTED_DIR = "data/rejected";

// Ensure dirs exist
[INCOMING_DIR, PROCESSED_DIR, REJECTED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

export async function processFiles() {
  const files = fs.readdirSync(INCOMING_DIR);
  const processed = [];

  for (const file of files) {
    if (!file.endsWith(".csv")) continue;
    
    const filePath = path.join(INCOMING_DIR, file);
    try {
      const fileType = detectFileType(file);
      if (!fileType) throw new Error("Unknown file type");

      const content = fs.readFileSync(filePath, "utf-8");
      const records = parse(content, { 
        columns: true, 
        skip_empty_lines: true,
        trim: true 
      });

      console.log(`Processing ${file} as ${fileType} with ${records.length} rows`);

      await processRecords(fileType, records);
      
      // Move to processed
      const dest = path.join(PROCESSED_DIR, `${Date.now()}_${file}`);
      fs.renameSync(filePath, dest);
      
      await storage.logIngestion({
        fileName: file,
        fileType,
        rowCount: records.length,
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
  if (name.includes("salesclosed") || (name.includes("service") && name.includes("closed") && !name.includes("detail"))) return "RO_CLOSED";
  if (name.includes("detailsclosed") || (name.includes("service") && name.includes("details") && name.includes("closed"))) return "RO_CLOSED_DETAILS";
  if (name.includes("salesopen") || (name.includes("service") && name.includes("open") && !name.includes("detail"))) return "RO_OPEN";
  if (name.includes("detailsopen") || (name.includes("service") && name.includes("details") && name.includes("open"))) return "RO_OPEN_DETAILS";
  return null;
}

async function processRecords(type: string, records: any[]) {
  // Helper to safely parse date strings (assuming ISO or YYYY-MM-DD or standard CSV formats)
  // For robustness, we might need a library like date-fns, but try/catch basic new Date() for now
  const parseDate = (d: string) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.toISOString(); // Postgres driver handles ISO string
  };

  if (type === "INVENTORY") {
    const items: InventoryVehicle[] = records.map(r => ({
      vin: r.vin || r.VIN,
      stockNo: r.stockno || r.stocknumber || r.StockNo,
      entryDate: parseDate(r.entrydate || r.EntryDate || r.DateIn),
      year: parseInt(r.year || r.Year) || 0,
      make: r.make || r.makenameupper || r.Make,
      model: r.model || r.Model,
      mileage: parseInt(r.mileage || r.Mileage || r.Miles) || 0,
      lotLocation: r.lotlocation || r.LotLocation || r.Location,
      soldDate: parseDate(r.solddate || r.vehiclesolddate || r.SoldDate),
      updatedAt: new Date(),
    })).filter(i => i.vin && i.stockNo && i.entryDate); // EntryDate is critical per blueprint
    
    await storage.upsertInventory(items);
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

    await storage.upsertRos(items);
  }

  if (type === "RO_CLOSED_DETAILS" || type === "RO_OPEN_DETAILS") {
    const items: ServiceRoDetail[] = records.map(r => ({
      roNumber: r.ronumber || r.RONumber || r.RepairOrder,
      opCode: String(r.opcode || r.OpCode || r.OperationCode || ""),
      opDescription: r.opcodedescription || r.opcodedesc || r.Description,
    } as any)).filter(i => i.roNumber && i.opCode);
    
    await storage.upsertRoDetails(items);
  }
}
