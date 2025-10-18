'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from '@/components/streamdown/memo-streamdown';

type ResponseProps = Omit<ComponentProps<typeof Streamdown>, 'children'> & {
  messageId: string;
  partIdx: number;
};

export const MemoResponse = memo(
  ({ className, messageId, partIdx, ...props }: ResponseProps) => (
    <Streamdown
      messageId={messageId}
      partIdx={partIdx}
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.messageId === nextProps.messageId &&
    prevProps.partIdx === nextProps.partIdx
);

MemoResponse.displayName = 'MemoResponse';

