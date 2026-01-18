'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { PluggableList } from 'unified';
import { Streamdown } from '@/components/streamdown/memo-streamdown';
import { components as defaultComponents } from '@/components/streamdown/lib/components';
import { useMarkdownBlocksForPart } from '@/lib/stores/hooks';
import {
  detectMath,
  detectRawHtml,
  loadMarkdownPlugins,
} from '@/components/streamdown/lib/markdown-plugins';

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
    const [fallbackPlugins, setFallbackPlugins] = useState<{
      remark: PluggableList;
      rehype: PluggableList;
    } | null>(null);

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

    const fallback = typeof text === 'string' ? text : '';
    const shouldUseFallback = !hasBlocks && fallback.trim() !== '';
    const needsMath = shouldUseFallback ? detectMath(fallback) : false;
    const needsRaw = shouldUseFallback ? detectRawHtml(fallback) : false;

    useEffect(() => {
      if (!shouldUseFallback) {
        setFallbackPlugins(null);
        return;
      }

      let active = true;
      loadMarkdownPlugins({ gfm: true, math: needsMath, raw: needsRaw }).then(
        (loaded) => {
          if (active) setFallbackPlugins(loaded);
        }
      );
      return () => {
        active = false;
      };
    }, [shouldUseFallback, fallback, needsMath, needsRaw]);

    if (shouldUseFallback) {
      const remarkPluginsResolved = fallbackPlugins
        ? [...fallbackPlugins.remark, ...(remarkPlugins ?? [])]
        : remarkPlugins;
      const rehypePluginsResolved = fallbackPlugins
        ? [...fallbackPlugins.rehype, ...(rehypePlugins ?? [])]
        : rehypePlugins;

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
            rehypePlugins={rehypePluginsResolved}
            remarkPlugins={remarkPluginsResolved}
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