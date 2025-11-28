import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, Filter, Download, FileText, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import type { ClassRead, SectionRead } from '@/types/masters/classesandsections';
import { PermissionGuard } from '@/components/PermissionGuard';

interface ClassSectionsTableProps {
   data: ClassRead[];
   onEditClass: (classData: ClassRead) => void;
   onDeleteClass: (classId: string) => void;
   onEditSection: (section: SectionRead) => void;
   onDeleteSection: (sectionId: string) => void;
   onAddSection: (classId: string) => void;
   isLoading?: boolean;
   hasSectionsPermission?: boolean;
}

export function ClassSectionsTable({
   data,
   onEditClass,
   onDeleteClass,
   onEditSection,
   onDeleteSection,
   onAddSection,
   isLoading,
   hasSectionsPermission = true
}: ClassSectionsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['name', 'short_code', 'sections', 'is_active'])
  );

  // Available columns
  const allColumns = [
    { key: 'name', label: 'Class Name' },
    { key: 'short_code', label: 'Class Code' },
    { key: 'sections', label: 'Sections' },
    { key: 'is_active', label: 'Status' },
  ];

  // Filtered columns
  const filteredColumns = allColumns.filter(col => visibleColumns.has(col.key));

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);

  // Column management functions
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
    setVisibleColumns(new Set(allColumns.map(col => col.key)));
  };

  const handleDeselectAllColumns = () => {
    setVisibleColumns(new Set());
  };

  // Export functions
  const handleExportCSV = () => {
    const headers = filteredColumns.map(col => col.label).join(',');
    const rows = data.map(classItem =>
      filteredColumns.map(col => {
        let value: any = '';
        switch (col.key) {
          case 'name':
            value = classItem.name;
            break;
          case 'short_code':
            value = classItem.short_code || '';
            break;
          case 'sections':
            value = classItem.sections.map(s => s.name).join('; ');
            break;
          case 'is_active':
            value = classItem.is_active ? 'Active' : 'Inactive';
            break;
        }
        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'classes_sections_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const exportData = data.map(classItem => {
      const row: any = {};
      filteredColumns.forEach(col => {
        switch (col.key) {
          case 'name':
            row[col.label] = classItem.name;
            break;
          case 'short_code':
            row[col.label] = classItem.short_code || '';
            break;
          case 'sections':
            row[col.label] = classItem.sections.map(s => s.name).join(', ');
            break;
          case 'is_active':
            row[col.label] = classItem.is_active ? 'Active' : 'Inactive';
            break;
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Classes & Sections');
    XLSX.writeFile(workbook, 'classes_sections_data.xlsx');
  };

  const toggleRowExpansion = (classId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading classes and sections...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Classes & Sections Management</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.size === allColumns.length}
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
                {allColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.has(col.key)}
                    onCheckedChange={() => handleColumnToggle(col.key)}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              {filteredColumns.map(col => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((classItem) => (
              <React.Fragment key={classItem.id}>
                <TableRow className="hover:bg-muted/50">
                  <TableCell>
                    {hasSectionsPermission ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(classItem.id)}
                        className="p-1"
                      >
                        {expandedRows.has(classItem.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="w-8"></div> // Placeholder to maintain table layout
                    )}
                  </TableCell>
                  {filteredColumns.map(col => (
                    <TableCell key={col.key}>
                      {col.key === 'name' && <span className="font-medium">{classItem.name}</span>}
                      {col.key === 'short_code' && (classItem.short_code || '-')}
                      {col.key === 'sections' && (
                        <Badge variant="secondary">
                          {classItem.sections.length} section{classItem.sections.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {col.key === 'is_active' && (
                        <Badge variant={classItem.is_active ? "default" : "secondary"}>
                          {classItem.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <PermissionGuard
                        resource="sections"
                        action="create"
                        fallback={null}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddSection(classItem.id)}
                          title="Add Section"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard
                        resource="classes"
                        action="update"
                        fallback={null}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditClass(classItem)}
                          title="Edit Class"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard
                        resource="classes"
                        action="delete"
                        fallback={null}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteClass(classItem.id)}
                          title="Delete Class"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRows.has(classItem.id) && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/50 p-0">
                      <div className="p-4">
                        <div className="mb-3">
                          <h4 className="font-medium text-sm text-foreground/80 mb-2">Sections:</h4>
                          {classItem.sections.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No sections found</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {classItem.sections.map((section) => (
                                <div
                                  key={section.id}
                                  className="flex items-center justify-between bg-background p-3 rounded border"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{section.name}</span>
                                    <Badge
                                      variant={section.is_active ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {section.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <PermissionGuard
                                      resource="sections"
                                      action="update"
                                      fallback={null}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEditSection(section)}
                                        title="Edit Section"
                                        className="h-6 w-6 p-0"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </PermissionGuard>
                                    <PermissionGuard
                                      resource="sections"
                                      action="delete"
                                      fallback={null}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDeleteSection(section.id)}
                                        title="Delete Section"
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </PermissionGuard>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {classItem.description && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Description:</strong> {classItem.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No classes found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {data.length > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {Math.min((currentPage - 1) * pageSize + 1, data.length)}-{Math.min(currentPage * pageSize, data.length)} of {data.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}