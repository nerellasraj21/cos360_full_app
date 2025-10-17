import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Plus, Filter, Download, FileText, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import type { ClassRead, SectionRead } from '@/types/masters/classesandsections';
import { useUpdateSectionById, useDeleteSectionById } from '@/api/hooks/masters/classesandsections';

interface SectionsManagementProps {
  data: ClassRead[];
  onEditSection: (section: SectionRead) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddSection: (classId: string) => void;
  isLoading?: boolean;
}

export function SectionsManagement({
  data,
  onEditSection,
  onDeleteSection,
  onAddSection,
  isLoading
}: SectionsManagementProps) {
  const updateSectionMutation = useUpdateSectionById();
  const deleteSectionMutation = useDeleteSectionById();
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['name', 'className', 'classIsActive', 'is_active'])
  );

  // Available columns
  const allColumns = [
    { key: 'name', label: 'Section Name' },
    { key: 'className', label: 'Class' },
    { key: 'classIsActive', label: 'Class Status' },
    { key: 'is_active', label: 'Section Status' },
  ];

  // Filtered columns
  const filteredColumns = allColumns.filter(col => visibleColumns.has(col.key));

  // Flatten sections with class information
  const allSections = useMemo(() => {
    return data.flatMap(classItem =>
      classItem.sections.map(section => ({
        ...section,
        className: classItem.name,
        classId: classItem.id,
        classShortCode: classItem.short_code,
        classIsActive: classItem.is_active
      }))
    );
  }, [data]);

  // Filter sections
  const filteredSections = useMemo(() => {
    return allSections.filter(section => {
      const matchesClass = classFilter === 'all' || section.classId === classFilter;
      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && section.is_active) ||
                           (statusFilter === 'inactive' && !section.is_active);

      return matchesClass && matchesStatus;
    });
  }, [allSections, classFilter, statusFilter]);

  // Paginated data
  const paginatedSections = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredSections.slice(startIndex, endIndex);
  }, [filteredSections, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredSections.length / pageSize);

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
    const rows = filteredSections.map(section =>
      filteredColumns.map(col => {
        let value: any = '';
        switch (col.key) {
          case 'name':
            value = section.name;
            break;
          case 'className':
            value = section.className;
            break;
          case 'classIsActive':
            value = section.classIsActive ? 'Active' : 'Inactive';
            break;
          case 'is_active':
            value = section.is_active ? 'Active' : 'Inactive';
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
    link.setAttribute('download', 'sections_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const exportData = filteredSections.map(section => {
      const row: any = {};
      filteredColumns.forEach(col => {
        switch (col.key) {
          case 'name':
            row[col.label] = section.name;
            break;
          case 'className':
            row[col.label] = section.className;
            break;
          case 'classIsActive':
            row[col.label] = section.classIsActive ? 'Active' : 'Inactive';
            break;
          case 'is_active':
            row[col.label] = section.is_active ? 'Active' : 'Inactive';
            break;
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sections');
    XLSX.writeFile(workbook, 'sections_data.xlsx');
  };

  // Get unique classes for filter
  const classes = useMemo(() => {
    return data.map(classItem => ({
      id: classItem.id,
      name: classItem.name,
      shortCode: classItem.short_code
    }));
  }, [data]);

  if (isLoading) {
    return <div className="text-center py-8">Loading sections...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Sections Management</CardTitle>
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
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(classItem => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {`${classItem.name} (${classItem.shortCode})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {filteredColumns.map(col => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSections.map((section) => (
              <TableRow key={section.id}>
                {filteredColumns.map(col => (
                  <TableCell key={col.key}>
                    {col.key === 'name' && <span className="font-medium">{section.name}</span>}
                    {col.key === 'className' && (
                      <div>
                        <div className="font-medium">{section.className}</div>
                        <div className="text-sm text-gray-500">{section.classShortCode}</div>
                      </div>
                    )}
                    {col.key === 'classIsActive' && (
                      <Badge variant={section.classIsActive ? "default" : "secondary"}>
                        {section.classIsActive ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                    {col.key === 'is_active' && (
                      <Badge variant={section.is_active ? "default" : "secondary"}>
                        {section.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditSection(section)}
                      title="Edit Section"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteSection(section.id)}
                      title="Delete Section"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSections.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  {classFilter !== 'all' || statusFilter !== 'all'
                    ? 'No sections match your filters'
                    : 'No sections found'
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {filteredSections.length > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
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
              <span className="text-sm text-gray-600">
                {Math.min((currentPage - 1) * pageSize + 1, filteredSections.length)}-{Math.min(currentPage * pageSize, filteredSections.length)} of {filteredSections.length}
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

        <div className="mt-4 text-sm text-gray-600">
          Showing {paginatedSections.length} of {filteredSections.length} sections
        </div>
      </CardContent>
    </Card>
  );
}