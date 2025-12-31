import { useState } from "react";
import { AlertCircle, CheckCircle2, XCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedRows: ParsedRow[];
  onConfirmImport: (validRows: ParsedRow[]) => Promise<void>;
  importing: boolean;
}

export function validateImportRow(row: Record<string, string>, rowNumber: number): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation - only Name, Code, and Phone are required
  if (!row.Name?.trim()) {
    errors.push("Name is required");
  }

  if (!row.Code?.trim()) {
    errors.push("Code is required");
  }

  if (!row.Phone?.trim()) {
    errors.push("Phone is required");
  }

  // Email format validation (optional field)
  if (row.Email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.Email.trim())) {
    warnings.push("Invalid email format");
  }

  // Phone format validation (basic)
  if (row.Phone?.trim() && !/^[\d\s\-\(\)\+]+$/.test(row.Phone.trim())) {
    warnings.push("Phone may have invalid characters");
  }

  // Code length validation
  if (row.Code?.trim() && row.Code.trim().length > 4) {
    warnings.push("Code will be truncated to 4 characters");
  }

  // Active/CDL validation
  const activeVal = row.Active?.toLowerCase();
  if (activeVal && !["yes", "no", "active", "inactive", ""].includes(activeVal)) {
    warnings.push("Active should be 'yes' or 'no'");
  }

  const cdlVal = row.CDL?.toLowerCase();
  if (cdlVal && !["yes", "no", "cdl", "non-cdl", ""].includes(cdlVal)) {
    warnings.push("CDL should be 'yes' or 'no'");
  }

  // Shuttle program validation - blank defaults to "no"
  const shuttleFields = ["Amtrak_Primary", "Amtrak_Trained", "BPH_Primary", "BPH_Trained"];
  for (const field of shuttleFields) {
    const val = row[field]?.trim()?.toLowerCase();
    if (val && val !== "yes" && val !== "no") {
      warnings.push(`${field} should be 'yes' or 'no' (blank = no)`);
      break;
    }
  }

  return {
    rowNumber,
    data: row,
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  parsedRows,
  onConfirmImport,
  importing,
}: ImportPreviewDialogProps) {
  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);
  const rowsWithWarnings = parsedRows.filter((r) => r.warnings.length > 0 && r.isValid);

  const handleImport = async () => {
    await onConfirmImport(validRows);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Preview
          </DialogTitle>
          <DialogDescription>
            Review the data before importing. Rows with errors will be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 py-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {validRows.length} Valid
          </Badge>
          {invalidRows.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              {invalidRows.length} Errors
            </Badge>
          )}
          {rowsWithWarnings.length > 0 && (
            <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
              <AlertCircle className="h-3 w-3" />
              {rowsWithWarnings.length} Warnings
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Shuttle</TableHead>
                <TableHead>CDL</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedRows.map((row) => (
                <TableRow
                  key={row.rowNumber}
                  className={
                    !row.isValid
                      ? "bg-destructive/10"
                      : row.warnings.length > 0
                      ? "bg-amber-500/10"
                      : ""
                  }
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.rowNumber}
                  </TableCell>
                  <TableCell>
                    {!row.isValid ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : row.warnings.length > 0 ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </TableCell>
                  <TableCell className={!row.data.Name?.trim() ? "text-destructive" : ""}>
                    {row.data.Name || <span className="italic text-muted-foreground">Missing</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.data.Code?.slice(0, 4).toUpperCase() || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.data.Amtrak_Primary?.toLowerCase() === "yes" && (
                        <Badge variant="default" className="text-xs bg-blue-600">AMT-P</Badge>
                      )}
                      {row.data.Amtrak_Trained?.toLowerCase() === "yes" && (
                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">AMT-T</Badge>
                      )}
                      {row.data.BPH_Primary?.toLowerCase() === "yes" && (
                        <Badge variant="default" className="text-xs bg-green-600">BPH-P</Badge>
                      )}
                      {row.data.BPH_Trained?.toLowerCase() === "yes" && (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-600">BPH-T</Badge>
                      )}
                      {!row.data.Amtrak_Primary && !row.data.Amtrak_Trained && !row.data.BPH_Primary && !row.data.BPH_Trained && (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.data.CDL?.toLowerCase() === "yes" || row.data.CDL?.toLowerCase() === "cdl" ? (
                      <Badge variant="secondary" className="text-xs">CDL</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.data.Phone || "-"}
                  </TableCell>
                  <TableCell>
                    {(row.errors.length > 0 || row.warnings.length > 0) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              {row.errors.length > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {row.errors.length} error{row.errors.length > 1 ? "s" : ""}
                                </Badge>
                              )}
                              {row.warnings.length > 0 && (
                                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                                  {row.warnings.length} warning{row.warnings.length > 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-1">
                              {row.errors.map((e, i) => (
                                <p key={i} className="text-destructive text-xs">• {e}</p>
                              ))}
                              {row.warnings.map((w, i) => (
                                <p key={i} className="text-amber-500 text-xs">• {w}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {validRows.length} of {parsedRows.length} rows will be imported
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
              {importing ? "Importing..." : `Import ${validRows.length} Drivers`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
