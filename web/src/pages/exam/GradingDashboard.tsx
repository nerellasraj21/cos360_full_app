import { useNavigate } from '@tanstack/react-router';
import { Layers, Table2, ListChecks, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useExamGradeSchemes } from '@/api/hooks/exam/useExam';
import { useSubjectGradeSchemes } from '@/api/hooks/exam/useExam';
import { useRemarkGradeSets } from '@/api/hooks/exam/useExam';

interface NavItem {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
}

const navItems: NavItem[] = [
  {
    title: 'Exam Grade Schemes',
    description: 'Define percentage-based grade bands with GPA and pass/fail thresholds for exams',
    path: '/exam/grading/exam-schemes',
    icon: <Table2 className="h-5 w-5" />,
    color: 'bg-chart-1/10 border-chart-1/20 hover:bg-chart-1/20',
  },
  {
    title: 'Subject Grade Schemes',
    description: 'Configure subject-specific grading schemes with custom grade bands',
    path: '/exam/grading/subject-schemes',
    icon: <Table2 className="h-5 w-5" />,
    color: 'bg-chart-2/10 border-chart-2/20 hover:bg-chart-2/20',
  },
  {
    title: 'Remark Grade Sets',
    description: 'Manage descriptive remark options (e.g. Excellent, Good, Satisfactory) for teacher feedback',
    path: '/exam/grading/remarks',
    icon: <ListChecks className="h-5 w-5" />,
    color: 'bg-chart-3/10 border-chart-3/20 hover:bg-chart-3/20',
  },
];

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="text-2xl font-bold">{loading ? '—' : value}</div>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function GradingDashboard() {
  const navigate = useNavigate();

  const { data: examSchemes, isLoading: loadingExam } = useExamGradeSchemes();
  const { data: subjectSchemes, isLoading: loadingSubject } = useSubjectGradeSchemes();
  const { data: remarkSets, isLoading: loadingRemarks } = useRemarkGradeSets();

  const examCount = Array.isArray(examSchemes) ? examSchemes.length : 0;
  const subjectCount = Array.isArray(subjectSchemes) ? subjectSchemes.length : 0;
  const remarkCount = Array.isArray(remarkSets) ? remarkSets.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grading"
        subtitle="Manage exam grade schemes, subject grade schemes, and remark grade sets"
        icon={<Layers className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Exam Grade Schemes" value={examCount} loading={loadingExam} />
        <StatCard label="Subject Grade Schemes" value={subjectCount} loading={loadingSubject} />
        <StatCard label="Remark Grade Sets" value={remarkCount} loading={loadingRemarks} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Grading Sections</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => (
            <Card
              key={item.path}
              className={`cursor-pointer transition-all hover:shadow-md ${item.color}`}
              onClick={() => navigate({ to: item.path })}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="text-foreground">{item.icon}</div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-3">{item.description}</CardDescription>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: item.path });
                  }}
                >
                  Open <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
