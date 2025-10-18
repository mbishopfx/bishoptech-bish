'use client';

import { Button } from '@/components/ai/ui/button';
import { cn } from '@/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useRef, memo } from 'react';
import { type BundledLanguage, codeToHtml } from 'shiki';

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
};

async function highlightCode(code: string, language: string) {
  try {
    return await Promise.all([
      codeToHtml(code, {
        lang: language as BundledLanguage,
        theme: 'github-light',
        colorReplacements: {
          '#fff': 'transparent',
        },
      }),
      codeToHtml(code, {
        lang: language as BundledLanguage,
        theme: 'github-dark',
        colorReplacements: {
          '#24292e': 'transparent',
        },
      }),
    ]);
  } catch (error) {
    // Fallback to plaintext if language is not supported
    return await Promise.all([
      codeToHtml(code, {
        lang: 'plaintext',
        theme: 'github-light',
        colorReplacements: {
          '#fff': 'transparent',
        },
      }),
      codeToHtml(code, {
        lang: 'plaintext',
        theme: 'github-dark',
        colorReplacements: {
          '#24292e': 'transparent',
        },
      }),
    ]);
  }
}

export const CodeBlock = memo(({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [html, setHtml] = useState<string>('');
  const [darkHtml, setDarkHtml] = useState<string>('');
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    highlightCode(code, language).then(([light, dark]) => {
      if (mounted.current) {
        setHtml(light);
        setDarkHtml(dark);
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [code, language]);

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-md border bg-background text-foreground',
          className
        )}
        {...props}
      >
        <div className="relative">
          <div
            className="overflow-hidden dark:hidden [&>pre]:bg-transparent! [&>pre]:p-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div
            className="hidden overflow-hidden dark:block [&>pre]:bg-transparent! [&>pre]:p-4"
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
}, (prev, next) => prev.code === next.code && prev.language === next.language);

CodeBlock.displayName = 'CodeBlock';

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard.writeText) {
      onError?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
