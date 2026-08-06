import { useRef, useState } from 'react'
import { ChevronDown, Expand, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Field, Project, RecordRow, View } from '@shared/types'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { ChoiceBadge } from '@/components/ChoiceBadge'
import { ValueDisplay } from '@/components/ValueDisplay'
import { FieldDialog } from '@/components/FieldDialog'
import { DateEditor } from '@/components/editors/DateEditor'
import { ImageEditor } from '@/components/editors/ImageEditor'
import { SelectEditor } from '@/components/editors/SelectEditor'
import { FieldsPopover } from '@/components/toolbar/FieldsPopover'
import { FilterPopover } from '@/components/toolbar/FilterPopover'
import { SortPopover } from '@/components/toolbar/SortPopover'
import { GroupSelect } from '@/components/toolbar/GroupSelect'
import { RowHeightSelect } from '@/components/toolbar/RowHeightSelect'
import { applyFilters, applySorts, groupRecords, type RecordGroup } from '@/lib/derive'
import { fieldTypeInfo } from '@/lib/fields'
import * as ops from '@/lib/ops'
import type { ProjectUpdater } from '@/lib/queries'
import { rowHeightInfo, type RowHeightInfo } from '@/lib/rowHeight'
import { cn } from '@/lib/utils'

type TableViewType = Extract<View, { type: 'table' }>

export function TableView({
  project,
  view,
  update,
  onOpenRecord
}: {
  project: Project
  view: TableViewType
  update: ProjectUpdater
  onOpenRecord: (recordId: string) => void
}): React.JSX.Element {
  const config = view.config
  const [fieldDialog, setFieldDialog] = useState<{ field?: Field } | null>(null)
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<Field | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ recordId: string; fieldId: string } | null>(
    null
  )

  const visibleFields = project.fields.filter((f) => !config.hiddenFieldIds.includes(f.id))
  const groupField = project.fields.find((f) => f.id === config.groupByFieldId)

  const derived = applySorts(
    applyFilters(project.records, config.filters, project.fields),
    config.sorts,
    project.fields
  )
  const groups: RecordGroup[] | null = groupField
    ? groupRecords(derived, groupField).filter((g) => g.records.length > 0)
    : null

  const patchConfig = (patch: Partial<TableViewType['config']>): void => {
    update((p) =>
      ops.patchView(p, view.id, (v) =>
        v.type === 'table' ? { ...v, config: { ...v.config, ...patch } } : v
      )
    )
  }

  const groupableFields = project.fields.filter((f) => f.type !== 'image')
  const heightInfo = rowHeightInfo(config.rowHeight)

  let rowNumber = 0

  const renderRows = (records: RecordRow[]): React.JSX.Element[] =>
    records.map((record) => {
      rowNumber += 1
      const number = rowNumber
      return (
        <tr key={record.id} className="group/row border-b transition-colors hover:bg-muted/40">
          <td
            className={cn(
              heightInfo.rowClass,
              'relative w-11 min-w-11 border-b border-r text-center'
            )}
          >
            <span className="text-xs tabular-nums text-muted-foreground group-hover/row:invisible">
              {number}
            </span>
            <button
              className="absolute inset-0 hidden items-center justify-center text-muted-foreground hover:text-foreground group-hover/row:flex"
              onClick={() => onOpenRecord(record.id)}
              title="Expand record"
            >
              <Expand className="size-3.5" />
            </button>
          </td>
          {visibleFields.map((field) => (
            <TableCell
              key={field.id}
              field={field}
              record={record}
              update={update}
              heightInfo={heightInfo}
              selected={
                selectedCell?.recordId === record.id && selectedCell?.fieldId === field.id
              }
              onSelect={() => setSelectedCell({ recordId: record.id, fieldId: field.id })}
            />
          ))}
          <td />
        </tr>
      )
    })

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b px-3">
        <FieldsPopover
          fields={project.fields}
          hiddenFieldIds={config.hiddenFieldIds}
          onChange={(hiddenFieldIds) => patchConfig({ hiddenFieldIds })}
        />
        <FilterPopover
          fields={project.fields}
          filters={config.filters}
          onChange={(filters) => patchConfig({ filters })}
        />
        <SortPopover
          fields={project.fields}
          sorts={config.sorts}
          onChange={(sorts) => patchConfig({ sorts })}
        />
        <GroupSelect
          fields={groupableFields}
          value={config.groupByFieldId}
          onChange={(groupByFieldId) => patchConfig({ groupByFieldId })}
        />
        <RowHeightSelect
          value={config.rowHeight}
          onChange={(rowHeight) => patchConfig({ rowHeight })}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {derived.length === project.records.length
            ? null
            : `${derived.length} of ${project.records.length} records`}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th className="h-8 w-11 min-w-11 border-b border-r" />
              {visibleFields.map((field) => {
                const info = fieldTypeInfo(field.type)
                return (
                  <th
                    key={field.id}
                    className="h-8 w-44 min-w-44 max-w-64 border-b border-r p-0 text-left font-normal"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button className="flex h-full w-full items-center gap-1.5 px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <info.icon className="size-3.5 shrink-0" />
                            <span className="truncate">{field.name}</span>
                            <ChevronDown className="ml-auto size-3 shrink-0 opacity-50" />
                          </button>
                        }
                      />
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setFieldDialog({ field })}>
                          <Pencil />
                          Edit field
                        </DropdownMenuItem>
                        {project.fields.length > 1 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteFieldTarget(field)}
                            >
                              <Trash2 />
                              Delete field
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                )
              })}
              <th className="h-8 w-11 border-b p-0 text-left">
                <button
                  className="flex h-full w-full items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => setFieldDialog({})}
                  title="Add field"
                >
                  <Plus className="size-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups
              ? groups.map((group) => (
                  <GroupSection key={group.key} group={group} colSpan={visibleFields.length + 2}>
                    {renderRows(group.records)}
                  </GroupSection>
                ))
              : renderRows(derived)}
            <tr>
              <td colSpan={visibleFields.length + 2} className="p-0">
                <button
                  className="flex h-9 w-full items-center gap-1.5 px-3 text-[13px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  onClick={() => update((p) => ops.addRecord(p))}
                >
                  <Plus className="size-3.5" />
                  New record
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <FieldDialog
        open={fieldDialog !== null}
        onOpenChange={(open) => !open && setFieldDialog(null)}
        field={fieldDialog?.field}
        onSubmit={(field) =>
          update((p) =>
            fieldDialog?.field ? ops.updateField(p, field.id, field) : ops.addField(p, field)
          )
        }
      />

      <AlertDialog
        open={deleteFieldTarget !== null}
        onOpenChange={(open) => !open && setDeleteFieldTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteFieldTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the field and its values from every record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteFieldTarget) update((p) => ops.deleteField(p, deleteFieldTarget.id))
                setDeleteFieldTarget(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function GroupSection({
  group,
  colSpan,
  children
}: {
  group: RecordGroup
  colSpan: number
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <>
      <tr className="border-b bg-muted/60">
        <td colSpan={colSpan} className="border-b px-3 py-1.5">
          <span className="flex items-center gap-2">
            {group.choice ? (
              <ChoiceBadge choice={group.choice} />
            ) : (
              <span className="text-xs font-medium">{group.label}</span>
            )}
            <span className="text-xs tabular-nums text-muted-foreground">
              {group.records.length}
            </span>
          </span>
        </td>
      </tr>
      {children}
    </>
  )
}

function TableCell({
  field,
  record,
  update,
  heightInfo,
  selected,
  onSelect
}: {
  field: Field
  record: RecordRow
  update: ProjectUpdater
  heightInfo: RowHeightInfo
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const value = record.values[field.id]
  const setValue = (next: unknown): void =>
    update((p) => ops.setRecordValue(p, record.id, field.id, next))

  return (
    <td className={cn(heightInfo.rowClass, 'w-44 min-w-44 max-w-64 border-b border-r p-0')}>
      <CellContent
        field={field}
        value={value}
        onChange={setValue}
        lineClamp={heightInfo.lineClamp}
        selected={selected}
        onSelect={onSelect}
      />
    </td>
  )
}

function CellContent({
  field,
  value,
  onChange,
  lineClamp,
  selected,
  onSelect
}: {
  field: Field
  value: unknown
  onChange: (value: unknown) => void
  lineClamp: number
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const wrap = lineClamp > 1
  const anchorRef = useRef<HTMLButtonElement>(null)

  if (field.type === 'checkbox') {
    return (
      <div className="flex h-full items-center px-2">
        <Checkbox
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      </div>
    )
  }

  // Popover-based editors: anchored to the cell, opened by clicking it.
  if (
    field.type === 'select' ||
    field.type === 'multiSelect' ||
    field.type === 'date' ||
    field.type === 'image'
  ) {
    return (
      <Popover open={editing} onOpenChange={setEditing}>
        <button
          ref={anchorRef}
          className={cn(
            'flex h-full w-full overflow-hidden px-2 text-left',
            wrap ? 'flex-wrap content-start items-start gap-1 py-1.5' : 'items-center',
            selected && !editing && 'ring-2 ring-inset ring-ring'
          )}
          onClick={onSelect}
          onDoubleClick={() => setEditing(true)}
        >
          <ValueDisplay field={field} value={value} lineClamp={lineClamp} />
        </button>
        <PopoverContent
          className={cn(
            'p-0',
            field.type === 'image'
              ? 'w-72 p-3'
              : field.type === 'date'
                ? 'w-64'
                : 'w-52'
          )}
          align="start"
          sideOffset={-4}
          anchor={anchorRef}
        >
          {field.type === 'date' ? (
            <DateEditor value={value} onChange={onChange} onDone={() => setEditing(false)} />
          ) : field.type === 'image' ? (
            <ImageEditor value={value} onChange={onChange} />
          ) : (
            <SelectEditor
              field={field}
              value={value}
              multi={field.type === 'multiSelect'}
              onChange={onChange}
              onDone={() => setEditing(false)}
            />
          )}
        </PopoverContent>
      </Popover>
    )
  }

  // Inline text-style editing for text / number / url.
  if (editing) {
    const commit = (): void => {
      setEditing(false)
      if (field.type === 'number') {
        onChange(draft.trim() === '' ? undefined : Number(draft))
      } else {
        onChange(draft)
      }
    }
    if (field.type === 'text' && wrap) {
      return (
        <textarea
          autoFocus
          className="h-full w-full resize-none bg-background px-2 py-1.5 outline-none ring-1 ring-inset ring-ring"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      )
    }
    return (
      <input
        autoFocus
        type={field.type === 'number' ? 'number' : 'text'}
        className="h-full w-full bg-background px-2 outline-none ring-2 ring-inset ring-ring"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      className={cn(
        'flex h-full w-full overflow-hidden px-2 text-left',
        wrap ? 'items-start py-1.5' : 'items-center',
        selected && 'ring-2 ring-inset ring-ring'
      )}
      onClick={onSelect}
      onDoubleClick={() => {
        setDraft(
          typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
        )
        setEditing(true)
      }}
    >
      <ValueDisplay field={field} value={value} lineClamp={lineClamp} />
    </button>
  )
}
