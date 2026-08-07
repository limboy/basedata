#!/usr/bin/env node
/**
 * basedata CLI — lets scripts and AI agents read and write Basedata projects.
 *
 * It operates directly on the same JSON files the desktop app uses
 * (userData/projects/<project-id>/data.json, with that project's images/audio
 * alongside it). The app watches the projects directory, so changes made here
 * show up live in an open window. All output is JSON on stdout; errors are
 * JSON on stderr with a non-zero exit code. Run `basedata help` for the full
 * command reference.
 */
import { promises as fs, existsSync, readFileSync } from 'fs'
import { join, extname } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'

const SAFE_ID = /^[a-zA-Z0-9-]+$/

const FIELD_TYPES = ['text', 'number', 'select', 'multiSelect', 'date', 'checkbox', 'url', 'image', 'audio']

const CHOICE_COLORS = ['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink']

const uuid = () => randomUUID()
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Data directory (must match Electron's app.getPath('userData') for "basedata")
// ---------------------------------------------------------------------------

// Electron's userData path — fixed regardless of where the user points the
// app's data at. This is also where the app's config.json (which records
// that choice) always lives, so it doubles as the anchor for finding it.
function platformDefaultDir() {
  const home = homedir()
  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'basedata')
    case 'win32':
      return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'basedata')
    default:
      return join(process.env.XDG_CONFIG_HOME ?? join(home, '.config'), 'basedata')
  }
}

// Mirrors src/main/config.ts: the app lets the user relocate its data
// directory (e.g. into Dropbox), recording the choice in a config.json that
// always lives at the platform-default path. Follow the same rule here so
// the CLI reads/writes wherever the app actually is right now.
function configuredDataDir() {
  try {
    const config = JSON.parse(readFileSync(join(platformDefaultDir(), 'config.json'), 'utf-8'))
    if (config.dataDir && existsSync(config.dataDir)) return config.dataDir
  } catch {
    // no config.json, or it's unreadable/malformed — fall through to default
  }
  return null
}

function dataDir() {
  if (process.env.BASEDATA_DIR) return process.env.BASEDATA_DIR
  return configuredDataDir() ?? platformDefaultDir()
}

const projectsRootDir = () => join(dataDir(), 'projects')
const projectDir = (id) => join(projectsRootDir(), id)
const projectFile = (id) => join(projectDir(id), 'data.json')
const imagesDir = (id) => join(projectDir(id), 'images')
const audioDir = (id) => join(projectDir(id), 'audio')

// ---------------------------------------------------------------------------
// Storage (same format + atomic write strategy as the app)
// ---------------------------------------------------------------------------

async function listProjectIds() {
  let entries
  try {
    entries = await fs.readdir(projectsRootDir(), { withFileTypes: true })
  } catch {
    return []
  }
  return entries.filter((e) => e.isDirectory() && SAFE_ID.test(e.name)).map((e) => e.name)
}

async function readAllProjects() {
  const ids = await listProjectIds()
  const projects = []
  for (const id of ids) {
    try {
      projects.push(JSON.parse(await fs.readFile(projectFile(id), 'utf-8')))
    } catch {
      // skip unreadable files rather than failing the whole list
    }
  }
  return projects
}

async function saveProject(project) {
  await fs.mkdir(projectDir(project.id), { recursive: true })
  const target = projectFile(project.id)
  const tmp = `${target}.tmp`
  await fs.writeFile(tmp, JSON.stringify(project, null, 2), 'utf-8')
  await fs.rename(tmp, target)
}

async function mutateProject(ref, fn) {
  const project = await resolveProject(ref)
  const result = fn(project)
  project.updatedAt = now()
  await saveProject(project)
  return result
}

async function resolveProject(ref) {
  const projects = await readAllProjects()
  if (projects.length === 0) fail(`No projects found in ${dataDir()}`)
  const byId = projects.find((p) => p.id === ref)
  if (byId) return byId
  const byName = projects.filter((p) => p.name.toLowerCase() === ref.toLowerCase())
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) fail(`Project name "${ref}" is ambiguous; use an id: ${byName.map((p) => p.id).join(', ')}`)
  const byPrefix = projects.filter((p) => p.id.startsWith(ref))
  if (byPrefix.length === 1) return byPrefix[0]
  fail(`No project matches "${ref}". Available: ${projects.map((p) => `${p.name} (${p.id})`).join(', ')}`)
}

function resolveRecord(project, ref) {
  const exact = project.records.find((r) => r.id === ref)
  if (exact) return exact
  const byPrefix = project.records.filter((r) => r.id.startsWith(ref))
  if (byPrefix.length === 1) return byPrefix[0]
  if (byPrefix.length > 1) fail(`Record id prefix "${ref}" is ambiguous (${byPrefix.length} matches)`)
  fail(`No record with id "${ref}" in project "${project.name}"`)
}

function resolveField(project, name) {
  const matches = project.fields.filter((f) => f.name.toLowerCase() === String(name).toLowerCase())
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) fail(`Field name "${name}" is ambiguous in project "${project.name}"`)
  fail(`No field named "${name}" in project "${project.name}". Fields: ${project.fields.map((f) => f.name).join(', ')}`)
}

// ---------------------------------------------------------------------------
// Value conversion: field-name-keyed human values <-> field-id-keyed stored values
// ---------------------------------------------------------------------------

function choiceName(field, id) {
  return field.options?.choices.find((c) => c.id === id)?.name
}

/** Finds a choice by name, creating it (with the next cycle color) if missing. */
function choiceIdFor(field, name) {
  const choices = (field.options ??= { choices: [] }).choices
  const existing = choices.find((c) => c.name.toLowerCase() === String(name).toLowerCase())
  if (existing) return existing.id
  const choice = { id: uuid(), name: String(name), color: CHOICE_COLORS[choices.length % CHOICE_COLORS.length] }
  choices.push(choice)
  return choice.id
}

async function coerceValue(field, value, projectId) {
  if (value === null) return null
  switch (field.type) {
    case 'text':
    case 'url':
      return String(value)
    case 'number': {
      const num = Number(value)
      if (typeof value === 'boolean' || value === '' || Number.isNaN(num)) {
        fail(`Field "${field.name}" expects a number, got ${JSON.stringify(value)}`)
      }
      return num
    }
    case 'checkbox': {
      if (typeof value === 'boolean') return value
      if (value === 'true' || value === 1 || value === '1') return true
      if (value === 'false' || value === 0 || value === '0') return false
      fail(`Field "${field.name}" expects true or false, got ${JSON.stringify(value)}`)
      break
    }
    case 'date': {
      const str = String(value)
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
      const date = new Date(str)
      if (Number.isNaN(date.getTime())) {
        fail(`Field "${field.name}" expects a date (YYYY-MM-DD), got ${JSON.stringify(value)}`)
      }
      const pad = (n) => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }
    case 'select':
      return choiceIdFor(field, value)
    case 'multiSelect': {
      const names = Array.isArray(value) ? value : [value]
      return names.map((n) => choiceIdFor(field, n))
    }
    case 'image': {
      const str = String(value)
      if (str.startsWith('app-image://')) return str
      if (!existsSync(str)) {
        fail(`Field "${field.name}" expects a local image file path or app-image:// URL, got ${JSON.stringify(value)}`)
      }
      await fs.mkdir(imagesDir(projectId), { recursive: true })
      const name = `${uuid()}${extname(str).toLowerCase() || '.png'}`
      await fs.copyFile(str, join(imagesDir(projectId), name))
      return `app-image:///${projectId}/${name}`
    }
    case 'audio': {
      const str = String(value)
      if (str.startsWith('app-audio://')) return str
      if (!existsSync(str)) {
        fail(`Field "${field.name}" expects a local audio file path or app-audio:// URL, got ${JSON.stringify(value)}`)
      }
      await fs.mkdir(audioDir(projectId), { recursive: true })
      const name = `${uuid()}${extname(str).toLowerCase() || '.mp3'}`
      await fs.copyFile(str, join(audioDir(projectId), name))
      return `app-audio:///${projectId}/${name}`
    }
  }
  return value
}

/** Applies field-name-keyed input values onto a record's field-id-keyed store. */
async function applyValues(project, record, input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail('Values must be a JSON object keyed by field name, e.g. {"Name": "Buy milk", "Status": "Todo"}')
  }
  for (const [name, value] of Object.entries(input)) {
    const field = resolveField(project, name)
    if (value === null) {
      delete record.values[field.id]
    } else {
      record.values[field.id] = await coerceValue(field, value, project.id)
    }
  }
}

/** Stored record -> agent-friendly shape (values keyed by field name, choices by name). */
function humanize(project, record) {
  const values = {}
  for (const field of project.fields) {
    const raw = record.values[field.id]
    if (raw === undefined || raw === null) continue
    if (field.type === 'select') {
      const name = choiceName(field, raw)
      if (name !== undefined) values[field.name] = name
    } else if (field.type === 'multiSelect') {
      const names = (Array.isArray(raw) ? raw : []).map((id) => choiceName(field, id)).filter((n) => n !== undefined)
      if (names.length > 0) values[field.name] = names
    } else {
      values[field.name] = raw
    }
  }
  return { id: record.id, createdAt: record.createdAt, values }
}

function matchesWhere(humanized, where) {
  return Object.entries(where).every(([name, expected]) => {
    const actual = humanized.values[name]
    if (expected === null) return actual === undefined
    if (Array.isArray(actual)) return actual.includes(expected)
    return actual === expected
  })
}

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------

function buildField(name, type, choiceNames = []) {
  if (!FIELD_TYPES.includes(type)) {
    fail(`Unknown field type "${type}". Valid types: ${FIELD_TYPES.join(', ')}`)
  }
  const field = { id: uuid(), name, type }
  if (type === 'select' || type === 'multiSelect') {
    field.options = {
      choices: choiceNames.map((n, i) => ({ id: uuid(), name: n, color: CHOICE_COLORS[i % CHOICE_COLORS.length] }))
    }
  }
  return field
}

function assertFieldNameFree(project, name) {
  if (project.fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
    fail(`Project "${project.name}" already has a field named "${name}"`)
  }
}

/** Removes the field plus every reference to it in records and view configs. */
function deleteFieldEverywhere(project, fieldId) {
  project.fields = project.fields.filter((f) => f.id !== fieldId)
  for (const record of project.records) delete record.values[fieldId]
  for (const view of project.views) {
    const config = view.config
    config.hiddenFieldIds = (config.hiddenFieldIds ?? []).filter((id) => id !== fieldId)
    if (config.filters) config.filters = config.filters.filter((f) => f.fieldId !== fieldId)
    if (config.sorts) config.sorts = config.sorts.filter((s) => s.fieldId !== fieldId)
    if (config.groupByFieldId === fieldId) config.groupByFieldId = undefined
    if (config.coverFieldId === fieldId) config.coverFieldId = undefined
  }
}

function schemaOf(project) {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    recordCount: project.records.length,
    fields: project.fields.map((f) => ({
      name: f.name,
      type: f.type,
      ...(f.options ? { choices: f.options.choices.map((c) => c.name) } : {})
    })),
    views: project.views.map((v) => ({ name: v.name, type: v.type }))
  }
}

// ---------------------------------------------------------------------------
// CLI plumbing
// ---------------------------------------------------------------------------

function fail(message) {
  process.stderr.write(JSON.stringify({ error: message }) + '\n')
  process.exit(1)
}

function output(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n')
}

function parseArgs(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    } else {
      positional.push(arg)
    }
  }
  return { positional, flags }
}

function parseJsonArg(raw, what) {
  try {
    return JSON.parse(raw)
  } catch {
    fail(`${what} must be valid JSON, got: ${raw}`)
  }
}

const HELP = `basedata — CLI for the Basedata desktop app, built for scripts and AI agents.

Data lives in ${dataDir()} (follows the app's configured data location;
override with BASEDATA_DIR or --data-dir).
Changes appear live in the app if it is open. All output is JSON.
Projects are referenced by name or id; records by id (unique prefixes work).

COMMANDS
  help                                     Show this help
  info                                     Show data directory and project count
  list-projects                            List all projects
  create-project <name> [--fields JSON]    Create a project. --fields is a JSON array like
                                           '[{"name":"Title","type":"text"},
                                             {"name":"Status","type":"select","choices":["Todo","Done"]}]'
                                           Default: a single "Name" text field.
  delete-project <project> --yes           Delete a project permanently (requires --yes)
  schema <project>                         Show fields, choices, views, record count
  add-field <project> <name> <type> [--choices "A,B,C"]
                                           Add a field. Types: ${FIELD_TYPES.join(', ')}
  delete-field <project> <name>            Remove a field and all its values
  list-records <project> [--where JSON] [--limit N] [--offset N]
                                           List records. --where filters by equality on
                                           field-name-keyed values, e.g. '{"Status":"Todo"}'
                                           (multi-select matches if it contains the value,
                                           null matches empty).
  get-record <project> <record-id>         Show one record
  add-record <project> <values-json>       Create record(s). Values are keyed by field name;
                                           pass an array of objects to create several at once.
  update-record <project> <record-id> <values-json>
                                           Merge values into a record (only listed fields change)
  delete-record <project> <record-id>      Delete a record

VALUE FORMATS (per field type, when writing)
  text, url     string
  number        number (or numeric string)
  checkbox      true / false
  date          "YYYY-MM-DD"
  select        choice name as string — unknown names are created automatically
  multiSelect   array of choice names — unknown names are created automatically
  image         path to a local image file (copied into the app's storage),
                or an existing app-image:/// URL
  audio         path to a local audio file (copied into the app's storage),
                or an existing app-audio:/// URL
  null          clears the field (any type)

EXAMPLES
  basedata list-projects
  basedata schema "My Tasks"
  basedata add-record "My Tasks" '{"Name":"Buy milk","Status":"Todo","Due":"2026-08-10"}'
  basedata list-records "My Tasks" --where '{"Status":"Todo"}' --limit 20
  basedata update-record "My Tasks" 3f2a '{"Status":"Done"}'
`

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const commands = {
  async 'list-projects'() {
    const projects = await readAllProjects()
    projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    output({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        recordCount: p.records.length,
        updatedAt: p.updatedAt
      }))
    })
  },

  async info() {
    const projects = await readAllProjects()
    output({
      dataDir: dataDir(),
      projectCount: projects.length
    })
  },

  async 'create-project'({ positional, flags }) {
    const name = positional[0]
    if (!name) fail('Usage: create-project <name> [--fields JSON]')
    let fields
    if (flags.fields) {
      const specs = parseJsonArg(flags.fields, '--fields')
      if (!Array.isArray(specs) || specs.length === 0) fail('--fields must be a non-empty JSON array')
      fields = specs.map((s) => buildField(String(s.name), s.type, s.choices ?? []))
      const names = fields.map((f) => f.name.toLowerCase())
      if (new Set(names).size !== names.length) fail('--fields contains duplicate field names')
    } else {
      fields = [buildField('Name', 'text')]
    }
    const project = {
      id: uuid(),
      name,
      createdAt: now(),
      updatedAt: now(),
      fields,
      records: [],
      views: [{ id: uuid(), name: 'Table', type: 'table', config: { hiddenFieldIds: [], filters: [], sorts: [], rowHeight: 'short' } }]
    }
    await saveProject(project)
    output(schemaOf(project))
  },

  async 'delete-project'({ positional, flags }) {
    const project = await resolveProject(positional[0] ?? fail('Usage: delete-project <project> --yes'))
    if (flags.yes !== true) {
      fail(`Refusing to delete "${project.name}" (${project.records.length} records). Re-run with --yes to confirm.`)
    }
    await fs.rm(projectDir(project.id), { recursive: true, force: true })
    output({ deleted: { id: project.id, name: project.name } })
  },

  async schema({ positional }) {
    const project = await resolveProject(positional[0] ?? fail('Usage: schema <project>'))
    output(schemaOf(project))
  },

  async 'add-field'({ positional, flags }) {
    const [ref, name, type] = positional
    if (!ref || !name || !type) fail('Usage: add-field <project> <name> <type> [--choices "A,B,C"]')
    const choices = typeof flags.choices === 'string' ? flags.choices.split(',').map((c) => c.trim()).filter(Boolean) : []
    const schema = await mutateProject(ref, (project) => {
      assertFieldNameFree(project, name)
      project.fields.push(buildField(name, type, choices))
      return schemaOf(project)
    })
    output(schema)
  },

  async 'delete-field'({ positional }) {
    const [ref, name] = positional
    if (!ref || !name) fail('Usage: delete-field <project> <name>')
    const schema = await mutateProject(ref, (project) => {
      deleteFieldEverywhere(project, resolveField(project, name).id)
      return schemaOf(project)
    })
    output(schema)
  },

  async 'list-records'({ positional, flags }) {
    const project = await resolveProject(positional[0] ?? fail('Usage: list-records <project> [--where JSON] [--limit N] [--offset N]'))
    let records = project.records.map((r) => humanize(project, r))
    if (typeof flags.where === 'string') {
      const where = parseJsonArg(flags.where, '--where')
      for (const name of Object.keys(where)) resolveField(project, name)
      records = records.filter((r) => matchesWhere(r, where))
    }
    const total = records.length
    const offset = flags.offset ? Number(flags.offset) : 0
    const limit = flags.limit ? Number(flags.limit) : Infinity
    records = records.slice(offset, offset + limit)
    output({ project: project.name, total, records })
  },

  async 'get-record'({ positional }) {
    const [ref, recordRef] = positional
    if (!ref || !recordRef) fail('Usage: get-record <project> <record-id>')
    const project = await resolveProject(ref)
    output(humanize(project, resolveRecord(project, recordRef)))
  },

  async 'add-record'({ positional }) {
    const [ref, valuesRaw] = positional
    if (!ref || !valuesRaw) fail('Usage: add-record <project> <values-json>')
    const input = parseJsonArg(valuesRaw, 'Values')
    const inputs = Array.isArray(input) ? input : [input]
    const project = await resolveProject(ref)
    const created = []
    for (const values of inputs) {
      const record = { id: uuid(), createdAt: now(), values: {} }
      await applyValues(project, record, values)
      project.records.push(record)
      created.push(record)
    }
    project.updatedAt = now()
    await saveProject(project)
    output({ created: created.map((r) => humanize(project, r)) })
  },

  async 'update-record'({ positional }) {
    const [ref, recordRef, valuesRaw] = positional
    if (!ref || !recordRef || !valuesRaw) fail('Usage: update-record <project> <record-id> <values-json>')
    const input = parseJsonArg(valuesRaw, 'Values')
    const project = await resolveProject(ref)
    const record = resolveRecord(project, recordRef)
    await applyValues(project, record, input)
    project.updatedAt = now()
    await saveProject(project)
    output(humanize(project, record))
  },

  async 'delete-record'({ positional }) {
    const [ref, recordRef] = positional
    if (!ref || !recordRef) fail('Usage: delete-record <project> <record-id>')
    const project = await resolveProject(ref)
    const record = resolveRecord(project, recordRef)
    project.records = project.records.filter((r) => r.id !== record.id)
    project.updatedAt = now()
    await saveProject(project)
    output({ deleted: humanize(project, record) })
  },

  async help() {
    process.stdout.write(HELP)
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2))
  if (typeof flags['data-dir'] === 'string') process.env.BASEDATA_DIR = flags['data-dir']
  const name = positional.shift()
  if (!name || name === 'help' || flags.help === true) {
    process.stdout.write(HELP)
    return
  }
  const command = commands[name]
  if (!command) fail(`Unknown command "${name}". Run \`basedata help\` for the command list.`)
  await command({ positional, flags })
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
