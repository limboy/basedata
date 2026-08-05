import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ProjectMeta } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { useQueryClient } from '@tanstack/react-query'
import { useCreateProject, useDeleteProject, useProjects } from '@/lib/queries'
import { isMac, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function ProjectListPage(): React.JSX.Element {
  const navigate = useNavigate()
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
    <div className="flex h-full flex-col">
      <header
        className={cn(
          'titlebar-drag flex h-12 shrink-0 items-center gap-2 border-b px-5',
          isMac && 'pl-20'
        )}
      >
        <Database className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold tracking-tight">BaseData</span>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-8 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Each project is its own table with views.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-slot="icon" />
              New project
            </Button>
          </div>

          {isLoading ? null : projects && projects.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
              <Database className="mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No projects yet</p>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                Create your first project to get started.
              </p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus data-slot="icon" />
                New project
              </Button>
            </div>
          )}
        </div>
      </main>

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
    </div>
  )
}

function ProjectCard({ project }: { project: ProjectMeta }): React.JSX.Element {
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

  return (
    <>
      <Card
        className="group cursor-pointer gap-0 p-4 transition-colors hover:bg-accent/50"
        onClick={() => navigate(`/project/${project.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex size-9 items-center justify-center rounded-md border bg-muted/50 text-sm font-semibold uppercase text-muted-foreground">
            {project.name.charAt(0) || '?'}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onSelect={() => {
                  setRenameValue(project.name)
                  setRenameOpen(true)
                }}
              >
                <Pencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3">
          <div className="truncate text-sm font-medium">{project.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {project.recordCount} record{project.recordCount === 1 ? '' : 's'} · updated{' '}
            {timeAgo(project.updatedAt)}
          </div>
        </div>
      </Card>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
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
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
              onClick={() => deleteProject.mutate(project.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
