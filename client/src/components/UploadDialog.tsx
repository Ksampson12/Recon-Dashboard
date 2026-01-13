import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { useUploadFile } from "@/hooks/use-ingest";
import { useToast } from "@/hooks/use-toast";

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { mutate: uploadFile, isPending } = useUploadFile();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    uploadFile(formData, {
      onSuccess: () => {
        toast({ title: "Upload Successful", description: `Uploaded ${file.name}` });
        setOpen(false);
        setFile(null);
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
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Data File</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <FileUp className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">Drag and drop or click to browse</p>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          {file && (
            <div className="text-sm text-foreground font-medium flex items-center gap-2">
              Selected: <span className="text-primary">{file.name}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!file || isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
