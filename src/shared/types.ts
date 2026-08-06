export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiSelect'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'image'

export type ChoiceColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'

export interface SelectChoice {
  id: string
  name: string
  color: ChoiceColor
}

export interface Field {
  id: string
  name: string
  type: FieldType
  options?: {
    choices: SelectChoice[]
  }
}

export interface RecordRow {
  id: string
  createdAt: string
  values: Record<string, unknown>
}

export type ViewType = 'table' | 'kanban' | 'gallery'

export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'is'
  | 'isNot'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'lt'

export interface FilterRule {
  id: string
  fieldId: string
  operator: FilterOperator
  value?: unknown
}

export interface SortRule {
  fieldId: string
  direction: 'asc' | 'desc'
}

export type RowHeight = 'short' | 'medium' | 'tall'

export interface TableViewConfig {
  hiddenFieldIds: string[]
  filters: FilterRule[]
  sorts: SortRule[]
  groupByFieldId?: string
  rowHeight?: RowHeight
  /** Column width in pixels per field id; unset falls back to the default width. */
  columnWidths?: Record<string, number>
}

export interface KanbanViewConfig {
  groupByFieldId?: string
  hiddenFieldIds: string[]
}

export interface GalleryViewConfig {
  coverFieldId?: string
  hiddenFieldIds: string[]
}

export type View =
  | { id: string; name: string; type: 'table'; config: TableViewConfig }
  | { id: string; name: string; type: 'kanban'; config: KanbanViewConfig }
  | { id: string; name: string; type: 'gallery'; config: GalleryViewConfig }

export interface Project {
  id: string
  name: string
  icon?: string
  createdAt: string
  updatedAt: string
  fields: Field[]
  records: RecordRow[]
  views: View[]
}

export interface ProjectMeta {
  id: string
  name: string
  icon?: string
  recordCount: number
  createdAt: string
  updatedAt: string
}

export interface Api {
  listProjects: () => Promise<ProjectMeta[]>
  createProject: (name: string) => Promise<Project>
  getProject: (id: string) => Promise<Project>
  saveProject: (project: Project) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  pickImage: () => Promise<string | null>
  /** Fires when project files change on disk outside the app; returns unsubscribe. */
  onProjectsChanged: (callback: () => void) => () => void
  /** Version of an already-downloaded update ready to install, if any. */
  getUpdateStatus: () => Promise<string | null>
  /** Installs a downloaded update and restarts the app. */
  installUpdate: () => Promise<void>
  /** Fires once an update has finished downloading in the background; returns unsubscribe. */
  onUpdateReady: (callback: (version: string) => void) => () => void
  /** Current and default root folders where projects/images are stored. */
  getDataDir: () => Promise<{ current: string; default: string }>
  /** Opens a native folder picker; returns the chosen path, or null if cancelled. */
  pickDataDir: () => Promise<string | null>
  /** Moves existing data to `dir` and stores new projects/images there from now on. */
  setDataDir: (dir: string) => Promise<void>
}
