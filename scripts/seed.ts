
import fs from "fs";
import path from "path";
import { processFiles } from "../server/ingest";

const INCOMING_DIR = "data/incoming";

if (!fs.existsSync(INCOMING_DIR)) {
  fs.mkdirSync(INCOMING_DIR, { recursive: true });
}

// Sample Inventory
const inventoryCsv = `vin,stockno,entrydate,year,make,model,mileage,lotlocation,solddate
VIN001,STK001,2023-10-01,2020,Toyota,Camry,45000,Lot A,
VIN002,STK002,2023-10-05,2021,Honda,Civic,30000,Lot B,
VIN003,STK003,2023-10-10,2019,Ford,F-150,60000,Lot A,
VIN004,STK004,2023-10-15,2022,Tesla,Model 3,15000,Lot C,
VIN005,STK005,2023-10-20,2018,Chevrolet,Malibu,50000,Lot B,2023-11-01
`;

// Sample Service RO Header (Closed)
const roClosedCsv = `ronumber,vin,opendate,closedate,rostatuscode
RO1001,VIN001,2023-10-02,2023-10-04,C
RO1002,VIN001,2023-10-06,2023-10-08,C
RO1003,VIN002,2023-10-06,2023-10-09,C
RO1005,VIN005,2023-10-21,2023-10-22,C
`;

// Sample Service RO Details (Closed)
// RO1002 and RO1003 have Recon Op Code 100
const roDetailsClosedCsv = `ronumber,opcode,opcodedescription
RO1001,LOF,Lube Oil Filter
RO1002,100,Used Vehicle Recon
RO1002,DET,Detail
RO1003,100,Used Vehicle Recon
RO1005,LOF,Lube Oil Filter
`;

// Sample Service RO Header (Open)
const roOpenCsv = `ronumber,vin,opendate,rostatuscode
RO1004,VIN004,2023-10-16,O
`;

// Sample Service RO Details (Open)
const roDetailsOpenCsv = `ronumber,opcode,opcodedescription
RO1004,100,Used Vehicle Recon
`;

async function seed() {
  console.log("Seeding data...");
  
  fs.writeFileSync(path.join(INCOMING_DIR, "inventory_sample.csv"), inventoryCsv);
  fs.writeFileSync(path.join(INCOMING_DIR, "servicesalesclosed_sample.csv"), roClosedCsv);
  fs.writeFileSync(path.join(INCOMING_DIR, "servicesalesdetailsclosed_sample.csv"), roDetailsClosedCsv);
  fs.writeFileSync(path.join(INCOMING_DIR, "servicesalesopen_sample.csv"), roOpenCsv);
  fs.writeFileSync(path.join(INCOMING_DIR, "servicesalesdetailsopen_sample.csv"), roDetailsOpenCsv);

  console.log("Files created. Triggering ingestion...");
  await processFiles();
  console.log("Seeding complete.");
}

seed().catch(console.error);
