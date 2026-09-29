import React from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Home } from 'lucide-react';
import { useRouterState } from '@tanstack/react-router';
import { pathToBreadcrumbs, MODULE_COLORS } from '@/lib/routeLabels';
import { cn } from '@/lib/utils';

export function AppBreadcrumb() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const crumbs = pathToBreadcrumbs(pathname);

  if (crumbs.length <= 1) return null; // Don't show breadcrumb on dashboard (only "Home")

  // Determine module for color accent
  const parts = pathname.split('/').filter(Boolean);
  const module = parts[0] ?? '';
  const moduleColor = MODULE_COLORS[module] ?? 'text-primary';

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 px-4 md:px-6 lg:px-8 py-2 text-sm border-b bg-muted/30"
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        const isFirst = idx === 0;

        return (
          <React.Fragment key={crumb.path}>
            {idx > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {isLast ? (
              <span
                className={cn(
                  'font-medium truncate max-w-[200px]',
                  moduleColor
                )}
              >
                {isFirst && <Home className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />}
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path as any}
                className={cn(
                  'text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]',
                  isFirst && 'flex items-center gap-1'
                )}
              >
                {isFirst && <Home className="h-3.5 w-3.5" />}
                {!isFirst && crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
