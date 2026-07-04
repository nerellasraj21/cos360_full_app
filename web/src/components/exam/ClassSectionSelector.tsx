import ReactSelect from 'react-select'
import { useSelectStyles } from '@/lib/useSelectStyles'
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
  const selectStyles = useSelectStyles()

  const options = availableClasses.flatMap(cls => {
    if (cls.sections.length === 0) {
      return [{ value: `${cls.id}|`, label: cls.name }]
    }
    return cls.sections.map(s => ({
      value: `${cls.id}|${s.id}`,
      label: `${cls.name} – ${s.name}`,
    }))
  })

  const selectedOptions = value.map(v => {
    const key = `${v.class_id}|${v.section_id ?? ''}`
    return options.find(o => o.value === key) ?? { value: key, label: key }
  })

  const handleChange = (selected: readonly { value: string; label: string }[]) => {
    onChange(
      selected.map(opt => {
        const [classId, sectionId] = opt.value.split('|')
        return { class_id: classId, section_id: sectionId || null }
      })
    )
  }

  if (availableClasses.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No classes available. Set up class-subject mappings first.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <ReactSelect
        isMulti
        isDisabled={disabled}
        options={options}
        value={selectedOptions}
        onChange={handleChange}
        placeholder="Type to search and select class-sections…"
        menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
        styles={selectStyles}
        closeMenuOnSelect={false}
      />
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} class-section{value.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
