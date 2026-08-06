import { useState } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, Settings } from 'lucide-react'
import type { ProjectMeta } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useCreateProject, useDeleteProject, useProjects } from '@/lib/queries'
import { isMac } from '@/lib/format'
import { cn } from '@/lib/utils'
import { UpdateButton } from '@/components/UpdateButton'
import { SettingsDialog } from '@/components/SettingsDialog'

export function AppSidebar(): React.JSX.Element {
  const navigate = useNavigate()
  const activeId = useMatch('/project/:id')?.params.id
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleCreate = (): void => {
    createProject.mutate(newName, {
      onSuccess: (project) => {
        setCreateOpen(false)
        setNewName('')
        navigate(`/project/${project.id}`)
      }
    })
  }

  return (
    <Sidebar>
      {/* Empty drag spacer: still reserves room for the macOS traffic lights
          and keeps the top of the sidebar draggable now that the title row
          is gone. */}
      <div className={cn('titlebar-drag shrink-0', isMac ? 'h-10' : 'h-2')} />

      <UpdateButton />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="cursor-default">Projects</SidebarGroupLabel>
          <SidebarGroupAction title="New project" onClick={() => setCreateOpen(true)}>
            <Plus />
            <span className="sr-only">New project</span>
          </SidebarGroupAction>
          <SidebarMenu>
            {isLoading ? null : projects && projects.length > 0 ? (
              projects.map((project) => (
                <ProjectMenuItem key={project.id} project={project} activeId={activeId} />
              ))
            ) : (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No projects yet.</p>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-default" onClick={() => setSettingsOpen(true)}>
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createProject.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}

function ProjectMenuItem({
  project,
  activeId
}: {
  project: ProjectMeta
  activeId: string | undefined
}): React.JSX.Element {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const deleteProject = useDeleteProject()

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(project.name)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleRename = (): void => {
    const name = renameValue.trim()
    setRenameOpen(false)
    if (!name || name === project.name) return
    void window.api.getProject(project.id).then(async (full) => {
      const updated = { ...full, name, updatedAt: new Date().toISOString() }
      await window.api.saveProject(updated)
      queryClient.setQueryData(['project', project.id], updated)
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    })
  }

  const handleDelete = (): void => {
    setDeleteOpen(false)
    deleteProject.mutate(project.id)
    if (project.id === activeId) navigate('/')
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="cursor-default"
          isActive={project.id === activeId}
          render={
            <NavLink to={`/project/${project.id}`}>
              <span className="truncate">{project.name}</span>
            </NavLink>
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuAction showOnHover>
                <MoreHorizontal />
                <span className="sr-only">Project actions</span>
              </SidebarMenuAction>
            }
          />
          <DropdownMenuContent align="start" side="right">
            <DropdownMenuItem
              onClick={() => {
                setRenameValue(project.name)
                setRenameOpen(true)
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the project and all of its {project.recordCount} records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
