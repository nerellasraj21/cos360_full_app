import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FeeValidationWarning } from '@/types/fee/dashboard';

interface FeeValidationWarningsProps {
    warnings: FeeValidationWarning[];
    isLoading: boolean;
}

export function FeeValidationWarnings({ warnings, isLoading }: FeeValidationWarningsProps) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (warnings.length === 0) {
        return (
            <Alert>
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-semibold text-accent-foreground">All Good!</h4>
                        <p className="text-sm text-muted-foreground">No validation issues found in your fee configuration.</p>
                    </div>
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                        ✓ Validated
                    </Badge>
                </div>
            </Alert>
        );
    }

    const getSeverityColor = (severity: FeeValidationWarning['severity']) => {
        switch (severity) {
            case 'error':
                return 'bg-destructive/10 border-destructive/20 text-destructive';
            case 'warning':
                return 'bg-chart-4/10 border-chart-4/20 text-chart-4';
            case 'info':
                return 'bg-primary/10 border-primary/20 text-primary';
            default:
                return 'bg-muted border-muted-foreground/20 text-muted-foreground';
        }
    };

    const getSeverityBadge = (severity: FeeValidationWarning['severity']) => {
        switch (severity) {
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            case 'warning':
                return <Badge variant="secondary" className="bg-chart-4/20 text-chart-4">Warning</Badge>;
            case 'info':
                return <Badge variant="secondary" className="bg-primary/20 text-primary">Info</Badge>;
            default:
                return <Badge variant="secondary">Unknown</Badge>;
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold">Validation Warnings</h3>
            {warnings.map((warning) => (
                <Alert key={warning.id} className={getSeverityColor(warning.severity)}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{warning.title}</h4>
                                {getSeverityBadge(warning.severity)}
                            </div>
                            <p className="text-sm">{warning.description}</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-4"
                            onClick={() => {
                                // TODO: Navigate to the specific section to fix the issue
                                console.log('Navigate to fix:', warning);
                            }}
                        >
                            Fix Issue
                        </Button>
                    </div>
                </Alert>
            ))}
        </div>
    );
}