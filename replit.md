# ReconBoard - Used Vehicle Reconditioning Dashboard

## Overview

ReconBoard is an internal web application that produces a Used Vehicle Reconditioning Dashboard by ingesting DMS (Dealer Management System) CSV exports. The application calculates reconditioning time metrics for vehicles by analyzing inventory data and service repair order records.

**Core Business Logic:**
- **Recon Time** = Recon Complete Date − Inventory Entry Date
- Recon completion is determined by OP code "100" on the most recent closed service RO
- Vehicles are tracked through three statuses: NO_RECON_FOUND, IN_PROGRESS, COMPLETE

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API with typed routes defined in `shared/routes.ts`
- **File Processing**: CSV ingestion with automatic file type detection

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**:
  - `inventory_vehicles` - Vehicle inventory (anchor table)
  - `service_ros` - Service repair order headers
  - `service_ro_details` - Service RO line items with op codes
  - `fact_recon_vehicles` - Computed metrics for dashboard
  - `ingestion_logs` - File processing audit trail

### Data Ingestion Pattern
- CSV files are placed in `data/incoming/` directory
- Files are processed, parsed, and upserted into database tables
- Processed files move to `data/processed/`, rejected files to `data/rejected/`
- Recon metrics are recomputed after each ingestion

### API Structure
Routes are defined in `shared/routes.ts` with Zod schemas for type safety:
- `GET /api/dashboard/stats` - Dashboard KPI metrics
- `GET /api/vehicles` - Paginated vehicle list with filters
- `GET /api/vehicles/:vin` - Vehicle detail with RO history
- `POST /api/ingest/trigger` - Trigger file processing
- `POST /api/ingest/upload` - Upload CSV files
- `GET /api/ingest/logs` - Ingestion audit logs

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations
- Schema migrations managed via `drizzle-kit push`

### File Processing
- `csv-parse` for CSV parsing
- `multer` for file upload handling

### Frontend Libraries
- Full shadcn/ui component suite (Radix UI primitives)
- `date-fns` for date formatting
- `recharts` available for data visualization
- Lucide React for icons

### Development Tools
- Vite dev server with Replit-specific plugins
- esbuild for production server bundling
- TypeScript with strict mode enabled