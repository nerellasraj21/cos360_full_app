import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { GradeBandCreate } from '@/types/exam'

interface GradeBandEditorProps {
  bands: GradeBandCreate[]
  onChange: (bands: GradeBandCreate[]) => void
  readOnly?: boolean
}

const emptyBand = (): GradeBandCreate => ({
  from_percent: 0,
  to_percent: 100,
  from_marks: null,
  to_marks: null,
  grade_label: '',
  gpa: 0,
  remarks: '',
  is_pass: true,
  sort_order: 0,
})

export function GradeBandEditor({ bands, onChange, readOnly = false }: GradeBandEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const updateBand = (index: number, field: keyof GradeBandCreate, value: unknown) => {
    const updated = bands.map((band, i) =>
      i === index ? { ...band, [field]: value } : band
    )
    onChange(updated)
  }

  const addBand = () => {
    const newBand = {
      ...emptyBand(),
      sort_order: bands.length,
    }
    onChange([...bands, newBand])
  }

  const removeBand = (index: number) => {
    onChange(bands.filter((_, i) => i !== index))
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) return
    const reordered = [...bands]
    const [removed] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, removed)
    const withOrder = reordered.map((b, i) => ({ ...b, sort_order: i }))
    onChange(withOrder)
    setDragIndex(targetIndex)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {!readOnly && <th className="w-8 px-2 py-2" />}
              <th className="px-3 py-2 text-left font-medium">From %</th>
              <th className="px-3 py-2 text-left font-medium">To %</th>
              <th className="px-3 py-2 text-left font-medium">Grade</th>
              <th className="px-3 py-2 text-left font-medium">GPA</th>
              <th className="px-3 py-2 text-left font-medium">Remarks</th>
              <th className="px-3 py-2 text-left font-medium">Pass?</th>
              {!readOnly && <th className="w-10 px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {bands.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 6 : 8} className="px-3 py-6 text-center text-muted-foreground">
                  No grade bands defined. Click "Add Band" to get started.
                </td>
              </tr>
            )}
            {bands.map((band, index) => (
              <tr
                key={index}
                draggable={!readOnly}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`border-b transition-colors ${dragIndex === index ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-muted/20'}`}
              >
                {!readOnly && (
                  <td className="px-2 py-1.5">
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                  </td>
                )}
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span>{band.from_percent}</span>
                  ) : (
                    <Input
                      type="number"
                      value={band.from_percent}
                      onChange={(e) => updateBand(index, 'from_percent', parseFloat(e.target.value) || 0)}
                      className="h-7 w-20 text-xs"
                      min={0}
                      max={100}
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span>{band.to_percent}</span>
                  ) : (
                    <Input
                      type="number"
                      value={band.to_percent}
                      onChange={(e) => updateBand(index, 'to_percent', parseFloat(e.target.value) || 0)}
                      className="h-7 w-20 text-xs"
                      min={0}
                      max={100}
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <Badge variant="outline">{band.grade_label}</Badge>
                  ) : (
                    <Input
                      value={band.grade_label}
                      onChange={(e) => updateBand(index, 'grade_label', e.target.value)}
                      className="h-7 w-16 text-xs"
                      maxLength={10}
                      placeholder="A+"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span>{band.gpa.toFixed(1)}</span>
                  ) : (
                    <Input
                      type="number"
                      value={band.gpa}
                      onChange={(e) => updateBand(index, 'gpa', parseFloat(e.target.value) || 0)}
                      className="h-7 w-16 text-xs"
                      min={0}
                      max={10}
                      step={0.1}
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span className="text-muted-foreground">{band.remarks || '—'}</span>
                  ) : (
                    <Input
                      value={band.remarks || ''}
                      onChange={(e) => updateBand(index, 'remarks', e.target.value)}
                      className="h-7 w-28 text-xs"
                      placeholder="Excellent"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <Badge variant={band.is_pass ? 'default' : 'destructive'}>
                      {band.is_pass ? 'Pass' : 'Fail'}
                    </Badge>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-1">
                      <input
                        type="checkbox"
                        checked={band.is_pass}
                        onChange={(e) => updateBand(index, 'is_pass', e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className={`text-xs font-medium ${band.is_pass ? 'text-green-600' : 'text-red-500'}`}>
                        {band.is_pass ? 'Pass' : 'Fail'}
                      </span>
                    </label>
                  )}
                </td>
                {!readOnly && (
                  <td className="px-2 py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBand(index)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addBand} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add Band
        </Button>
      )}
    </div>
  )
}
