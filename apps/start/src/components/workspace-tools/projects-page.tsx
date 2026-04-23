'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { Textarea } from '@bish/ui/textarea'
import { ContentPage } from '@/components/layout'
import { useNavigate } from '@tanstack/react-router'
import {
  createProject,
  createProjectArtifact,
  createProjectCard,
  upsertProjectNote,
} from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { toast } from 'sonner'
import { uploadFileToServer } from '@/lib/frontend/chat/upload'
import { FolderOpen, Mic } from 'lucide-react'
import { useZero, useQuery  } from '@rocicorp/zero/react'
import { mutators, queries } from '@/integrations/zero'
import { useHuddleSession } from '@/components/huddle/huddle-session'
import {
  WorkspaceEmptyState,
  WorkspaceMetricGrid,
  WorkspaceSurfaceCard,
  WorkspaceViewToggle,
  WORKSPACE_TOOL_BUTTON_CLASS_NAME,
} from './workspace-tool-ui'

type ProjectsSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getProjectsSnapshot
  >
>

type ProjectViewMode = 'kanban' | 'list'

export function ProjectsPage({
  initialSnapshot,
}: {
  initialSnapshot: ProjectsSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialSnapshot.projects[0]?.id ?? null,
  )
  const [projectViewMode, setProjectViewMode] = useState<ProjectViewMode>('kanban')
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [noteTitle, setNoteTitle] = useState('Meeting Notes')
  const [noteContent, setNoteContent] = useState('')
  const [cardTitle, setCardTitle] = useState('')
  const [cardDescription, setCardDescription] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const navigate = useNavigate()
  const z = useZero()
  const { setActiveSession } = useHuddleSession()
  const [threadRooms] = useQuery(
    queries.huddle.rooms({
      threadId: undefined,
    }),
  )

  const selectedProject = useMemo(
    () =>
      snapshot.projects.find((project) => project.id === selectedProjectId) ??
      snapshot.projects[0] ??
      null,
    [selectedProjectId, snapshot.projects],
  )

  const selectedProjectListRows = useMemo(() => {
    if (!selectedProject) {
      return []
    }

    // The list view needs a flat backlog regardless of which kanban lane owns a
    // card so operators can scan the full project workload in one table.
    return selectedProject.columns.flatMap((column) =>
      column.cards.map((card) => ({
        ...card,
        columnTitle: column.title,
      })),
    )
  }, [selectedProject])

  const handleCreateProject = async () => {
    try {
      const nextProjects = await createProject({
        data: {
          title: newProjectTitle,
          description: newProjectDescription,
        },
      })
      setSnapshot((current) => ({
        ...current,
        projects: nextProjects,
      }))
      setSelectedProjectId(
        (nextProjects)[0]?.id ?? null,
      )
      setNewProjectTitle('')
      setNewProjectDescription('')
      toast.success('Project created.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project.')
    }
  }

  const handleCreateCard = async (columnId: string) => {
    if (!selectedProject) return
    try {
      const nextProjects = await createProjectCard({
        data: {
          projectId: selectedProject.id,
          columnId,
          title: cardTitle,
          description: cardDescription,
        },
      })
      setSnapshot((current) => ({
        ...current,
        projects: nextProjects,
      }))
      setCardTitle('')
      setCardDescription('')
      toast.success('Kanban card added.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add card.')
    }
  }

  const handleAddNote = async () => {
    if (!selectedProject) return
    try {
      const nextProjects = await upsertProjectNote({
        data: {
          projectId: selectedProject.id,
          title: noteTitle,
          content: noteContent,
        },
      })
      setSnapshot((current) => ({
        ...current,
        projects: nextProjects,
      }))
      setNoteContent('')
      toast.success('Project note saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save note.')
    }
  }

  const handleAddLink = async () => {
    if (!selectedProject) return
    try {
      const nextProjects = await createProjectArtifact({
        data: {
          projectId: selectedProject.id,
          kind: 'link',
          label: linkLabel,
          url: linkUrl,
        },
      })
      setSnapshot((current) => ({
        ...current,
        projects: nextProjects,
      }))
      setLinkLabel('')
      setLinkUrl('')
      toast.success('Project link added.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add link.')
    }
  }

  const handleUploadFile = async (file: File) => {
    if (!selectedProject) return
    try {
      const uploaded = await uploadFileToServer(file)
      const nextProjects = await createProjectArtifact({
        data: {
          projectId: selectedProject.id,
          kind: 'file',
          label: uploaded.name,
          url: uploaded.url,
          storageKey: uploaded.key,
          contentType: uploaded.contentType,
        },
      })
      setSnapshot((current) => ({
        ...current,
        projects: nextProjects,
      }))
      toast.success('Project file uploaded.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file.')
    }
  }

  const handleOpenProjectHuddle = () => {
    if (!selectedProject) {
      return
    }

    void (async () => {
      try {
        const existingRoom =
          Array.isArray(threadRooms) &&
          threadRooms.find(
            (room) =>
              room.roomType === 'named' &&
              room.name === `${selectedProject.title} Huddle`,
          )
        if (existingRoom) {
          await z.mutate(mutators.huddle.joinRoom({ roomId: existingRoom.roomId }))
            .client
          setActiveSession({
            roomId: existingRoom.roomId,
            roomName: existingRoom.name,
          })
        } else {
          const created = await z.mutate(
            mutators.huddle.createRoom({
              name: `${selectedProject.title} Huddle`,
              roomType: 'named',
            }),
          ).client
          if (created?.roomId) {
            setActiveSession({
              roomId: created.roomId,
              roomName: `${selectedProject.title} Huddle`,
            })
          }
        }
        await navigate({ to: '/huddle' })
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to open project huddle.',
        )
      }
    })()
  }

  return (
    <ContentPage
      title="Projects"
      description="Private-by-default collaboration boards with kanban lanes, list views, notes, artifacts, and project huddles."
    >
      <WorkspaceMetricGrid
        metrics={[
          {
            label: 'Projects',
            value: snapshot.projects.length,
            hint: 'Private workspaces currently visible to this member.',
          },
          {
            label: 'Cards',
            value: snapshot.projects.reduce(
              (count, project) =>
                count +
                project.columns.reduce(
                  (columnCount, column) => columnCount + column.cards.length,
                  0,
                ),
              0,
            ),
            hint: 'Kanban workload spread across backlog, active, and delivery lanes.',
          },
          {
            label: 'Artifacts',
            value: snapshot.projects.reduce(
              (count, project) => count + project.artifactCount,
              0,
            ),
            hint: 'Links and uploaded files attached to project workspaces.',
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <WorkspaceSurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
                Projects
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground-primary">
                Team boards
              </h2>
              <p className="mt-2 text-sm text-foreground-secondary">
                Open a project to switch between kanban and list workflows without leaving the dashboard shell.
              </p>
            </div>
            <FormDialog
              trigger={
                <Button
                  size="default"
                  className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                >
                  New Project
                </Button>
              }
              title="Create project"
              description="Projects are private by default and inherit collaboration through explicit members."
              buttonText="Create"
              handleSubmit={handleCreateProject}
            >
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Project title</Label>
                  <Input
                    value={newProjectTitle}
                    onChange={(event) => setNewProjectTitle(event.target.value)}
                    placeholder="Q2 Client Launch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newProjectDescription}
                    onChange={(event) => setNewProjectDescription(event.target.value)}
                    placeholder="What this workspace needs to ship."
                  />
                </div>
              </div>
            </FormDialog>
          </div>
          <div className="mt-5 space-y-3">
            {snapshot.projects.map((project) => {
              const isActive = selectedProject?.id === project.id
              const cardCount = project.columns.reduce(
                (count, column) => count + column.cards.length,
                0,
              )
              return (
                <div
                  key={project.id}
                  className={isActive
                    ? 'rounded-2xl border border-border-strong bg-surface-overlay p-4'
                    : 'rounded-2xl border border-border-base bg-surface-base p-4'}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground-primary">
                        {project.title}
                      </p>
                      <p className="mt-2 text-sm text-foreground-secondary">
                        {project.members.length} member
                        {project.members.length === 1 ? '' : 's'} · {cardCount} cards
                      </p>
                    </div>
                    <Badge variant="outline" className="border-border-base">
                      {project.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="default"
                      className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <FolderOpen className="mr-2 size-4" />
                      Open Project
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </WorkspaceSurfaceCard>

        {selectedProject ? (
          <div className="space-y-6">
            <WorkspaceSurfaceCard>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
                    Active workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground-primary">
                    {selectedProject.title}
                  </h2>
                  <p className="mt-2 text-sm text-foreground-secondary">
                    {selectedProject.description || 'No project brief yet.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <WorkspaceViewToggle
                    value={projectViewMode}
                    onChange={setProjectViewMode}
                    options={[
                      { value: 'kanban', label: 'Kanban View' },
                      { value: 'list', label: 'List View' },
                    ]}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                    onClick={handleOpenProjectHuddle}
                  >
                    <Mic className="mr-2 size-4" />
                    Project Huddle
                  </Button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-border-base">
                  {selectedProject.members.length} members
                </Badge>
                <Badge variant="outline" className="border-border-base">
                  {selectedProject.noteCount} notes
                </Badge>
                <Badge variant="outline" className="border-border-base">
                  {selectedProject.artifactCount} artifacts
                </Badge>
                {selectedProject.activeHuddleRoomId ? (
                  <Badge variant="outline" className="border-border-base">
                    Huddle linked
                  </Badge>
                ) : null}
              </div>
            </WorkspaceSurfaceCard>

            {projectViewMode === 'kanban' ? (
              <div className="grid gap-4 xl:grid-cols-3">
                {selectedProject.columns.map((column) => (
                  <WorkspaceSurfaceCard key={column.id}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-foreground-primary">
                        {column.title}
                      </h3>
                      <Badge variant="outline" className="border-border-base">
                        {column.cards.length}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {column.cards.map((card) => (
                        <div
                          key={card.id}
                          className="rounded-2xl border border-border-base bg-surface-overlay px-4 py-4"
                        >
                          <p className="font-medium text-foreground-primary">
                            {card.title}
                          </p>
                          {card.description ? (
                            <p className="mt-1 text-sm text-foreground-secondary">
                              {card.description}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {column.position === 0 ? (
                      <div className="mt-4 space-y-2">
                        <Input
                          value={cardTitle}
                          onChange={(event) => setCardTitle(event.target.value)}
                          placeholder="New backlog card"
                        />
                        <Textarea
                          value={cardDescription}
                          onChange={(event) => setCardDescription(event.target.value)}
                          placeholder="Optional card description"
                        />
                        <Button
                          type="button"
                          size="default"
                          className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                          onClick={() => handleCreateCard(column.id)}
                        >
                          Add Card
                        </Button>
                      </div>
                    ) : null}
                  </WorkspaceSurfaceCard>
                ))}
              </div>
            ) : selectedProjectListRows.length > 0 ? (
              <WorkspaceSurfaceCard>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground-primary">
                      Project list view
                    </h3>
                    <p className="mt-1 text-sm text-foreground-secondary">
                      Scan project cards in one list with lane context, descriptions, and assignee state.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border-base">
                    {selectedProjectListRows.length} cards
                  </Badge>
                </div>
                <div className="mt-5 overflow-hidden rounded-2xl border border-border-base">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_180px_140px] gap-0 bg-surface-overlay px-4 py-3 text-xs uppercase tracking-[0.18em] text-foreground-secondary">
                    <p>Work Item</p>
                    <p>Lane</p>
                    <p>Assignment</p>
                  </div>
                  {selectedProjectListRows.map((card) => (
                    <div
                      key={card.id}
                      className="grid grid-cols-[minmax(0,1.4fr)_180px_140px] gap-0 border-t border-border-base bg-surface-base px-4 py-4"
                    >
                      <div>
                        <p className="font-medium text-foreground-primary">
                          {card.title}
                        </p>
                        {card.description ? (
                          <p className="mt-1 text-sm text-foreground-secondary">
                            {card.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-sm text-foreground-secondary">
                        {card.columnTitle}
                      </div>
                      <div className="text-sm text-foreground-secondary">
                        {card.assigneeUserId ? 'Assigned' : 'Unassigned'}
                      </div>
                    </div>
                  ))}
                </div>
              </WorkspaceSurfaceCard>
            ) : (
              <WorkspaceEmptyState
                title="No project cards yet."
                description="Add the first backlog card to turn this workspace into an active board."
              />
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <WorkspaceSurfaceCard>
                <h3 className="text-lg font-semibold text-foreground-primary">
                  Notes
                </h3>
                <div className="mt-4 space-y-3">
                  {selectedProject.notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-2xl border border-border-base bg-surface-overlay px-4 py-4"
                    >
                      <p className="font-medium text-foreground-primary">{note.title}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground-secondary">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Input
                    value={noteTitle}
                    onChange={(event) => setNoteTitle(event.target.value)}
                    placeholder="Note title"
                  />
                  <Textarea
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    placeholder="Capture project context, blockers, and decisions."
                  />
                  <Button
                    type="button"
                    size="default"
                    className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                    onClick={handleAddNote}
                  >
                    Save Note
                  </Button>
                </div>
              </WorkspaceSurfaceCard>

              <WorkspaceSurfaceCard>
                <h3 className="text-lg font-semibold text-foreground-primary">
                  Links and files
                </h3>
                <div className="mt-4 space-y-3">
                  {selectedProject.artifacts.map((artifact) => (
                    <a
                      key={artifact.id}
                      href={artifact.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-border-base bg-surface-overlay px-4 py-4"
                    >
                      <p className="font-medium text-foreground-primary">{artifact.label}</p>
                      <p className="mt-1 text-sm text-foreground-secondary">
                        {artifact.kind}
                      </p>
                    </a>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Input
                    value={linkLabel}
                    onChange={(event) => setLinkLabel(event.target.value)}
                    placeholder="Link label"
                  />
                  <Input
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://..."
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="default"
                      className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                      onClick={handleAddLink}
                    >
                      Add Link
                    </Button>
                    <Label className="inline-flex h-10 cursor-pointer items-center rounded-full border border-border-base px-4 text-sm font-medium text-foreground-primary">
                      Upload File
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            void handleUploadFile(file)
                          }
                          event.currentTarget.value = ''
                        }}
                      />
                    </Label>
                  </div>
                </div>
              </WorkspaceSurfaceCard>
            </div>
          </div>
        ) : (
          <WorkspaceEmptyState
            title="No projects yet."
            description="Create the first project to open a private workspace with kanban, list view, huddles, notes, and artifacts."
          />
        )}
      </div>
    </ContentPage>
  )
}
