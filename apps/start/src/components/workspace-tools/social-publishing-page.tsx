'use client'

import { useState } from 'react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { Textarea } from '@bish/ui/textarea'
import { ContentPage } from '@/components/layout'
import { upsertSocialPost } from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { toast } from 'sonner'

type SocialSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getSocialPublishingSnapshot
  >
>

const SOCIAL_CHANNELS = [
  { key: 'social_x', label: 'X' },
  { key: 'social_facebook', label: 'Facebook' },
  { key: 'social_instagram', label: 'Instagram' },
  { key: 'social_tiktok', label: 'TikTok' },
] as const

export function SocialPublishingPage({
  initialSnapshot,
}: {
  initialSnapshot: SocialSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [channels, setChannels] = useState<Array<(typeof SOCIAL_CHANNELS)[number]['key']>>([
    'social_x',
  ])

  const handleSubmit = async () => {
    try {
      const nextPosts = await upsertSocialPost({
        data: {
          title,
          content,
          channels,
          scheduledFor: scheduledFor
            ? new Date(scheduledFor).getTime()
            : undefined,
        },
      })
      setSnapshot((current) => ({ ...current, posts: nextPosts as SocialSnapshot['posts'] }))
      setTitle('')
      setContent('')
      setScheduledFor('')
      setChannels(['social_x'])
      toast.success('Social post saved to the scheduler.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save post.')
    }
  }

  return (
    <ContentPage
      title="Social Publishing"
      description="Draft and schedule outbound social posts while keeping provider readiness and publish jobs visible."
    >
      <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
        <div className="rounded-[22px] bg-surface-base px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-foreground-primary">
                Scheduler lane
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                This v1 scope stays outbound-only: drafts, schedules, publish jobs, and failure logging.
              </p>
            </div>
            <FormDialog
              trigger={<Button size="sm">New Post</Button>}
              title="Create scheduled post"
              description="Choose the destinations, schedule time, and the post will fan out into provider-specific publish jobs."
              buttonText="Save post"
              handleSubmit={handleSubmit}
            >
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Launch announcement"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Write the post body."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Schedule time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(event) => setScheduledFor(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Channels</Label>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_CHANNELS.map((channel) => (
                      <Button
                        key={channel.key}
                        type="button"
                        variant={channels.includes(channel.key) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setChannels((current) =>
                            current.includes(channel.key)
                              ? current.filter((value) => value !== channel.key)
                              : [...current, channel.key],
                          )
                        }
                      >
                        {channel.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </FormDialog>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {snapshot.posts.length > 0 ? (
          snapshot.posts.map((post) => (
            <div
              key={post.id}
              className="rounded-[28px] border border-border-base bg-surface-strong p-3"
            >
              <div className="rounded-[22px] bg-surface-base px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground-primary">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-foreground-secondary">
                      {post.content}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border-base">
                    {post.status}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.jobs.map((job) => (
                    <Badge
                      key={`${post.id}-${job.providerKey}`}
                      variant="outline"
                      className="border-border-base"
                    >
                      {job.providerKey.replace('social_', '')}: {job.status}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed border-border-base bg-surface-strong px-5 py-10 text-sm text-foreground-secondary">
            No scheduled posts yet.
          </div>
        )}
      </div>
    </ContentPage>
  )
}
