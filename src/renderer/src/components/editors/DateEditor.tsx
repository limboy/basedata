import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'

export function DateEditor({
  value,
  onChange,
  onDone
}: {
  value: unknown
  onChange: (value: unknown) => void
  onDone?: () => void
}): React.JSX.Element {
  const selected =
    typeof value === 'string' && value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <div>
      <Calendar
        mode="single"
        selected={selected}
        defaultMonth={selected}
        onSelect={(date) => {
          onChange(date ? format(date, 'yyyy-MM-dd') : undefined)
          onDone?.()
        }}
      />
      {selected && (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              onChange(undefined)
              onDone?.()
            }}
          >
            Clear date
          </Button>
        </div>
      )}
    </div>
  )
}
