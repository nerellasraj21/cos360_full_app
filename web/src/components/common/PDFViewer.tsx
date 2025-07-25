import React from "react";
import { FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFViewerProps {
  file: File | string;
  fileName?: string;
  className?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, fileName, className }) => {
  const fileUrl = typeof file === 'string' ? file : URL.createObjectURL(file);
  const displayName = fileName || (typeof file !== 'string' ? file.name : 'Document');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = displayName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="font-medium text-sm text-foreground">{displayName}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenInNewTab}
            className="h-8"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative bg-background">
        <iframe
          src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full border-0 bg-background"
          title={`PDF Viewer - ${displayName}`}
          style={{
            colorScheme: 'light dark',
            filter: 'none'
          }}
        />
      </div>
    </div>
  );
};

// Simple PDF preview component for smaller spaces
export const PDFPreview: React.FC<PDFViewerProps> = ({ file, fileName, className }) => {
  const fileUrl = typeof file === 'string' ? file : URL.createObjectURL(file);
  const displayName = fileName || (typeof file !== 'string' ? file.name : 'Document');

  return (
    <div className={`relative bg-muted rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        className="w-full h-full border-0 bg-background"
        title={`PDF Preview - ${displayName}`}
        style={{
          colorScheme: 'light dark'
        }}
      />
      <div className="absolute top-2 left-2 bg-background/90 text-foreground px-2 py-1 rounded text-xs border border-border">
        PDF
      </div>
    </div>
  );
};