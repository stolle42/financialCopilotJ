import { periodPresets, type DateRange } from '@/lib/periods'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type PeriodPickerProps = {
  value: DateRange
  onChange: (next: DateRange) => void
  onPreset: (presetId: string) => void
}

export function PeriodPicker({ value, onChange, onPreset }: PeriodPickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2">
        {periodPresets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="insights-from" className="text-muted-foreground text-sm">
          From
          <Input
            id="insights-from"
            type="date"
            className="mt-1"
            value={value.from}
            onChange={(event) =>
              onChange({ ...value, from: event.target.value })
            }
          />
        </label>
        <label htmlFor="insights-to" className="text-muted-foreground text-sm">
          To
          <Input
            id="insights-to"
            type="date"
            className="mt-1"
            value={value.to}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
          />
        </label>
      </div>
    </div>
  )
}
