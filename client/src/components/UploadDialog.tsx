import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { useUploadFile } from "@/hooks/use-ingest";
import { useToast } from "@/hooks/use-toast";

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const { mutate: uploadFiles, isPending } = useUploadFile();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev: File[]) => [...prev, ...newFiles]);
    }
    // Reset input value so same file can be selected again if needed
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file: File) => {
      formData.append("files", file);
    });

    uploadFiles(formData, {
      onSuccess: (data) => {
        toast({ 
          title: "Upload Successful", 
          description: `Uploaded ${files.length} file(s). Processed: ${data.processedCount || 0}` 
        });
        setOpen(false);
        setFiles([]);
      },
      onError: (err) => {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload CSVs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Data Files</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors relative">
            <FileUp className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">Drag and drop multiple files (CSV)</p>
            <p className="text-xs text-muted-foreground">Select all 5 files at once (Hold Ctrl/Cmd to select multiple)</p>
            <input
              type="file"
              accept=".csv"
              multiple={true}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          {files.length > 0 && (
            <div className="text-sm text-foreground font-medium flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <p>Selected {files.length} files:</p>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-auto p-0 text-muted-foreground hover:text-destructive">
                  Clear all
                </Button>
              </div>
              <ul className="text-xs text-primary max-h-[150px] overflow-y-auto border rounded p-2 bg-muted/20">
                {files.map((f: File, i: number) => (
                  <li key={`${f.name}-${i}`} className="flex justify-between items-center py-1 border-b last:border-0 border-border/50">
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive ml-2">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={files.length === 0 || isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Upload All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
