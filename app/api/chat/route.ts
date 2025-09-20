import { streamText, UIMessage, convertToModelMessages } from "ai";
import {
  getLanguageModel,
  getProviderOptions,
  isPremium,
} from "@/lib/ai/ai-providers";
import { createToolsForModel } from "@/lib/ai/model-tools";
import { ToolType } from "@/lib/ai/config/base";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamWriter,
} from "ai";
import { smoothStream } from "ai";
import { PostHog } from "posthog-node";
import { withTracing } from "@posthog/ai";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { Id } from "@/convex/_generated/dataModel";

class PostHogCleanupManager {
  private static cleanupFunctions: (() => void)[] = [];
  private static initialized = false;

  static addCleanup(cleanup: () => void) {
    this.cleanupFunctions.push(cleanup);
    if (!this.initialized) {
      this.initialize();
    }
  }

  static removeCleanup(cleanup: () => void) {
    const index = this.cleanupFunctions.indexOf(cleanup);
    if (index > -1) {
      this.cleanupFunctions.splice(index, 1);
    }
  }

  private static initialize() {
    this.initialized = true;
  }
}

const maxDuration = 300000; // 5 minutes

export const runtime = "edge";

interface AuthContext {
  accessToken: string;
  user: { id: string; organizationId?: string };
}

async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  statusCode = 500,
  onStreamError?: (error: Error) => void,
): Promise<T | Response> {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMessage, error);
    if (onStreamError) {
      onStreamError(error as Error);
      return undefined as unknown as T;
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function getAuthContext(): Promise<AuthContext | Response> {
  return withErrorBoundary(
    async () => {
      const authResult = await withAuth();
      if (!authResult.accessToken || !authResult.user) {
        throw new Error("Unauthorized");
      }
      return {
        accessToken: authResult.accessToken,
        user: {
          id: authResult.user.id,
          organizationId: authResult.organizationId,
        },
      };
    },
    "Authentication failed",
    401,
  );
}

export async function POST(req: Request) {
  const abortSignal = req.signal;
  if (abortSignal?.aborted) {
    return new Response("Request aborted", { status: 499 });
  }

  const requestData = await withErrorBoundary(
    async () => {
      return (await req.json()) as {
        messages: UIMessage[];
        modelId: string;
        threadId: string;
        enabledTools?: ToolType[];
      };
    },
    "Invalid request data",
    400,
  );

  if (requestData instanceof Response) return requestData;

  const { messages, modelId, threadId, enabledTools = [] } = requestData;

  const quotaType: "standard" | "premium" = isPremium(modelId)
    ? "premium"
    : "standard";

  console.log(`Using ${quotaType} quota for model: ${modelId}`);

  const authContext = await getAuthContext();
  if (authContext instanceof Response) return authContext;

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
      const assistantMessageId = globalThis.crypto.randomUUID();
      let assistantMessageStarted = false;
      let finalizationPromise: Promise<void> | null = null;
      let totalContent = "";
      let totalReasoning = "";
      let isAborted = false;

      // Use pre-authenticated context
      const { accessToken, user } = authContext;

      writer.write({ type: "start", messageId: assistantMessageId });

      let languageModel = getLanguageModel(modelId);

      // PostHog tracking
      const setupPostHogTracking = async () => {
        if (!process.env.POSTHOG_HOST || !process.env.POSTHOG_KEY)
          return languageModel;

        const result = await withErrorBoundary(async () => {
          const phClient = new PostHog(process.env.POSTHOG_KEY!, {
            host: process.env.POSTHOG_HOST,
            flushAt: 1,
            flushInterval: 0,
          });

          const tracedModel = withTracing(languageModel, phClient, {
            posthogDistinctId: user.id,
            posthogTraceId: threadId,
            posthogProperties: {
              conversationId: threadId,
              model: modelId,
              requestId: assistantMessageId,
              enabledTools:
                enabledTools.length > 0 ? enabledTools.join(",") : undefined,
            },
            posthogPrivacyMode: false,
            ...(user.organizationId && {
              posthogGroups: { organization: user.organizationId },
            }),
          });

          const cleanup = () => {
            try {
              phClient.shutdown();
            } catch (e) {
              console.warn("PostHog shutdown error:", e);
            }
          };

          PostHogCleanupManager.addCleanup(cleanup);

          const abortCleanup = () => {
            cleanup();
            PostHogCleanupManager.removeCleanup(cleanup);
          };

          abortSignal?.addEventListener("abort", abortCleanup);

          return tracedModel;
        }, "PostHog setup failed");

        return result instanceof Response ? languageModel : result;
      };

      languageModel = await setupPostHogTracking();
      console.debug("AI streaming with model", modelId);

      let pendingDelta = "";
      let pendingReasoning = "";
      let lastFlushAt = Date.now();
      const FLUSH_EVERY_MS = 1500;
      let gotAnyDelta = false;
      let gotAnyReasoning = false;
      let startAssistantPromise: Promise<
        { messageDocId: Id<"messages"> } | undefined
      > | null = null;

      const persistMessages = async () => {
        const persistenceResult = await withErrorBoundary(
          async () => {
            const lastUser = [...messages]
              .reverse()
              .find((m) => m.role === "user");
            const lastUserText =
              lastUser?.parts
                ?.map((p) => {
                  if (p.type === "text" && "text" in p) {
                    return p.text;
                  }
                  return "";
                })
                .join("") ?? "";
            const lastUserId = lastUser?.id;

            if (lastUser && lastUserId && lastUserText) {
              await fetchMutation(
                api.threads.sendMessage,
                {
                  threadId,
                  content: lastUserText,
                  model: modelId,
                  messageId: lastUserId,
                  quotaType,
                  modelParams: undefined,
                },
                { token: accessToken },
              );
            }

            if (!assistantMessageStarted) {
              assistantMessageStarted = true;
              return await fetchMutation(
                api.threads.startAssistantMessage,
                {
                  threadId,
                  messageId: assistantMessageId,
                  model: modelId,
                },
                { token: accessToken },
              );
            }

            return undefined;
          },
          "Failed to persist messages",
          500,
          (error) => {
            writer.write({
              type: "error",
              errorText: `Persistence failed: ${error.message}`,
            });
          },
        );

        if (persistenceResult instanceof Response) {
          throw new Error("Persistence failed");
        }

        startAssistantPromise = Promise.resolve(persistenceResult);
      };

      await persistMessages();

      const handleAbort = async (): Promise<void> => {
        if (isAborted) return;
        isAborted = true;

        if (!assistantMessageStarted || !startAssistantPromise) return;

        if (!finalizationPromise) {
          const contentToSave = totalContent + pendingDelta;
          const reasoningToSave = totalReasoning + pendingReasoning;
          const minContentLength = 10;

          const ok = contentToSave.length >= minContentLength;
          const errorType = ok
            ? undefined
            : { type: "aborted", message: "Response too short or cancelled" };

          const result = await withErrorBoundary(
            async () => {
              if (startAssistantPromise) {
                await startAssistantPromise;
              }

              await fetchMutation(
                api.threads.finalizeAssistantMessage,
                {
                  messageId: assistantMessageId,
                  ok,
                  finalContent: contentToSave,
                  finalReasoning: reasoningToSave,
                  error: errorType,
                },
                { token: accessToken },
              );
            },
            "Failed to finalize on abort",
            500,
            (error) => {
              writer.write({
                type: "error",
                errorText: `Finalize failed on abort: ${error.message}`,
              });
            },
          );

          if (result instanceof Response) {
            console.error("Finalize failed on abort:", result);
          }
          finalizationPromise = Promise.resolve();
        }

        if (finalizationPromise) {
          await finalizationPromise;
        }
      };

      // Set up abort listeners
      if (abortSignal) {
        abortSignal.addEventListener("abort", handleAbort);
      }
      if (req.signal) {
        req.signal.addEventListener("abort", handleAbort);
      }

      if (abortSignal?.aborted || req.signal?.aborted) {
        await handleAbort();
        return;
      }

      // Tools for the model if any are enabled
      const tools =
        enabledTools.length > 0
          ? createToolsForModel(modelId, enabledTools)
          : undefined;

      // Check if this is a reasoning model to enable reasoning summaries
      const providerOptions = getProviderOptions(modelId);

      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Generation timeout"));
        }, maxDuration);
      });

      const flush = async (): Promise<void> => {
        if (
          abortSignal?.aborted ||
          isAborted ||
          (pendingDelta.length === 0 && pendingReasoning.length === 0)
        )
          return;

        if (startAssistantPromise) {
          await startAssistantPromise;
        }

        if (abortSignal?.aborted || isAborted) return;

        const toSendContent = pendingDelta;
        const toSendReasoning = pendingReasoning;
        pendingDelta = "";
        pendingReasoning = "";
        lastFlushAt = Date.now();

        const result = await withErrorBoundary(
          async () => {
            await fetchMutation(
              api.threads.appendAssistantMessageDelta,
              {
                messageId: assistantMessageId,
                delta: toSendContent,
                reasoningDelta:
                  toSendReasoning.length > 0 ? toSendReasoning : undefined,
              },
              { token: accessToken },
            );
          },
          "Failed to flush message delta",
          500,
          (error) => {
            writer.write({
              type: "error",
              errorText: `Flush failed: ${error.message}`,
            });
          },
        );

        if (result instanceof Response) {
          console.error("Flush error:", result);
        }
      };

      let streamResult: ReturnType<typeof streamText>;
      try {
        streamResult = (await Promise.race([
          streamText({
            model: languageModel,
            messages: convertToModelMessages(messages),
            tools,
            experimental_transform: smoothStream({
              delayInMs: 10,
              chunking: "word",
            }),
            abortSignal,
            providerOptions,
            onChunk: async ({
              chunk,
            }: {
              chunk: { type: string; text?: string };
            }) => {
              if (abortSignal?.aborted || isAborted) return;

              if (
                chunk.type === "text-delta" &&
                chunk.text &&
                chunk.text.length > 0
              ) {
                gotAnyDelta = true;
                pendingDelta += chunk.text;
                totalContent += chunk.text;
                const now = Date.now();
                if (
                  now - lastFlushAt >= FLUSH_EVERY_MS &&
                  !abortSignal?.aborted &&
                  !isAborted
                ) {
                  await flush();
                }
              } else if (
                chunk.type === "reasoning-delta" &&
                "text" in chunk &&
                typeof chunk.text === "string" &&
                chunk.text.length > 0
              ) {
                gotAnyReasoning = true;
                const reasoningText = chunk.text;
                pendingReasoning += reasoningText;
                totalReasoning += reasoningText;
                const now = Date.now();
                if (
                  now - lastFlushAt >= FLUSH_EVERY_MS &&
                  !abortSignal?.aborted &&
                  !isAborted
                ) {
                  await flush();
                }
              }
            },
            onFinish: async ({ text }: { text?: string }): Promise<void> => {
              if (abortSignal?.aborted || isAborted) return;

              await flush();

              if (finalizationPromise) {
                await finalizationPromise;
                return;
              }

              const minContentLength = 10;
              const finalContent = totalContent + pendingDelta;
              const finalReasoningContent = totalReasoning + pendingReasoning;
              const ok =
                gotAnyDelta ||
                gotAnyReasoning ||
                (text?.length ?? 0) > 0 ||
                finalContent.length >= minContentLength;

              const result = await withErrorBoundary(
                async () => {
                  if (startAssistantPromise) {
                    await startAssistantPromise;
                  }

                  await fetchMutation(
                    api.threads.finalizeAssistantMessage,
                    {
                      messageId: assistantMessageId,
                      ok,
                      finalContent:
                        finalContent.length > 0 ? finalContent : undefined,
                      finalReasoning:
                        finalReasoningContent.length > 0
                          ? finalReasoningContent
                          : undefined,
                      error: ok
                        ? undefined
                        : {
                            type: "empty",
                            message: "No tokens received from provider",
                          },
                    },
                    { token: accessToken },
                  );
                },
                "Failed to finalize message",
                500,
                (error) => {
                  writer.write({
                    type: "error",
                    errorText: `Finalize failed: ${error.message}`,
                  });
                },
              );

              if (result instanceof Response) {
                console.error("Finalize failed:", result);
              }
              finalizationPromise = Promise.resolve();
              if (finalizationPromise) {
                await finalizationPromise;
              }
            },
            onError: async ({ error }: { error: unknown }): Promise<void> => {
              console.error("streamText error", error);

              const errorObj = error as Error;
              const isAbortError =
                errorObj.name === "AbortError" ||
                errorObj.message?.includes("aborted") ||
                errorObj.message?.includes("cancelled") ||
                abortSignal?.aborted ||
                isAborted ||
                errorObj.message === "Generation timeout";

              if (isAbortError) {
                await handleAbort();
                return;
              }

              await flush();

              if (finalizationPromise) {
                await finalizationPromise;
                return;
              }

              const result = await withErrorBoundary(
                async () => {
                  if (startAssistantPromise) {
                    await startAssistantPromise;
                  }

                  await fetchMutation(
                    api.threads.finalizeAssistantMessage,
                    {
                      messageId: assistantMessageId,
                      ok: false,
                      error: {
                        type: "generation",
                        message: errorObj.message || "stream error",
                      },
                    },
                    { token: accessToken },
                  );
                },
                "Failed to finalize error",
                500,
                (error) => {
                  writer.write({
                    type: "error",
                    errorText: `Error finalize failed: ${error.message}`,
                  });
                },
              );

              if (result instanceof Response) {
                console.error("Finalize error failed:", result);
              }
              finalizationPromise = Promise.resolve();
              if (finalizationPromise) {
                await finalizationPromise;
              }
            },
          }),
          timeoutPromise,
        ])) as ReturnType<typeof streamText>;
      } catch (error) {
        console.error("Generation timeout or error:", error);
        isAborted = true;
        await handleAbort();
        writer.write({
          type: "error",
          errorText: "Generation timed out",
        });
        return;
      }

      writer.merge(streamResult.toUIMessageStream({ sendStart: false }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
