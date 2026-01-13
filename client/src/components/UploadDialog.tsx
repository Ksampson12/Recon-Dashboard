import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { useUploadFile } from "@/hooks/use-ingest";
import { useToast } from "@/hooks/use-toast";

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const { mutate: uploadFiles, isPending } = useUploadFile();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    }
  };

  const handleSubmit = () => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    uploadFiles(formData, {
      onSuccess: () => {
        toast({ title: "Upload Successful", description: `Uploaded ${files.length} file(s)` });
        setOpen(false);
        setFiles(null);
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
            <p className="text-sm text-muted-foreground mb-2">Drag and drop or click to browse</p>
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          {files && files.length > 0 && (
            <div className="text-sm text-foreground font-medium flex flex-col gap-1">
              <p>Selected {files.length} files:</p>
              <ul className="text-xs text-primary list-disc list-inside">
                {Array.from(files).map(f => <li key={f.name}>{f.name}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!files || files.length === 0 || isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Upload All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
