import { streamText, UIMessage, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { getLanguageModel } from '@/lib/ai/ai-providers';
import { api } from '@/convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';
import { withAuth } from '@workos-inc/authkit-nextjs';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    modelId,
    threadId,
  }: { messages: UIMessage[]; modelId: string; threadId: string } = await req.json();

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const assistantMessageId = crypto.randomUUID();

      // Fetch auth lazily in parallel
      let accessToken: string | undefined;
      const authPromise = withAuth()
        .then(({ accessToken: token }) => { accessToken = token; })
        .catch((err) => { console.error('withAuth failed', err); });

      // Immediately signal start to the client so spinner shows instantly
      writer.write({ type: 'start', messageId: assistantMessageId });

      const languageModel = getLanguageModel(modelId);
      console.debug('AI streaming with model', modelId);

      // Batch persistence every ~800ms without affecting client stream
      let pendingDelta = '';
      let lastFlushAt = Date.now();
      const FLUSH_EVERY_MS = 1500;
      let gotAnyDelta = false;
      let startAssistantPromise: Promise<any> | null = null;

      const ensureAuth = async () => {
        if (!accessToken) {
          await authPromise;
        }
      };

      const flush = async () => {
        if (pendingDelta.length === 0) return;
        // Ensure assistant message doc exists before appending deltas
        if (startAssistantPromise) {
          try {
            await startAssistantPromise;
          } catch {
            // If creation failed, skip persisting deltas
          }
        }
        await ensureAuth();
        const toSend = pendingDelta;
        pendingDelta = '';
        lastFlushAt = Date.now();
        fetchMutation(api.threads.appendAssistantMessageDelta, {
          messageId: assistantMessageId,
          delta: toSend,
        }, { token: accessToken }).catch(() => {});
      };

      // Start streaming from the model
      const result = streamText({
        // @ts-ignore accept union model from registry
        model: languageModel,
        messages: convertToModelMessages(messages),
        onChunk: async ({ chunk }) => {
          if (chunk.type === 'text-delta' && chunk.text.length > 0) {
            gotAnyDelta = true;
            pendingDelta += chunk.text;
            const now = Date.now();
            if (now - lastFlushAt >= FLUSH_EVERY_MS) {
              await flush();
            }
          }
        },
        onFinish: async ({ text }) => {
          await flush();
          await ensureAuth();
          const ok = gotAnyDelta || (text?.length ?? 0) > 0;
          fetchMutation(api.threads.finalizeAssistantMessage, {
            messageId: assistantMessageId,
            ok,
            error: ok ? undefined : { type: 'empty', message: 'No tokens received from provider' },
          }, { token: accessToken }).catch(() => {});
        },
        onError: async (e) => {
          console.error('streamText error', e);
          await flush();
          fetchMutation(api.threads.finalizeAssistantMessage, {
            messageId: assistantMessageId,
            ok: false,
            error: { type: 'generation', message: 'stream error' },
          }, { token: accessToken }).catch(() => {});
        },
      });
      writer.merge(result.toUIMessageStream({ sendStart: false }));

      // Persist the latest user message (non-blocking) to avoid reordering/flicker without delaying stream
      try {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        const lastUserText = lastUser?.parts?.map((p: any) => (p?.type === 'text' ? p.text : '')).join('') ?? '';
        const lastUserId = (lastUser as any)?.id as string | undefined;

        if (lastUser && lastUserId) {
          await ensureAuth();
          fetchMutation(api.threads.sendMessage, {
            threadId,
            content: lastUserText,
            model: modelId,
            messageId: lastUserId,
          }, { token: accessToken }).catch(() => {});
        }
      } catch (err) {
        console.error('persist user message failed', err);
      }

      // Start assistant message doc creation in background and hold the promise for flush gating
      startAssistantPromise = (async () => {
        await ensureAuth();
        return fetchMutation(api.threads.startAssistantMessage, {
          threadId,
          messageId: assistantMessageId,
          model: modelId,
        }, { token: accessToken });
      })().catch((err) => {
        console.error('startAssistantMessage failed', err);
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}