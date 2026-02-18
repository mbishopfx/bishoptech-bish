import type { Options } from 'react-markdown';
import { cn } from './utils';

type BaseProps = {
  children?: React.ReactNode;
  className?: string;
};

function Ol({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['ol']) {
  return (
    <ol
      className={cn('my-5 ml-0 pl-[26px] list-outside list-decimal', className)}
      {...props}
    >
      {children}
    </ol>
  );
}

function Ul({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['ul']) {
  return (
    <ul
      className={cn('my-5 ml-0 pl-[26px] list-outside list-disc', className)}
      {...props}
    >
      {children}
    </ul>
  );
}

function Hr({ className, ...props }: BaseProps & React.JSX.IntrinsicElements['hr']) {
  return <hr className={cn('my-6 border-border', className)} {...props} />;
}

function Strong({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['span']) {
  return (
    <span className={cn('font-semibold', className)} {...props}>
      {children}
    </span>
  );
}

function A({ children, className, href, ...props }: BaseProps & React.JSX.IntrinsicElements['a']) {
  return (
    <a
      className={cn('font-medium text-primary underline', className)}
      href={href}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  );
}

function H1({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['h1']) {
  return (
    <h1
      className={cn(
        'mt-0 mb-[0.888889em] font-[800] text-[2.25em] leading-[1.11111]',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

function H2({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['h2']) {
  return (
    <h2
      className={cn(
        'mt-[2em] mb-[1em] font-bold text-[1.5em] leading-[1.33333]',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

function H3({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['h3']) {
  return (
    <h3
      className={cn('mb-[0.6em] font-semibold text-[1.25em] leading-[1.6]', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function H4({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['h4']) {
  return (
    <h4 className={cn('mb-[0.5em] font-semibold leading-[1.5]', className)} {...props}>
      {children}
    </h4>
  );
}

function H5({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['h5']) {
  return (
    <h5 className={cn('mb-1 font-semibold text-base', className)} {...props}>
      {children}
    </h5>
  );
}

function H6({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['h6']) {
  return (
    <h6 className={cn('mb-1 font-semibold text-sm', className)} {...props}>
      {children}
    </h6>
  );
}

function Table({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['table']) {
  return (
    <div className="my-4 w-full min-w-0 max-w-full">
      <div className="overflow-x-auto rounded-lg border border-border/50 bg-gray-50 dark:bg-[#1e1e1e] shadow-lg">
        <div className="min-w-full">
          <table
            className={cn('w-full border-collapse text-[14px] table-auto', className)}
            {...props}
          >
            {children}
          </table>
        </div>
      </div>
    </div>
  );
}

function Thead({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['thead']) {
  return (
    <thead
      className={cn('bg-gray-100 dark:bg-[#2d2d2d] border-b border-border/50', className)}
      {...props}
    >
      {children}
    </thead>
  );
}

function Tbody({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['tbody']) {
  return (
    <tbody className={cn('divide-y divide-border/50', className)} {...props}>
      {children}
    </tbody>
  );
}

function Tr({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['tr']) {
  return (
    <tr className={cn('border-border/50 border-b', className)} {...props}>
      {children}
    </tr>
  );
}

function Th({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['th']) {
  return (
    <th
      className={cn(
        'px-4 py-2 text-left font-semibold text-sm text-gray-700 dark:text-white align-top break-words whitespace-normal',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

function Td({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['td']) {
  return (
    <td
      className={cn('px-4 py-2 text-sm align-top break-words whitespace-normal', className)}
      {...props}
    >
      {children}
    </td>
  );
}

function Blockquote({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['blockquote']) {
  return (
    <blockquote
      className={cn(
        'my-4 border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
}

function Sup({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['sup']) {
  return (
    <sup className={cn('text-sm', className)} {...props}>
      {children}
    </sup>
  );
}

function Sub({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['sub']) {
  return (
    <sub className={cn('text-sm', className)} {...props}>
      {children}
    </sub>
  );
}

function P({ children, className, ...props }: BaseProps) {
  return (
    <p className={cn('my-[1.25em]', className)} {...(props as React.JSX.IntrinsicElements['p'])}>
      {children}
    </p>
  );
}

function Li({ children, className, ...props }: BaseProps & React.JSX.IntrinsicElements['li']) {
  return (
    <li className={cn('my-2 pl-[6px]', className)} {...props}>
      {children}
    </li>
  );
}

type InputProps = BaseProps & React.JSX.IntrinsicElements['input'] & { type?: string };

function Input({ type, className, checked, disabled, ...props }: InputProps) {
  if (type === 'checkbox') {
    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <span
          className={cn(
            'h-4 w-4 rounded border-2 flex items-center justify-center cursor-default',
            checked && 'bg-accent border-accent'
          )}
          style={{ accentColor: 'var(--accent)' }}
        >
          {checked && (
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </label>
    );
  }
  return <input type={type} className={cn(className)} {...props} />;
}

export const components: Options['components'] = {
  ol: Ol,
  li: Li,
  ul: Ul,
  p: P,
  hr: Hr,
  strong: Strong,
  a: A,
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
  blockquote: Blockquote,
  sup: Sup,
  sub: Sub,
  input: Input,
};
