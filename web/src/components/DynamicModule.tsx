import React from 'react'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS, type PermissionResource } from '@/constants/permissions'

interface ModuleAction {
  key: string
  label: string
  icon?: string
  action: string // Action key like 'CREATE', 'READ', etc.
  component?: React.ComponentType<any>
  onClick?: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  disabled?: boolean
}

interface DynamicModuleProps {
  resource: PermissionResource
  title: string
  actions: ModuleAction[]
  children?: React.ReactNode
  className?: string
}

/**
 * DynamicModule component that renders module actions based on user permissions
 *
 * Usage:
 * ```tsx
 * <DynamicModule
 *   resource="STUDENTS"
 *   title="Student Management"
 *   actions={[
 *     {
 *       key: 'create',
 *       label: 'Add Student',
 *       action: 'CREATE',
 *       component: AddStudentButton
 *     },
 *     {
 *       key: 'list',
 *       label: 'View Students',
 *       action: 'LIST',
 *       onClick: () => navigate('/students')
 *     }
 *   ]}
 * />
 * ```
 */
export const DynamicModule: React.FC<DynamicModuleProps> = ({
  resource,
  title,
  actions,
  children,
  className = '',
}) => {
  const { checkPermissionByConstant } = usePermission()

  // Filter actions based on permissions
  const allowedActions = actions.filter(action => {
    try {
      return checkPermissionByConstant(resource, action.action as keyof typeof PERMISSIONS[typeof resource])
    } catch {
      return false
    }
  })

  if (allowedActions.length === 0 && !children) {
    return null // Don't render the module if no actions are allowed and no children
  }

  return (
    <div className={`dynamic-module ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      {children}

      {allowedActions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {allowedActions.map(action => {
            const ActionComponent = action.component

            if (ActionComponent) {
              return (
                <ActionComponent
                  key={action.key}
                  disabled={action.disabled}
                  variant={action.variant}
                />
              )
            }

            return (
              <button
                key={action.key}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  action.variant === 'destructive'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : action.variant === 'outline'
                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : action.variant === 'secondary'
                    ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    : action.variant === 'ghost'
                    ? 'text-gray-700 hover:bg-gray-100'
                    : action.variant === 'link'
                    ? 'text-blue-600 hover:text-blue-800 underline'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Pre-configured module components for common modules
export const StudentModule: React.FC<{ className?: string }> = ({ className }) => {
  const actions: ModuleAction[] = [
    {
      key: 'create',
      label: 'Add Student',
      action: 'CREATE',
      variant: 'default',
    },
    {
      key: 'list',
      label: 'View Students',
      action: 'LIST',
      variant: 'outline',
    },
    {
      key: 'admissions',
      label: 'Admissions',
      action: 'CREATE', // Using student_admissions resource would be better
      variant: 'secondary',
    },
  ]

  return (
    <DynamicModule
      resource="STUDENTS"
      title="Student Management"
      actions={actions}
      className={className}
    >
      <p className="text-gray-600 mb-4">
        Manage student records, admissions, and related information.
      </p>
    </DynamicModule>
  )
}

export const FeeModule: React.FC<{ className?: string }> = ({ className }) => {
  const actions: ModuleAction[] = [
    {
      key: 'categories',
      label: 'Fee Categories',
      action: 'LIST',
      variant: 'outline',
    },
    {
      key: 'types',
      label: 'Fee Types',
      action: 'LIST',
      variant: 'outline',
    },
    {
      key: 'collection',
      label: 'Fee Collection',
      action: 'CREATE',
      variant: 'default',
    },
  ]

  return (
    <DynamicModule
      resource="FEE_CATEGORIES"
      title="Fee Management"
      actions={actions}
      className={className}
    >
      <p className="text-gray-600 mb-4">
        Manage fee structures, collections, and financial records.
      </p>
    </DynamicModule>
  )
}

export const StaffModule: React.FC<{ className?: string }> = ({ className }) => {
  const actions: ModuleAction[] = [
    {
      key: 'create',
      label: 'Add Staff',
      action: 'CREATE',
      variant: 'default',
    },
    {
      key: 'list',
      label: 'View Staff',
      action: 'LIST',
      variant: 'outline',
    },
    {
      key: 'attendance',
      label: 'Staff Attendance',
      action: 'CREATE',
      variant: 'secondary',
    },
  ]

  return (
    <DynamicModule
      resource="STAFF"
      title="Staff Management"
      actions={actions}
      className={className}
    >
      <p className="text-gray-600 mb-4">
        Manage staff records, roles, and attendance.
      </p>
    </DynamicModule>
  )
}