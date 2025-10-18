'use client';
import { memo, useId, useMemo } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { components as defaultComponents } from './lib/components';
import { cn } from './lib/utils';
import {
  useMarkdownBlockByIndex,
  useMarkdownBlockCountForPart,
} from '@/lib/stores/hooks';

type HardenReactMarkdownProps = Options & {
  defaultOrigin?: string;
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
};

export type StreamdownProps = HardenReactMarkdownProps & {
  parseIncompleteMarkdown?: boolean;
  className?: string;
  messageId: string;
  partIdx: number;
};

type BlockProps = HardenReactMarkdownProps & {
  messageId: string;
  partIdx: number;
  index: number;
};

const Block = memo(
  ({ messageId, partIdx, index, ...props }: BlockProps) => {
    const block = useMarkdownBlockByIndex(messageId, partIdx, index);
    if (block === null || block.trim() === '') return null;

    return <ReactMarkdown {...props}>{block}</ReactMarkdown>;
  },
  (prev, next) =>
    prev.messageId === next.messageId &&
    prev.partIdx === next.partIdx &&
    prev.index === next.index
);

Block.displayName = 'Block';

export const Streamdown = memo(
  ({
    messageId,
    partIdx,
    allowedImagePrefixes,
    allowedLinkPrefixes,
    defaultOrigin,
    components,
    rehypePlugins,
    remarkPlugins,
    className,
    ...props
  }: StreamdownProps) => {
    const generatedId = useId();
    const blockCount = useMarkdownBlockCountForPart(messageId, partIdx);

    const blockIndexes = useMemo(
      () => Array.from({ length: blockCount }, (_, index) => index),
      [blockCount]
    );

    return (
      <div className={cn('space-y-4', className)} {...props}>
        {blockIndexes.map((index) => (
          <Block
            messageId={messageId}
            partIdx={partIdx}
            index={index}
            components={{
              ...defaultComponents,
              ...components,
            }}
            key={`${generatedId}-block_${index}`}
            rehypePlugins={[rehypeKatex, rehypeRaw, ...(rehypePlugins ?? [])]}
            remarkPlugins={[remarkGfm, remarkMath, ...(remarkPlugins ?? [])]}
          />
        ))}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.messageId === nextProps.messageId &&
    prevProps.partIdx === nextProps.partIdx
);

Streamdown.displayName = 'Streamdown';

export default Streamdown;

