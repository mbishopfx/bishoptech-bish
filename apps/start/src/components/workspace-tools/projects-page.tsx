'use client'

import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { Textarea } from '@bish/ui/textarea'
import { ContentPage } from '@/components/layout'
import {
  createProject,
  createProjectArtifact,
  createProjectCard,
  upsertProjectNote,
} from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { toast } from 'sonner'
import { uploadFileToServer } from '@/lib/frontend/chat/upload'
import { Mic } from 'lucide-react'
import { useZero } from '@rocicorp/zero/react'
import { mutators, queries } from '@/integrations/zero'
import { useQuery } from '@rocicorp/zero/react'
import { useHuddleSession } from '@/components/huddle/huddle-session'

type ProjectsSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getProjectsSnapshot
  >
>

export function ProjectsPage({
  initialSnapshot,
}: {
  initialSnapshot: ProjectsSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialSnapshot.projects[0]?.id ?? null,
  )
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

  const handleCreateProject = async () => {
    try {
      const nextProjects = await createProject({
        data: {
          title: newProjectTitle,
          description: newProjectDescription,
        },
      })
      setSnapshot((current) => ({ ...current, projects: nextProjects as ProjectsSnapshot['projects'] }))
      setSelectedProjectId((nextProjects as ProjectsSnapshot['projects'])[0]?.id ?? null)
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
      setSnapshot((current) => ({ ...current, projects: nextProjects as ProjectsSnapshot['projects'] }))
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
      setSnapshot((current) => ({ ...current, projects: nextProjects as ProjectsSnapshot['projects'] }))
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
      setSnapshot((current) => ({ ...current, projects: nextProjects as ProjectsSnapshot['projects'] }))
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
      setSnapshot((current) => ({ ...current, projects: nextProjects as ProjectsSnapshot['projects'] }))
      toast.success('Project file uploaded.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file.')
    }
  }

  return (
    <ContentPage
      title="Projects"
      description="Private-by-default collaboration boards with kanban columns, notes, artifacts, and project huddles."
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
          <div className="rounded-[22px] bg-surface-base px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
                  Projects
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground-primary">
                  Team boards
                </h2>
              </div>
              <FormDialog
                trigger={<Button size="sm">New Project</Button>}
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
          </div>
          <div className="mt-4 space-y-3">
            {snapshot.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left ${
                  selectedProject?.id === project.id
                    ? 'border-border-strong bg-surface-overlay'
                    : 'border-border-base bg-surface-base'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground-primary">{project.title}</p>
                  <Badge variant="outline" className="border-border-base">
                    {project.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-foreground-secondary">
                  {project.members.length} member{project.members.length === 1 ? '' : 's'} · {project.noteCount} notes · {project.artifactCount} artifacts
                </p>
              </button>
            ))}
          </div>
        </div>

        {selectedProject ? (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
              <div className="rounded-[22px] bg-surface-base px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground-primary">
                      {selectedProject.title}
                    </h2>
                    <p className="mt-1 text-sm text-foreground-secondary">
                      {selectedProject.description || 'No project brief yet.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
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
                            await z.mutate(
                              mutators.huddle.joinRoom({ roomId: existingRoom.roomId }),
                            ).client
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
                    }}
                  >
                    <Mic className="mr-2 size-4" />
                    Project Huddle
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {selectedProject.columns.map((column) => (
                <div
                  key={column.id}
                  className="rounded-[28px] border border-border-base bg-surface-strong p-3"
                >
                  <div className="rounded-[22px] bg-surface-base px-4 py-4">
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
                          className="rounded-2xl border border-border-base bg-surface-overlay px-3 py-3"
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
                        <Button type="button" size="sm" onClick={() => handleCreateCard(column.id)}>
                          Add Card
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
                <div className="rounded-[22px] bg-surface-base px-5 py-5">
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
                    <Button type="button" size="sm" onClick={handleAddNote}>
                      Save Note
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
                <div className="rounded-[22px] bg-surface-base px-5 py-5">
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
                      <Button type="button" size="sm" onClick={handleAddLink}>
                        Add Link
                      </Button>
                      <Label className="inline-flex cursor-pointer items-center rounded-full border border-border-base px-3 py-2 text-sm text-foreground-primary">
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
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border-base bg-surface-strong p-10 text-sm text-foreground-secondary">
            Create the first project to start a private kanban workspace with huddles, notes, and artifacts.
          </div>
        )}
      </div>
    </ContentPage>
  )
}
