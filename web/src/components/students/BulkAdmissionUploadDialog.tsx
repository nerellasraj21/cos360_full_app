import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  useDownloadBulkAdmissionTemplate,
  useBulkUploadAdmissions,
} from '@/api/hooks/students/admissions';
import type { BulkAdmissionUploadResponse } from '@/types/admission';

interface BulkAdmissionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BulkAdmissionUploadDialog: React.FC<BulkAdmissionUploadDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkAdmissionUploadResponse | null>(null);

  const downloadTemplate = useDownloadBulkAdmissionTemplate();
  const bulkUpload = useBulkUploadAdmissions();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
    event.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      const data = await bulkUpload.mutateAsync(selectedFile);
      setResult(data);
      setSelectedFile(null);
    } catch {
      // Error toast handled by mutation
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedFile(null);
      setResult(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Admission Upload</DialogTitle>
          <DialogDescription>
            Download the template, fill in student rows, then upload the completed sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => downloadTemplate.mutate()}
            disabled={downloadTemplate.isPending}
          >
            {downloadTemplate.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Template
          </Button>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById('bulk-admission-file-input')?.click()}
              disabled={bulkUpload.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Browse File
            </Button>
            <input
              id="bulk-admission-file-input"
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".xlsx,.xls"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
            )}
          </div>

          {result && (
            <div className="space-y-3 rounded-md border p-3 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {result.created.length} of {result.total_rows} admission(s) created
              </div>
              {result.created.length > 0 && (
                <ul className="text-sm space-y-1">
                  {result.created.map((row) => (
                    <li key={row.row} className="text-muted-foreground">
                      Row {row.row}: {row.name} ({row.admission_number})
                    </li>
                  ))}
                </ul>
              )}
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {result.errors.length} row(s) failed
                  </div>
                  <ul className="text-sm space-y-1">
                    {result.errors.map((err, idx) => (
                      <li key={idx} className="text-destructive">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || bulkUpload.isPending}>
            {bulkUpload.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAdmissionUploadDialog;
