import { z } from 'zod';
import { factReconVehicles, ingestionLogs, inventoryVehicles, serviceRos, serviceRoDetails } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          avgReconDays: z.number(),
          medianReconDays: z.number(),
          countInProgress: z.number(),
          countNoRecon: z.number(),
          countCompleted: z.number(),
          countOverThreshold: z.number(),
        }),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/vehicles',
      input: z.object({
        search: z.string().optional(), // stock or vin
        location: z.string().optional(),
        status: z.enum(["NO_RECON_FOUND", "IN_PROGRESS", "COMPLETE"]).optional(),
        sortBy: z.enum(["days_desc", "days_asc", "date_desc", "date_asc"]).optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof factReconVehicles.$inferSelect>()),
          total: z.number(),
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vehicles/:vin',
      responses: {
        200: z.object({
          vehicle: z.custom<typeof factReconVehicles.$inferSelect>(),
          roHistory: z.array(z.object({
             roNumber: z.string(),
             openDate: z.string().nullable(),
             closeDate: z.string().nullable(),
             status: z.string().nullable(),
             details: z.array(z.object({
               opCode: z.string(),
               description: z.string().nullable()
             }))
          }))
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  ingest: {
    trigger: {
      method: 'POST' as const,
      path: '/api/ingest/trigger',
      responses: {
        200: z.object({
          message: z.string(),
          processedFiles: z.array(z.string())
        }),
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/ingest/upload',
      // Body is FormData (multipart), so we don't strictly type input here
      responses: {
        200: z.object({
          message: z.string(),
        }),
        400: errorSchemas.validation
      }
    },
    logs: {
      method: 'GET' as const,
      path: '/api/ingest/logs',
      responses: {
        200: z.array(z.custom<typeof ingestionLogs.$inferSelect>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
