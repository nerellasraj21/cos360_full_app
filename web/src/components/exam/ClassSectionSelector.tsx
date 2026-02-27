import { Badge } from '@/components/ui/badge'
import type { ClassSectionPayload } from '@/types/exam'

interface AvailableClass {
  id: string
  name: string
  sections: { id: string; name: string }[]
}

interface ClassSectionSelectorProps {
  value: ClassSectionPayload[]
  onChange: (selected: ClassSectionPayload[]) => void
  availableClasses: AvailableClass[]
  disabled?: boolean
}

export function ClassSectionSelector({
  value,
  onChange,
  availableClasses,
  disabled = false,
}: ClassSectionSelectorProps) {
  const isSelected = (classId: string, sectionId: string | null) =>
    value.some(v => v.class_id === classId && v.section_id === sectionId)

  const toggle = (classId: string, sectionId: string | null) => {
    if (disabled) return
    if (isSelected(classId, sectionId)) {
      onChange(value.filter(v => !(v.class_id === classId && v.section_id === sectionId)))
    } else {
      onChange([...value, { class_id: classId, section_id: sectionId }])
    }
  }

  const toggleAllSections = (cls: AvailableClass) => {
    if (disabled) return
    const allSelected = cls.sections.every(s => isSelected(cls.id, s.id))
    if (allSelected) {
      // Deselect all sections of this class
      onChange(value.filter(v => v.class_id !== cls.id))
    } else {
      // Select all sections of this class
      const existing = value.filter(v => v.class_id !== cls.id)
      const toAdd = cls.sections
        .filter(s => !isSelected(cls.id, s.id))
        .map(s => ({ class_id: cls.id, section_id: s.id }))
      onChange([...existing, ...toAdd])
    }
  }

  if (availableClasses.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No classes available. Set up class-subject mappings first.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {availableClasses.map((cls) => {
        const allSelected = cls.sections.length > 0 && cls.sections.every(s => isSelected(cls.id, s.id))
        const someSelected = cls.sections.some(s => isSelected(cls.id, s.id))

        return (
          <div key={cls.id} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected
                }}
                onChange={() => toggleAllSections(cls)}
                disabled={disabled}
                className="h-4 w-4 cursor-pointer"
              />
              <span className="font-medium">{cls.name}</span>
              {someSelected && (
                <Badge variant="secondary" className="text-xs">
                  {value.filter(v => v.class_id === cls.id).length} / {cls.sections.length} selected
                </Badge>
              )}
            </div>
            {cls.sections.length > 0 ? (
              <div className="ml-7 flex flex-wrap gap-2">
                {cls.sections.map((section) => {
                  const selected = isSelected(cls.id, section.id)
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => toggle(cls.id, section.id)}
                      disabled={disabled}
                      className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors ${
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:border-primary hover:bg-primary/5'
                      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      Section {section.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="ml-7">
                <button
                  type="button"
                  onClick={() => toggle(cls.id, null)}
                  disabled={disabled}
                  className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors ${
                    isSelected(cls.id, null)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary hover:bg-primary/5'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  All Sections
                </button>
              </div>
            )}
          </div>
        )
      })}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} class-section{value.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
