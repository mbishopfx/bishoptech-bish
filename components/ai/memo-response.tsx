'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Streamdown, type PluginConfig } from 'streamdown';
import { code } from '@streamdown/code';
import { mermaid } from '@streamdown/mermaid';
import { math } from '@streamdown/math';
import { components as customComponents } from '@/components/streamdown/lib/components';

const plugins = { code, mermaid, math } as PluginConfig;

type MemoResponseProps = {
  messageId: string;
  partIdx: number;
  onReady?: () => void;
  text?: string;
  isStreaming?: boolean;
  className?: string;
};

export function MemoResponse({
  className,
  messageId,
  partIdx,
  onReady,
  text,
  isStreaming = false,
}: MemoResponseProps) {
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (!onReady || hasNotifiedRef.current) return;

    let rafId1: number | null = null;
    let rafId2: number | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

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

  const content = typeof text === 'string' ? text : '';

  if (!content.trim()) {
    return null;
  }

  return (
    <Streamdown
      key={`${messageId}-${partIdx}`}
      plugins={plugins}
      shikiTheme={['github-light', 'github-dark']}
      isAnimating={isStreaming}
      mode={isStreaming ? 'streaming' : 'static'}
      components={customComponents as Record<string, React.ComponentType<unknown>>}
      controls={{
        code: true,
        table: true,
        mermaid: {
          download: true,
          copy: true,
          fullscreen: true,
          panZoom: false,
        },
      }}
      className={cn(
        'size-full min-w-0 max-w-full break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-[16px] leading-[28px] font-normal tracking-[0.015em] proportional-nums',
        className
      )}
    >
      {content}
    </Streamdown>
  );
}
