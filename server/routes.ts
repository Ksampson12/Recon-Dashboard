import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { processFiles } from "./ingest.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

const upload = multer({ dest: "data/incoming/" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Dashboard Routes
  app.get(api.dashboard.stats.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get(api.dashboard.list.path, async (req, res) => {
    const result = await storage.getReconVehicles({
      search: req.query.search as string,
      location: req.query.location as string,
      status: req.query.status as string,
      sortBy: req.query.sortBy as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json(result);
  });

  app.get(api.dashboard.get.path, async (req, res) => {
    const vehicle = await storage.getVehicle(req.params.vin);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    
    const roHistory = await storage.getVehicleRos(req.params.vin);
    
    // Transform dates to strings for JSON
    const serializedHistory = roHistory.map(ro => ({
      roNumber: ro.roNumber,
      openDate: ro.openDate ? ro.openDate.toString() : null,
      closeDate: ro.closeDate ? ro.closeDate.toString() : null,
      status: ro.roStatusCode,
      details: ro.details.map(d => ({
        opCode: d.opCode,
        description: d.opDescription
      }))
    }));

    res.json({ vehicle, roHistory: serializedHistory });
  });

  // Ingestion Routes
  app.get(api.ingest.logs.path, async (req, res) => {
    const logs = await storage.getIngestionLogs();
    res.json(logs);
  });

  app.post(api.ingest.trigger.path, async (req, res) => {
    try {
      const result = await processFiles();
      res.json({ message: "Ingestion triggered", processedFiles: result });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.ingest.upload.path, upload.array('files'), async (req, res) => {
    if (!req.files || (req.files as any[]).length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const files = req.files as Express.Multer.File[];
    console.log(`Received ${files.length} files for upload`);
    
    for (const file of files) {
      const targetPath = path.join("data/incoming", file.originalname);
      console.log(`Saving file: ${file.originalname} to ${targetPath}`);
      fs.renameSync(file.path, targetPath);
    }
    
    // Auto-trigger processing
    const processed = await processFiles();
    console.log(`Processed ${processed.length} files successfully`);
    
    res.json({ message: "Files uploaded and ingestion triggered", count: files.length, processed });
  });

  return httpServer;
}
