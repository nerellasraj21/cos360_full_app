import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EditButton, DeleteButton, TableActionGroup } from '@/components/common/TableActions';
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Edit, Trash2, Plus, Filter, Download, FileText, FileSpreadsheet, Search } from 'lucide-react';
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
   addButton?: React.ReactNode;
}


export function ClassSectionsTable({
   data,
   onEditClass,
   onDeleteClass,
   onEditSection,
   onDeleteSection,
   onAddSection,
   isLoading,
   hasSectionsPermission = true,
   addButton,
}: ClassSectionsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['name', 'short_code', 'sections', 'is_active'])
  );
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Available columns
  const allColumns = [
    { key: 'name', label: 'Class Name' },
    { key: 'short_code', label: 'Class Code' },
    { key: 'sections', label: 'Sections' },
    { key: 'is_active', label: 'Status' },
  ];

  // Filtered columns
  const filteredColumns = allColumns.filter(col => visibleColumns.has(col.key));

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(cls =>
      cls.name.toLowerCase().includes(q) ||
      (cls.short_code || '').toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      if (sortKey === 'name') { aVal = a.name; bVal = b.name; }
      else if (sortKey === 'short_code') { aVal = a.short_code || ''; bVal = b.short_code || ''; }
      else if (sortKey === 'sections') { aVal = a.sections.length; bVal = b.sections.length; }
      else if (sortKey === 'is_active') { aVal = a.is_active ? 1 : 0; bVal = b.is_active ? 1 : 0; }
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 shrink-0" />;
    return <ChevronDown className="h-3 w-3 ml-1 shrink-0" />;
  };

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
    const rows = sortedData.map(classItem =>
      filteredColumns.map(col => {
        let value: any = '';
        switch (col.key) {
          case 'name': value = classItem.name; break;
          case 'short_code': value = classItem.short_code || ''; break;
          case 'sections': value = classItem.sections.map(s => s.name).join('; '); break;
          case 'is_active': value = classItem.is_active ? 'Active' : 'Inactive'; break;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'classes_sections_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const exportData = sortedData.map(classItem => {
      const row: any = {};
      filteredColumns.forEach(col => {
        switch (col.key) {
          case 'name': row[col.label] = classItem.name; break;
          case 'short_code': row[col.label] = classItem.short_code || ''; break;
          case 'sections': row[col.label] = classItem.sections.map(s => s.name).join(', '); break;
          case 'is_active': row[col.label] = classItem.is_active ? 'Active' : 'Inactive'; break;
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
          <CardTitle className="text-2xl font-bold">Classes & Sections</CardTitle>
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
                    if (checked) handleSelectAllColumns();
                    else handleDeselectAllColumns();
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
            {addButton}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter bar */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-14 text-xs text-muted-foreground">S.No.</TableHead>
              {filteredColumns.map(col => (
                <TableHead
                  key={col.key}
                  className="cursor-pointer select-none hover:bg-muted/80"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center">
                    {col.label}
                    <SortIcon colKey={col.key} />
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((classItem, idx) => {
              const serialNo = (currentPage - 1) * pageSize + idx + 1;
              return (
                <React.Fragment key={classItem.id}>
                  <TableRow className="hover:bg-muted/50" style={{ height: '48px' }}>
                    <TableCell className="align-middle">
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
                        <div className="w-8"></div>
                      )}
                    </TableCell>
                    <TableCell className="align-middle text-xs text-muted-foreground">{serialNo}</TableCell>
                    {filteredColumns.map(col => (
                      <TableCell key={col.key} className="align-middle">
                        {col.key === 'name' && <span className="font-medium">{classItem.name}</span>}
                        {col.key === 'short_code' && (classItem.short_code || '-')}
                        {col.key === 'sections' && (
                          <Badge variant="secondary">
                            {classItem.sections.length} section{classItem.sections.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {col.key === 'is_active' && (
                          <StatusBadge status={classItem.is_active ?? false} />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right align-middle">
                      <TableActionGroup>
                        <PermissionGuard resource="sections" action="create" fallback={null}>
                          <Button variant="ghost" size="sm" onClick={() => onAddSection(classItem.id)} title="Add Section">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard resource="classes" action="update" fallback={null}>
                          <EditButton onClick={() => onEditClass(classItem)} title="Edit Class" />
                        </PermissionGuard>
                        <PermissionGuard resource="classes" action="delete" fallback={null}>
                          <DeleteButton onClick={() => onDeleteClass(classItem.id)} title="Delete Class" />
                        </PermissionGuard>
                      </TableActionGroup>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(classItem.id) && (
                    <TableRow>
                      <TableCell colSpan={filteredColumns.length + 3} className="bg-muted/50 p-0">
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
                                      <StatusBadge status={section.is_active ?? false} />
                                    </div>
                                    <TableActionGroup>
                                      <PermissionGuard resource="sections" action="update" fallback={null}>
                                        <EditButton onClick={() => onEditSection(section)} title="Edit Section" />
                                      </PermissionGuard>
                                      <PermissionGuard resource="sections" action="delete" fallback={null}>
                                        <DeleteButton onClick={() => onDeleteSection(section.id)} title="Delete Section" />
                                      </PermissionGuard>
                                    </TableActionGroup>
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
              );
            })}
            {sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={filteredColumns.length + 3} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No results found' : 'No classes found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {sortedData.length > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
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
                {Math.min((currentPage - 1) * pageSize + 1, sortedData.length)}-{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
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
