import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Edit, Trash2, Check, X } from "lucide-react";
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

interface TablePropsWithPagination<T> extends TableProps<T> {
  pagination?: PaginationProps;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onEdit: (row: T, key: keyof T | string, value: any) => void;
  onDelete: (row: T) => void;
  className?: string;
  isEditing?: boolean;
  permissions?: {
    resource?: string;
    canEdit?: boolean;
    canDelete?: boolean;
  };
}

export function Table<T extends { [key: string]: any }>({
  columns,
  data,
  onEdit,
  onDelete,
  className,
  isEditing = true,
  pagination,
  permissions,
}: TablePropsWithPagination<T>) {
  const [editingRow, setEditingRow] = useState<{
    rowIdx: number;
    originalValues: T;
    currentValues: T;
  } | null>(null);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  const handleEditRow = (rowIdx: number) => {
    const row = data[rowIdx];
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

  return (
    <div className={cn("overflow-x-auto w-full", className)}>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key as string}
                className={cn("px-4 py-2 text-left font-semibold border-b bg-muted", col.className)}
              >
                {col.label}
              </th>
            ))}
            {!columns.some(col => col.key === 'actions') && (
              <th className="px-4 py-2 text-left font-semibold border-b bg-muted">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (columns.some(col => col.key === 'actions') ? 0 : 1)} className="text-center py-6 text-muted-foreground">
                No data
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const isRowEditing = editingRow && editingRow.rowIdx === rowIdx;
              const currentRow = isRowEditing ? editingRow.currentValues : row;

              return (
                <tr key={rowIdx} className={cn("border-b last:border-0 hover:bg-muted/50 dark:hover:bg-muted/70", isRowEditing && "bg-accent/50")}>
                  {columns.map((col) => {
                    const value = currentRow[col.key as keyof T];
                    return (
                      <td
                        key={col.key as string}
                        className={cn("px-4 py-2 align-middle", col.className)}
                      >
                        {isRowEditing && col.editable ? (
                          col.renderEdit ? (
                            col.renderEdit(value, currentRow, (v: any) => handleCellValueChange(col.key as string, v))
                          ) : (
                            <Input
                              value={value as string}
                              onChange={(e) => handleCellValueChange(col.key as string, e.target.value)}
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
                  {!columns.some(col => col.key === 'actions') && (
                    <td className="px-4 py-2 align-middle">
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditRow(rowIdx)}
                                  className="h-8 w-8 p-0 hover:bg-accent"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                            )}
                            <PermissionGuard
                              resource={permissions?.resource}
                              action="delete"
                              fallback={null}
                            >
                              <Dialog open={deleteIdx === rowIdx} onOpenChange={open => setDeleteIdx(open ? rowIdx : null)}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteIdx(rowIdx)}
                                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Row?</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete this row? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                  <Button
                                    variant="destructive"
                                    onClick={() => {
                                      onDelete(row);
                                      setDeleteIdx(null);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            </PermissionGuard>
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
              onChange={e => pagination.onPageSizeChange(Number(e.target.value))}
            >
              {[5, 10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-muted-foreground">
              {pagination.page * pagination.pageSize + 1}
              -
              {Math.min((pagination.page + 1) * pagination.pageSize, pagination.total)}
              {' '}of {pagination.total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
