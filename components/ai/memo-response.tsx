'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Streamdown } from '@/components/streamdown/memo-streamdown';
import { components as defaultComponents } from '@/components/streamdown/lib/components';
import { useMarkdownBlocksForPart } from '@/lib/stores/hooks';

type ResponseProps = Omit<ComponentProps<typeof Streamdown>, 'children'> & {
  messageId: string;
  partIdx: number;
  onReady?: () => void;
  /**
   * Raw markdown text fallback for cold reloads where the markdown memo store
   * hasn't been seeded with the message yet.
   */
  text?: string;
};

export const MemoResponse = memo(
  ({
    className,
    messageId,
    partIdx,
    onReady,
    text,
    components,
    rehypePlugins,
    remarkPlugins,
    ...markdownProps
  }: ResponseProps) => {
    const hasNotifiedRef = useRef(false);
    const blocks = useMarkdownBlocksForPart(messageId, partIdx);

    const hasBlocks = useMemo(() => {
      if (!blocks || blocks.length === 0) return false;
      return blocks.some((b) => b && b.trim() !== '');
    }, [blocks]);

    useEffect(() => {
      if (!onReady || hasNotifiedRef.current) return;

      let rafId1: number | null = null;
      let rafId2: number | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      // Dual RAF + setTimeout ensures DOM has painted before scroll coordination
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          timeoutId = setTimeout(() => {
            if (!hasNotifiedRef.current) {
              hasNotifiedRef.current = true;
              onReady();
            }
          }, 0);
        });
      });

      return () => {
        if (rafId1 !== null) cancelAnimationFrame(rafId1);
        if (rafId2 !== null) cancelAnimationFrame(rafId2);
        if (timeoutId !== null) clearTimeout(timeoutId);
      };
    }, [onReady]);

    if (!hasBlocks) {
      const fallback = typeof text === 'string' ? text : '';
      if (fallback.trim() === '') return null;

      return (
        <div
          className={cn(
            'size-full min-w-0 max-w-full break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-[16px] leading-[28px] font-normal tracking-[0.015em] proportional-nums',
            className
          )}
        >
          <ReactMarkdown
            {...markdownProps}
            components={{
              ...defaultComponents,
              ...components,
            }}
            rehypePlugins={[rehypeKatex, rehypeRaw, ...(rehypePlugins ?? [])]}
            remarkPlugins={[remarkGfm, remarkMath, ...(remarkPlugins ?? [])]}
          >
            {fallback}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <Streamdown
        messageId={messageId}
        partIdx={partIdx}
        className={cn(
          'size-full min-w-0 max-w-full break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-[16px] leading-[28px] font-normal tracking-[0.015em] proportional-nums',
          className
        )}
        components={components}
        rehypePlugins={rehypePlugins}
        remarkPlugins={remarkPlugins}
        {...markdownProps}
      />
    );
  },
  (prevProps, nextProps) =>
    prevProps.messageId === nextProps.messageId &&
    prevProps.partIdx === nextProps.partIdx &&
    prevProps.text === nextProps.text
);

MemoResponse.displayName = 'MemoResponse';