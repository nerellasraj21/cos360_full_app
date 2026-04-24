import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EditButton, DeleteButton } from "@/components/common/TableActions";
import { Edit, Trash2, Check, X, ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { PermissionGuard } from "@/components/PermissionGuard";


export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  editable?: boolean;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  renderEdit?: (value: any, row: T, onChange: (value: any) => void) => React.ReactNode;
  className?: string;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onEdit: (row: T, key: keyof T | string, value: any) => void;
  onDelete?: (row: T) => void;
  className?: string;
  isEditing?: boolean;
  permissions?: {
    resource?: string;
    canEdit?: boolean;
    canDelete?: boolean;
  };
  pagination?: PaginationProps;
  searchable?: boolean;
  showSerialNumber?: boolean;
}

type SortDir = "asc" | "desc" | null;

export function Table<T extends { [key: string]: any }>({
  columns,
  data,
  onEdit,
  onDelete,
  className,
  isEditing = true,
  pagination,
  permissions,
  searchable = true,
  showSerialNumber = true,
}: TableProps<T>) {
  const [editingRow, setEditingRow] = useState<{
    rowIdx: number;
    originalValues: T;
    currentValues: T;
  } | null>(null);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isAnyRowEditing = editingRow !== null;

  const handleSort = (key: string) => {
    if (isAnyRowEditing) return;
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      } else {
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Filter data by search query across all columns (raw value + rendered text)
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key as string];
        // Check raw value
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) return true;
        // Check rendered value if render returns a primitive (e.g. formatted date, route name, fees with ₹)
        if (col.render) {
          const rendered = col.render(val, row);
          if ((typeof rendered === 'string' || typeof rendered === 'number') && String(rendered).toLowerCase().includes(q)) return true;
        }
        return false;
      })
    );
  }, [data, searchQuery, columns]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const handleEditRow = (rowIdx: number) => {
    const row = sortedData[rowIdx];
    setEditingRow({
      rowIdx,
      originalValues: { ...row },
      currentValues: { ...row },
    });
  };

  const handleSaveRow = () => {
    if (editingRow) {
      Object.keys(editingRow.currentValues).forEach((key) => {
        if (editingRow.originalValues[key] !== editingRow.currentValues[key]) {
          onEdit(editingRow.currentValues, key, editingRow.currentValues[key]);
        }
      });
      setEditingRow(null);
    }
  };

  const handleDiscardRow = () => {
    setEditingRow(null);
  };

  const handleCellValueChange = (key: string, value: any) => {
    if (editingRow) {
      setEditingRow({
        ...editingRow,
        currentValues: {
          ...editingRow.currentValues,
          [key]: value,
        },
      });
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveRow();
    } else if (e.key === "Escape") {
      handleDiscardRow();
    }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />;
    if (sortDir === "asc") return <ChevronUp className="h-3 w-3 ml-1 shrink-0" />;
    return <ChevronDown className="h-3 w-3 ml-1 shrink-0" />;
  };

  const hasActionsCol = columns.some((col) => col.key === "actions");
  const totalCols =
    columns.length + (showSerialNumber ? 1 : 0) + (hasActionsCol ? 0 : 1);

  return (
    <div className={cn("w-full", className)}>
      {searchable && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isAnyRowEditing}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {searchQuery && (
              <span className="text-xs text-muted-foreground">
                {sortedData.length} of {data.length} results
              </span>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto w-full">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              {showSerialNumber && (
                <th className="px-3 py-2 text-left font-semibold border-b bg-muted w-14 text-xs text-muted-foreground whitespace-nowrap">
                  S.No.
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key as string}
                  className={cn(
                    "px-4 py-2 text-left font-semibold border-b bg-muted select-none whitespace-nowrap",
                    col.sortable !== false && !isAnyRowEditing && "cursor-pointer hover:bg-muted/80",
                    col.className
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.key as string)}
                >
                  <div className="flex items-center">
                    {col.label}
                    {col.sortable !== false && <SortIcon colKey={col.key as string} />}
                  </div>
                </th>
              ))}
              {!hasActionsCol && (
                <th className="px-4 py-2 text-left font-semibold border-b bg-muted w-24 whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery ? "No results found" : "No data"}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIdx) => {
                const isRowEditing = editingRow && editingRow.rowIdx === rowIdx;
                const currentRow = isRowEditing ? editingRow.currentValues : row;
                const serialNo = pagination
                  ? pagination.page * pagination.pageSize + rowIdx + 1
                  : rowIdx + 1;

                return (
                  <tr
                    key={rowIdx}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/50 dark:hover:bg-muted/70",
                      isRowEditing && "bg-accent/50"
                    )}
                    style={{ height: "48px" }}
                  >
                    {showSerialNumber && (
                      <td className="px-3 align-middle text-xs text-muted-foreground w-14">
                        {serialNo}
                      </td>
                    )}
                    {columns.map((col) => {
                      const value = currentRow[col.key as keyof T];
                      return (
                        <td
                          key={col.key as string}
                          className={cn("px-4 align-middle", col.className)}
                        >
                          {isRowEditing && col.editable ? (
                            col.renderEdit ? (
                              col.renderEdit(value, currentRow, (v: any) =>
                                handleCellValueChange(col.key as string, v)
                              )
                            ) : (
                              <Input
                                value={value as string}
                                onChange={(e) =>
                                  handleCellValueChange(col.key as string, e.target.value)
                                }
                                onKeyDown={handleInputKeyDown}
                                className="h-8 text-sm"
                              />
                            )
                          ) : col.render ? (
                            col.render(value, currentRow)
                          ) : (
                            value as React.ReactNode
                          )}
                        </td>
                      );
                    })}
                    {!hasActionsCol && (
                      <td className="px-4 align-middle">
                        <div className="flex gap-2">
                          {isRowEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveRow}
                                className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/50 dark:hover:text-green-400"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleDiscardRow}
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {isEditing && (
                                <PermissionGuard
                                  resource={permissions?.resource}
                                  action="update"
                                  fallback={null}
                                >
                                  <EditButton onClick={() => handleEditRow(rowIdx)} title="Edit" />
                                </PermissionGuard>
                              )}
                              {onDelete && (
                              <PermissionGuard
                                resource={permissions?.resource}
                                action="delete"
                                fallback={null}
                              >
                                <Dialog
                                  open={deleteIdx === rowIdx}
                                  onOpenChange={(open) =>
                                    setDeleteIdx(open ? rowIdx : null)
                                  }
                                >
                                  <DialogTrigger asChild>
                                    <DeleteButton
                                      onClick={() => setDeleteIdx(rowIdx)}
                                      title="Delete"
                                    />
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Delete Row?</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete this row? This
                                        action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                      </DialogClose>
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          onDelete?.(row);
                                          setDeleteIdx(null);
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </PermissionGuard>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => pagination.onPageChange(Math.max(0, pagination.page - 1))}
              disabled={pagination.page === 0}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={(pagination.page + 1) * pagination.pageSize >= pagination.total}
            >
              Next
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Rows per page:</span>
            <select
              className="border rounded px-2 py-1 bg-background text-foreground dark:bg-muted dark:border-muted-foreground/20"
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
            >
              {[5, 10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">
              {pagination.page * pagination.pageSize + 1}-
              {Math.min(
                (pagination.page + 1) * pagination.pageSize,
                pagination.total
              )}{" "}
              of {pagination.total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
