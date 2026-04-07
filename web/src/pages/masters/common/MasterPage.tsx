import React, { useState, useEffect, useRef } from "react";
import { Table } from "@/components/common/table";
import type { TableColumn } from "@/components/common/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/TimePicker";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Filter,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS, type PermissionResource } from "@/constants/permissions";

// Helper function to get resource name from permission constant
const getResourceName = (resource: PermissionResource): string => {
  const permission = Object.values(PERMISSIONS[resource])[0] as string;
  return permission.split(":")[0];
};

export interface MasterPageConfig<T, TInput> {
  title: string;
  /** When true, hides the CardTitle inside the card (use when page already has a top-level h1 heading) */
  hideTitle?: boolean;
  /** Custom label for the add button (defaults to "Add {title minus last char}") */
  addButtonLabel?: string;
  /** When true, hides the Add button inside the card header (use when button is rendered externally in the heading row) */
  hideAddButton?: boolean;
  /** Externally controlled open state for the Add dialog */
  addOpen?: boolean;
  /** Callback when the Add dialog open state changes */
  onAddOpenChange?: (open: boolean) => void;
  columns: TableColumn<T>[];
  defaultValues: TInput;
  formFields: FormField[];
  isLoading: boolean;
  data: T[];
  onCreate: (data: TInput) => void;
  onUpdate: (id: string | number, data: any) => void;
  onDelete: (id: string | number) => void;
  isCreatePending: boolean;
  resetForm: () => void;
  isEditing?: boolean;
  addModal?: React.ReactNode;
  showColumnSelector?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  renderCustomField?: (
    field: FormField,
    value: any,
    onChange: (value: any) => void
  ) => React.ReactNode;
  // Permission configuration
  permissions?: {
    resource: PermissionResource;
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    list?: boolean;
    export?: boolean;
  };
}

export interface FormField {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "checkbox" | "academic_year_select";
  required?: boolean;
  pattern?: string;
  patternMessage?: string;
}

interface MasterPageProps<T, TInput> {
  config: MasterPageConfig<T, TInput>;
}

export function MasterPage<
  T extends { id: string | number },
  TInput extends Record<string, any>,
>({ config }: MasterPageProps<T, TInput>) {
  const [formData, setFormData] = useState<TInput>(config.defaultValues);
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const pendingCloseRef = useRef(false);
  const prevIsPendingRef = useRef(false);
  const isModalOpen = config.addOpen !== undefined ? config.addOpen : localModalOpen;
  const setIsModalOpen = (open: boolean) => {
    setLocalModalOpen(open);
    config.onAddOpenChange?.(open);
  };
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(config.columns.map((col) => col.key as string))
  );

  const filteredColumns = config.columns.filter((col) =>
    visibleColumns.has(col.key as string)
  );

  const handleColumnToggle = (columnKey: string) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const handleSelectAllColumns = () => {
    setVisibleColumns(new Set(config.columns.map((col) => col.key as string)));
  };

  const handleDeselectAllColumns = () => {
    setVisibleColumns(new Set());
  };

  const handleExportCSV = () => {
    const headers = filteredColumns.map((col) => col.label).join(",");
    const rows = config.data
      .map((row) =>
        filteredColumns
          .map((col) => {
            const value = row[col.key as keyof T];

            const escapedValue = String(value).replace(/"/g, '""');
            return `"${escapedValue}"`;
          })
          .join(",")
      )
      .join("\n");

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${config.title.toLowerCase().replace(/\s+/g, "_")}_data.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const data = config.data.map((row) =>
      filteredColumns.reduce(
        (acc, col) => {
          acc[col.label] = row[col.key as keyof T];
          return acc;
        },
        {} as Record<string, any>
      )
    );

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    XLSX.writeFile(
      workbook,
      `${config.title.toLowerCase().replace(/\s+/g, "_")}_data.xlsx`
    );
  };

  const handleDownloadData = () => {
    const jsonData = {
      title: config.title,
      columns: filteredColumns.map((col) => ({
        key: col.key,
        label: col.label,
      })),
      data: config.data.map((row) => {
        const filteredRow: any = {};
        filteredColumns.forEach((col) => {
          filteredRow[col.key as string] = row[col.key as keyof T];
        });
        return filteredRow;
      }),
      exportedAt: new Date().toISOString(),
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${config.title.toLowerCase().replace(/\s+/g, "_")}_data.json`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (row: T, key: keyof T | string, value: any) => {
    let updated: any = { ...row };
    if (key === "is_active") {
      updated[key] = value === "true" || value === true || value === "Yes";
    } else {
      updated[key] = value;
    }
    config.onUpdate(row.id, updated);
  };

  const handleDelete = (row: T) => {
    config.onDelete(row.id);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    pendingCloseRef.current = true;
    config.onCreate(formData);
  };

  // Auto-close the Add dialog once the create mutation finishes
  useEffect(() => {
    if (config.isCreatePending) {
      prevIsPendingRef.current = true;
    } else if (prevIsPendingRef.current && pendingCloseRef.current) {
      prevIsPendingRef.current = false;
      pendingCloseRef.current = false;
      setIsModalOpen(false);
      setFormData(config.defaultValues);
      config.resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.isCreatePending]);

  const isFormDirty = JSON.stringify(formData) !== JSON.stringify(config.defaultValues);

  const handleConfirmClose = () => {
    pendingCloseRef.current = false;
    setIsModalOpen(false);
    setFormData(config.defaultValues);
    config.resetForm();
  };

  const renderFormField = (field: FormField) => {
    const { name, label, type = "text", required = false } = field;

    // Check for custom field rendering first
    if (config.renderCustomField) {
      const customField = config.renderCustomField(
        field,
        formData[name as keyof TInput],
        (val: any) => setFormData((prev) => ({ ...prev, [name]: val }))
      );
      if (customField) {
        return (
          <div key={name} className="mb-4">
            <Label htmlFor={name}>{label}</Label>
            {customField}
          </div>
        );
      }
    }

    if (type === "time") {
      const rawValue = formData[name as keyof TInput] as string;
      return (
        <div key={name} className="mb-4">
          <Label htmlFor={name}>{label}</Label>
          <TimePicker
            value={rawValue ? rawValue.substring(0, 5) : ''}
            onChange={(val) => setFormData((prev) => ({ ...prev, [name]: val }))}
            required={required}
          />
        </div>
      );
    }

    if (type === "checkbox") {
      return (
        <div key={name} className="flex items-center gap-2 mt-6">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            name={name}
            type="checkbox"
            checked={formData[name as keyof TInput] as boolean}
            onChange={handleInputChange}
            className="w-4 h-4"
          />
        </div>
      );
    }

    return (
      <div key={name} className="mb-4">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          type={type}
          value={formData[name as keyof TInput] as string}
          onChange={handleInputChange}
          required={required}
          pattern={field.pattern}
          title={field.patternMessage}
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          {!config.hideTitle && <CardTitle className="text-2xl font-bold">{config.title}</CardTitle>}
          <div className="flex items-center gap-2 ml-auto">
            {config.showColumnSelector && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.size === config.columns.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleSelectAllColumns();
                      } else {
                        handleDeselectAllColumns();
                      }
                    }}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer font-medium border-b border-b-gray-200"
                  >
                    Select All
                  </DropdownMenuCheckboxItem>
                  {config.columns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.key as string}
                      checked={visibleColumns.has(col.key as string)}
                      onCheckedChange={() =>
                        handleColumnToggle(col.key as string)
                      }
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer"
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <PermissionGuard
              resource={
                config.permissions?.resource
                  ? getResourceName(config.permissions.resource)
                  : undefined
              }
              action="list"
              fallback={null}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleExportCSV}
                    className="cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export to CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportExcel}
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDownloadData}
                    className="cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Data
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGuard>
            <PermissionGuard
              resource={
                config.permissions?.resource
                  ? getResourceName(config.permissions.resource)
                  : undefined
              }
              action="create"
              fallback={null}
            >
              {config.addModal ? (
                config.addModal
              ) : (
                <Dialog
                  open={isModalOpen}
                  onOpenChange={setIsModalOpen}
                  modal={false}
                  guardDirty={isFormDirty}
                  onDirtyDiscard={handleConfirmClose}
                >
                  {!config.hideAddButton && (
                    <DialogTrigger asChild>
                      <Button>{config.addButtonLabel || `Add ${config.title.slice(0, -1)}`}</Button>
                    </DialogTrigger>
                  )}
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {config.addButtonLabel ? `${config.addButtonLabel}` : `Add New ${config.title.slice(0, -1)}`}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdd}>
                      <div className="space-y-4">
                        {config.formFields.map(renderFormField)}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={config.isCreatePending}>
                          {config.isCreatePending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          {config.addButtonLabel || `Add ${config.title.slice(0, -1)}`}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </PermissionGuard>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <PermissionGuard
          resource={
            config.permissions?.resource
              ? getResourceName(config.permissions.resource)
              : undefined
          }
          action="read"
          fallback={
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-600">
                You don't have permission to view this data.
              </p>
            </div>
          }
        >
          {config.isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading data...</span>
            </div>
          ) : (
            <Table
              columns={filteredColumns}
              data={config.data}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isEditing={config.isEditing}
              pagination={config.pagination}
              permissions={{
                resource: config.permissions?.resource
                  ? getResourceName(config.permissions.resource)
                  : undefined,
                canEdit: config.permissions?.update,
                canDelete: config.permissions?.delete,
              }}
            />
          )}
        </PermissionGuard>
      </CardContent>
    </Card>
  );
}
