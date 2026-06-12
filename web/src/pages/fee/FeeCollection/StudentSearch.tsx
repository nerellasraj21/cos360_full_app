import { useState, useCallback, useMemo } from 'react';
import { Search, Loader2, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { FilterBar } from '@/components/ui/FilterBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { useStudentSearch } from '@/hooks/fee';
import type { StudentSearchParams, StudentSearchResult } from '@/types/fee';

interface StudentSearchProps {
  onSelectStudent: (student: StudentSearchResult) => void;
}

export default function StudentSearch({ onSelectStudent }: StudentSearchProps) {
  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<StudentSearchParams>({});
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const { data: classes = [] } = useClassesDropdown();
  const { data: sections = [] } = useSectionsByClassId(classId || '');

  const hasAnyFilter = !!(query.trim() || classId || sectionId);

  const { data: results = [], isLoading, isError, error } = useStudentSearch(
    searchParams,
    searchEnabled
  );

  const handleSearch = useCallback(() => {
    if (!hasAnyFilter) return;
    const params: StudentSearchParams = {};
    if (query.trim()) params.q = query.trim();
    if (classId) params.class_id = classId;
    if (sectionId) params.section_id = sectionId;
    setSearchParams(params);
    setSearchEnabled(true);
    setPage(1);
  }, [query, classId, sectionId, hasAnyFilter]);

  const handleClear = useCallback(() => {
    setQuery('');
    setClassId(null);
    setSectionId(null);
    setSearchParams({});
    setSearchEnabled(false);
    setPage(1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && hasAnyFilter) handleSearch();
    },
    [handleSearch, hasAnyFilter]
  );

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedResults = useMemo(
    () => results.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [results, currentPage, pageSize]
  );

  return (
    <div className="space-y-4">
      <FilterBar>
        <Input
          placeholder="Search by name, admission no, mobile, city..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-64"
        />
        <Select
          value={classId || ''}
          onValueChange={(val) => {
            setClassId(val || null);
            setSectionId(null);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sectionId || ''}
          onValueChange={(val) => setSectionId(val || null)}
          disabled={!classId}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} disabled={!hasAnyFilter || isLoading} size="sm">
          <Search className="h-4 w-4 mr-1" /> Search
        </Button>
        <Button variant="outline" onClick={handleClear} size="sm">
          Clear
        </Button>
      </FilterBar>

      {/* Results */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Searching students...</span>
        </div>
      )}

      {isError && (
        <div className="text-center py-4 text-sm text-destructive">
          {(error as Error)?.message || 'Failed to search students'}
        </div>
      )}

      {searchEnabled && !isLoading && !isError && results.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No students found. Try adjusting your search criteria.
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No.</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Class–Section</TableHead>
                  <TableHead>Parent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResults.map((student, index) => (
                  <TableRow
                    key={student.student_id}
                    className="cursor-pointer"
                    onClick={() => onSelectStudent(student)}
                  >
                    <TableCell className="py-2 text-muted-foreground">
                      {(currentPage - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-3">
                        {student.photo_url ? (
                          <img
                            src={student.photo_url}
                            alt={`${student.first_name} ${student.last_name}`}
                            className="h-9 w-9 rounded-full object-cover shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 ${student.photo_url ? 'hidden' : ''}`}>
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium truncate">
                          {student.first_name} {student.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {student.admission_number}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-muted-foreground">
                      {student.class_name}-{student.section_name}
                    </TableCell>
                    <TableCell className="py-2 text-muted-foreground">
                      {student.parent_name || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span>
                Page {currentPage} of {totalPages} ({results.length} students)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
