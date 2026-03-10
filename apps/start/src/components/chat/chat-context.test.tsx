// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatProvider, useChat } from './chat-context'

type UseAIChatResult = {
  messages: unknown[]
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  error: Error | null
  sendMessage: ReturnType<typeof vi.fn>
  regenerate: ReturnType<typeof vi.fn>
  setMessages: ReturnType<typeof vi.fn>
  resumeStream: ReturnType<typeof vi.fn>
}

const navigateMock = vi.fn()
const zeroMutateMock = vi.fn(() => ({
  client: Promise.resolve(),
}))
const sessions = new Map<string, UseAIChatResult>()
const useAIChatMock = vi.fn((input: { id: string }) => {
  const existing = sessions.get(input.id)
  if (existing) return existing

  const created: UseAIChatResult = {
    messages: [],
    status: 'ready',
    error: null,
    sendMessage: vi.fn(async () => undefined),
    regenerate: vi.fn(async () => undefined),
    setMessages: vi.fn(),
    resumeStream: vi.fn(async () => undefined),
  }
  sessions.set(input.id, created)
  return created
})

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [[], { type: 'complete' as const }],
  useZero: () => ({
    mutate: zeroMutateMock,
  }),
}))

vi.mock('@ai-sdk/react', () => ({
  useChat: (input: { id: string }) => useAIChatMock(input),
}))

vi.mock('./thread-status-store', () => ({
  subscribeThreadStatuses: () => () => undefined,
  getThreadStatusesVersion: () => 0,
  getThreadGenerationStatus: () => undefined,
}))

function Consumer() {
  const { sendMessage } = useChat()
  return (
    <button
      type="button"
      onClick={() => {
        void sendMessage({ text: 'hello' } as never)
      }}
    >
      send
    </button>
  )
}

function RegenerateConsumer({ messageId }: { messageId: string }) {
  const { regenerateMessage } = useChat()
  return (
    <button
      type="button"
      onClick={() => {
        void regenerateMessage(messageId)
      }}
    >
      regen
    </button>
  )
}

function BranchSwitchConsumer() {
  const { selectBranchVersion } = useChat()
  return (
    <button
      type="button"
      onClick={() => {
        void selectBranchVersion({
          parentMessageId: 'u2',
          childMessageId: 'a2',
        })
      }}
    >
      switch
    </button>
  )
}

function EditConsumer({ messageId, editedText }: { messageId: string; editedText: string }) {
  const { editMessage } = useChat()
  return (
    <button
      type="button"
      onClick={() => {
        void editMessage({ messageId, editedText })
      }}
    >
      edit
    </button>
  )
}

describe('ChatProvider', () => {
  const mockedThreadId = '00000000-0000-0000-0000-000000000001'

  beforeEach(() => {
    sessions.clear()
    useAIChatMock.mockClear()
    navigateMock.mockClear()
    zeroMutateMock.mockClear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockedThreadId)
  })

  it('uses the new thread session (not composer) for first message from /chat', async () => {
    render(
      <ChatProvider threadId={undefined}>
        <Consumer />
      </ChatProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'send' }))
    })

    const composer = sessions.get('chat-ui:composer')
    const newThread = sessions.get(`chat-ui:${mockedThreadId}`)

    expect(newThread?.sendMessage).toHaveBeenCalledTimes(1)
    expect(composer?.sendMessage).toHaveBeenCalledTimes(0)
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/chat/$threadId',
      params: { threadId: mockedThreadId },
    })
  })

  it('keeps chat sessions isolated per thread when route threadId changes', async () => {
    const { rerender } = render(
      <ChatProvider threadId="thread-a">
        <Consumer />
      </ChatProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'send' }))
    })

    rerender(
      <ChatProvider threadId="thread-b">
        <Consumer />
      </ChatProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'send' }))
    })

    expect(sessions.get('chat-ui:thread-a')?.sendMessage).toHaveBeenCalledTimes(1)
    expect(sessions.get('chat-ui:thread-b')?.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('keeps assistant target row while truncating descendants before regenerate', async () => {
    const threadId = 'thread-regen'
    const sessionId = `chat-ui:${threadId}`
    const session: UseAIChatResult = {
      messages: [
        { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'q1' }] },
        { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'a1' }] },
        { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'q2' }] },
        { id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'a2' }] },
        { id: 'u3', role: 'user', parts: [{ type: 'text', text: 'q3' }] },
      ],
      status: 'ready',
      error: null,
      sendMessage: vi.fn(async () => undefined),
      regenerate: vi.fn(async () => undefined),
      setMessages: vi.fn(),
      resumeStream: vi.fn(async () => undefined),
    }
    sessions.set(sessionId, session)

    render(
      <ChatProvider threadId={threadId}>
        <RegenerateConsumer messageId="a2" />
      </ChatProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'regen' }))
    })

    const truncatedHistory = session.messages.slice(0, 4)
    const didTruncateAtAnchor = session.setMessages.mock.calls.some(
      ([candidate]) => JSON.stringify(candidate) === JSON.stringify(truncatedHistory),
    )
    expect(didTruncateAtAnchor).toBe(true)
    expect(session.regenerate).toHaveBeenCalledTimes(1)
    expect(session.regenerate).toHaveBeenCalledWith({ messageId: 'a2' })
  })

  it('ignores branch switching requests while streaming', async () => {
    const threadId = 'thread-streaming'
    sessions.set(`chat-ui:${threadId}`, {
      messages: [],
      status: 'streaming',
      error: null,
      sendMessage: vi.fn(async () => undefined),
      regenerate: vi.fn(async () => undefined),
      setMessages: vi.fn(),
      resumeStream: vi.fn(async () => undefined),
    })

    render(
      <ChatProvider threadId={threadId}>
        <BranchSwitchConsumer />
      </ChatProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'switch' }))
    })

    expect(zeroMutateMock).not.toHaveBeenCalled()
  })

  it('routes user edits through regenerate with edit trigger payload', async () => {
    const threadId = 'thread-edit'
    const sessionId = `chat-ui:${threadId}`
    const session: UseAIChatResult = {
      messages: [
        { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'original' }] },
        { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'answer' }] },
      ],
      status: 'ready',
      error: null,
      sendMessage: vi.fn(async () => undefined),
      regenerate: vi.fn(async () => undefined),
      setMessages: vi.fn(),
      resumeStream: vi.fn(async () => undefined),
    }
    sessions.set(sessionId, session)

    vi.mocked(useAIChatMock).mockClear()

    render(
      <ChatProvider threadId={threadId}>
        <EditConsumer messageId="u1" editedText="edited question" />
      </ChatProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'edit' }))
    })

    expect(session.regenerate).toHaveBeenCalledTimes(1)
    expect(session.regenerate).toHaveBeenCalledWith({
      messageId: 'u1',
      body: {
        trigger: 'edit-message',
        messageId: 'u1',
        editedText: 'edited question',
      },
    })
  })
})
