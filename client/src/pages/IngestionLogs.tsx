import { useIngestionLogs } from "@/hooks/use-ingest";
import { Loader2, FileText, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function IngestionLogs() {
  const { data: logs, isLoading } = useIngestionLogs();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Ingestion Logs</h1>
        <p className="text-muted-foreground mt-2">History of data imports and processing status.</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">File Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Rows</th>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs?.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  {log.status === "SUCCESS" ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium text-xs">
                      <CheckCircle className="w-4 h-4" /> Success
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 font-medium text-xs">
                      <XCircle className="w-4 h-4" /> Failed
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-foreground">{log.fileName}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {log.fileType}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono">{log.rowCount?.toLocaleString() ?? '-'}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {log.ingestedAt ? format(new Date(log.ingestedAt), 'MMM d, HH:mm:ss') : '-'}
                </td>
                <td className="px-6 py-4 text-muted-foreground max-w-xs truncate" title={log.errorMessage || ""}>
                  {log.errorMessage || "-"}
                </td>
              </tr>
            ))}
            {logs?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
