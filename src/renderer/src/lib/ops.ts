import { newRecord, newView } from '@shared/defaults'
import type { Field, Project, RecordRow, View, ViewType } from '@shared/types'

/** Pure Project -> Project transforms, applied through useUpdateProject. */

export function patchView(project: Project, viewId: string, fn: (view: View) => View): Project {
  return { ...project, views: project.views.map((v) => (v.id === viewId ? fn(v) : v)) }
}

export function addView(project: Project, type: ViewType): Project {
  const count = project.views.filter((v) => v.type === type).length
  const view = newView(type)
  if (count > 0) view.name = `${view.name} ${count + 1}`
  return { ...project, views: [...project.views, view] }
}

export function renameView(project: Project, viewId: string, name: string): Project {
  return patchView(project, viewId, (v) => ({ ...v, name }))
}

export function deleteView(project: Project, viewId: string): Project {
  if (project.views.length <= 1) return project
  return { ...project, views: project.views.filter((v) => v.id !== viewId) }
}

export function addRecord(project: Project, values: Record<string, unknown> = {}): Project {
  return { ...project, records: [...project.records, newRecord(values)] }
}

export function setRecordValue(
  project: Project,
  recordId: string,
  fieldId: string,
  value: unknown
): Project {
  return {
    ...project,
    records: project.records.map((r) =>
      r.id === recordId ? { ...r, values: { ...r.values, [fieldId]: value } } : r
    )
  }
}

export function deleteRecord(project: Project, recordId: string): Project {
  return { ...project, records: project.records.filter((r) => r.id !== recordId) }
}

export function addField(project: Project, field: Field): Project {
  return { ...project, fields: [...project.fields, field] }
}

export function updateField(project: Project, fieldId: string, patch: Partial<Field>): Project {
  return {
    ...project,
    fields: project.fields.map((f) => (f.id === fieldId ? { ...f, ...patch, id: f.id } : f))
  }
}

/** Removes the field plus every reference to it in records and view configs. */
export function deleteField(project: Project, fieldId: string): Project {
  const stripValues = (r: RecordRow): RecordRow => {
    if (!(fieldId in r.values)) return r
    const { [fieldId]: _removed, ...rest } = r.values
    return { ...r, values: rest }
  }
  const views = project.views.map((view): View => {
    const hiddenFieldIds = view.config.hiddenFieldIds.filter((id) => id !== fieldId)
    switch (view.type) {
      case 'table':
        return {
          ...view,
          config: {
            ...view.config,
            hiddenFieldIds,
            filters: view.config.filters.filter((f) => f.fieldId !== fieldId),
            sorts: view.config.sorts.filter((s) => s.fieldId !== fieldId),
            groupByFieldId:
              view.config.groupByFieldId === fieldId ? undefined : view.config.groupByFieldId
          }
        }
      case 'kanban':
        return {
          ...view,
          config: {
            ...view.config,
            hiddenFieldIds,
            groupByFieldId:
              view.config.groupByFieldId === fieldId ? undefined : view.config.groupByFieldId
          }
        }
      case 'gallery':
        return {
          ...view,
          config: {
            ...view.config,
            hiddenFieldIds,
            coverFieldId: view.config.coverFieldId === fieldId ? undefined : view.config.coverFieldId
          }
        }
    }
  })
  return {
    ...project,
    fields: project.fields.filter((f) => f.id !== fieldId),
    records: project.records.map(stripValues),
    views
  }
}
