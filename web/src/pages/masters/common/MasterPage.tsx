import React, { useState } from 'react';
import { Table } from '@/components/common/table';
import type { TableColumn } from '@/components/common/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, Download, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface MasterPageConfig<T, TInput> {
  title: string;
  columns: TableColumn<T>[];
  defaultValues: TInput;
  formFields: FormField[];
  isLoading: boolean;
  data: T[];
  onCreate: (data: TInput) => void;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
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
}

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'checkbox' | 'academic_year_select';
  required?: boolean;
}

interface MasterPageProps<T, TInput> {
  config: MasterPageConfig<T, TInput>;
}

export function MasterPage<T extends { id: number }, TInput extends Record<string, any>>({
  config
}: MasterPageProps<T, TInput>) {
  const [formData, setFormData] = useState<TInput>(config.defaultValues);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(config.columns.map(col => col.key as string))
  );


  const filteredColumns = config.columns.filter(col => visibleColumns.has(col.key as string));

  const handleColumnToggle = (columnKey: string) => {
    setVisibleColumns(prev => {
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
    setVisibleColumns(new Set(config.columns.map(col => col.key as string)));
  };

  const handleDeselectAllColumns = () => {
    setVisibleColumns(new Set());
  };

  const handleExportCSV = () => {
    const headers = filteredColumns.map(col => col.label).join(',');
    const rows = config.data.map(row =>
      filteredColumns.map(col => {
        const value = row[col.key as keyof T];

        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${config.title.toLowerCase().replace(/\s+/g, '_')}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {

    const data = config.data.map(row =>
      filteredColumns.reduce((acc, col) => {
        acc[col.label] = row[col.key as keyof T];
        return acc;
      }, {} as Record<string, any>)
    );


    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');


    XLSX.writeFile(workbook, `${config.title.toLowerCase().replace(/\s+/g, '_')}_data.xlsx`);
  };

  const handleDownloadData = () => {
    const jsonData = {
      title: config.title,
      columns: filteredColumns.map(col => ({ key: col.key, label: col.label })),
      data: config.data.map(row => {
        const filteredRow: any = {};
        filteredColumns.forEach(col => {
          filteredRow[col.key as string] = row[col.key as keyof T];
        });
        return filteredRow;
      }),
      exportedAt: new Date().toISOString()
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${config.title.toLowerCase().replace(/\s+/g, '_')}_data.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEdit = (row: T, key: keyof T | string, value: any) => {
    let updated: any = { ...row };
    if (key === 'is_active') {
      updated[key] = value === 'true' || value === true || value === 'Yes';
    } else if (key === 'academic_year_id') {
      updated[key] = Number(value);
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
    config.onCreate(formData);
    config.resetForm();
    setFormData(config.defaultValues);
    setIsModalOpen(false);
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setFormData(config.defaultValues);
    }
  };

  const renderFormField = (field: FormField) => {
    const { name, label, type = 'text', required = false } = field;


    if (type === 'academic_year_select' && config.renderCustomField) {
      return (
        <div key={name} className="mb-4">
          <Label htmlFor={name}>{label}</Label>
          {config.renderCustomField(
            field,
            formData[name as keyof TInput],
            (val: any) => setFormData((prev) => ({ ...prev, [name]: val }))
          )}
        </div>
      );
    }

    if (type === 'checkbox') {
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
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{config.title}</CardTitle>
          <div className="flex items-center gap-2">
            {config.showColumnSelector && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
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
                      onCheckedChange={() => handleColumnToggle(col.key as string)}
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer"
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadData} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-2" />
                  Download Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {config.addModal ? (
              config.addModal
            ) : (
              <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
                <DialogTrigger asChild>
                  <Button>Add {config.title.slice(0, -1)}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New {config.title.slice(0, -1)}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAdd}>
                    <div className="space-y-4">
                      {config.formFields.map(renderFormField)}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit" disabled={config.isCreatePending}>
                        Add {config.title.slice(0, -1)}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table
          columns={filteredColumns}
          data={config.data}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isEditing={config.isEditing}
          pagination={config.pagination}
        />
        {config.isLoading && <div>Loading...</div>}
      </CardContent>
    </Card>
  );
}


