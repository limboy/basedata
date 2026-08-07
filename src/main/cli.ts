import { app, dialog } from 'electron'
import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Conventional location for user-installed CLIs on macOS; already on PATH
// for every standard shell config.
const CLI_TARGET = '/usr/local/bin/crow'

/** Path to the bundled cli/crow.mjs, copied in as an extraResource (see electron-builder.yml). */
function bundledCliScript(): string {
  return join(process.resourcesPath, 'cli', 'crow.mjs')
}

/**
 * The wrapper installed at /usr/local/bin/crow. It runs the bundled script
 * through Crow's own Electron binary in ELECTRON_RUN_AS_NODE mode, so the
 * CLI works even on machines with no separate Node.js install.
 */
function wrapperScript(): string {
  return `#!/bin/sh
# Installed by Crow.app — do not edit by hand, "Install 'crow' Command in
# PATH" regenerates this file. Uninstall with: rm ${CLI_TARGET}
exec env ELECTRON_RUN_AS_NODE=1 "${process.execPath}" "${bundledCliScript()}" "$@"
`
}

function shQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function asQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Writes the wrapper via a one-time admin prompt, for when /usr/local/bin isn't user-writable. */
async function writeWrapperElevated(script: string): Promise<void> {
  const tmp = join(app.getPath('temp'), 'crow-cli-wrapper')
  await fs.writeFile(tmp, script, { mode: 0o755 })
  try {
    const shellCmd = `mkdir -p /usr/local/bin && cp ${shQuote(tmp)} ${shQuote(CLI_TARGET)} && chmod 755 ${shQuote(CLI_TARGET)}`
    const appleScript = `do shell script ${asQuote(shellCmd)} with administrator privileges`
    await execFileAsync('osascript', ['-e', appleScript])
  } finally {
    await fs.rm(tmp, { force: true })
  }
}

async function writeWrapper(script: string): Promise<void> {
  try {
    await fs.mkdir(dirname(CLI_TARGET), { recursive: true })
    await fs.writeFile(CLI_TARGET, script, { mode: 0o755 })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'EACCES' && code !== 'EPERM') throw err
    await writeWrapperElevated(script)
  }
}

/** Installs a `crow` command on PATH that runs the bundled CLI. Shows the result in a dialog. */
export async function installCli(): Promise<void> {
  if (process.platform !== 'darwin') {
    dialog.showErrorBox(
      'Not supported yet',
      "Installing the crow CLI command in PATH is currently only supported on macOS."
    )
    return
  }
  if (!app.isPackaged) {
    dialog.showErrorBox('Not available in development', 'Build and run the packaged app to install the crow CLI command.')
    return
  }

  try {
    await writeWrapper(wrapperScript())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // osascript's own message when the user cancels the admin prompt.
    if (message.includes('User canceled')) return
    dialog.showErrorBox('Failed to install crow CLI', message)
    return
  }

  await dialog.showMessageBox({
    type: 'info',
    message: `Installed 'crow' to ${CLI_TARGET}`,
    detail: 'Open a new terminal and run `crow help` to get started.'
  })
}
