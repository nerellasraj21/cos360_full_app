import { useState, useCallback } from 'react';
import { Search, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  }, [query, classId, sectionId, hasAnyFilter]);

  const handleClear = useCallback(() => {
    setQuery('');
    setClassId(null);
    setSectionId(null);
    setSearchParams({});
    setSearchEnabled(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && hasAnyFilter) handleSearch();
    },
    [handleSearch, hasAnyFilter]
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((student) => (
            <Card
              key={student.student_id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectStudent(student)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={`${student.first_name} ${student.last_name}`}
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 ${student.photo_url ? 'hidden' : ''}`}>
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {student.first_name} {student.last_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {student.admission_number}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {student.class_name}-{student.section_name}
                      </span>
                    </div>
                    {student.parent_name && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Parent: {student.parent_name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
