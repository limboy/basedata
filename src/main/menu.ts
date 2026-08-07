import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import { installCli } from './cli'

/**
 * macOS app menu: Electron's own default template (see its docs) plus one
 * item — "Install 'crow' Command in PATH" — for the bundled CLI (cli.ts).
 * Only called on darwin; other platforms keep Electron's built-in default.
 */
export function buildAppMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: "Install 'crow' Command in PATH",
          click: () => {
            void installCli()
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]
  return Menu.buildFromTemplate(template)
}
