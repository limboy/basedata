import { useState } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Database, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
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
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useCreateProject, useDeleteProject, useProjects } from '@/lib/queries'
import { isMac } from '@/lib/format'
import { cn } from '@/lib/utils'

export function AppSidebar(): React.JSX.Element {
  const navigate = useNavigate()
  const activeId = useMatch('/project/:id')?.params.id
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')

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
      <SidebarHeader
        className={cn('titlebar-drag gap-0 px-3 pb-1', isMac ? 'pt-10' : 'pt-2')}
      >
        <button
          className="no-drag flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
          onClick={() => navigate('/')}
        >
          <Database className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold tracking-tight">BaseData</span>
        </button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
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
          isActive={project.id === activeId}
          render={
            <NavLink to={`/project/${project.id}`}>
              <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                {project.name.charAt(0) || '?'}
              </span>
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
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
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
