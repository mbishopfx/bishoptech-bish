import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import ZeroProvider from '../integrations/zero/provider'
import { ThemeProvider } from '@rift/ui/hooks/useTheme'
import { Toaster } from '@rift/ui/sonner'
import { TooltipProvider } from '@rift/ui/tooltip'
import { DirectionProvider, getLocaleDirection } from '@rift/ui/direction'

import appCss from '../styles.css?url'
import { getLocale } from '@/paraglide/runtime.js'
import { PostHogClientBootstrap } from '@/components/app/posthog-client-bootstrap'
import { getPublicPostHogConfigFn } from '@/lib/frontend/observability/posthog.functions'
import { getAppOrigin } from '@/lib/frontend/metadata/metadata.functions'

/**
 * Applies the stored or system theme before the stylesheet paints.
 */
const THEME_INIT_SCRIPT = `
(() => {
  const storageKey = 'theme';
  const root = document.documentElement;

  try {
    const stored = localStorage.getItem(storageKey);
    const theme = stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    setFavicon(resolved === 'dark');
  } catch {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = systemDark ? 'dark' : 'light';

    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    setFavicon(resolved === 'dark');
  }
})();

function setFavicon(isDark) {
  const suffix = isDark ? '' : '-light';
  const icons = [
    { selector: 'link[rel="icon"][type="image/x-icon"]', href: '/favicon' + suffix + '.ico' },
    { selector: 'link[rel="icon"][sizes="32x32"]', href: '/favicon' + suffix + '-32x32.png' },
    { selector: 'link[rel="icon"][sizes="16x16"]', href: '/favicon' + suffix + '-16x16.png' },
    { selector: 'link[rel="apple-touch-icon"]', href: '/apple-touch-icon' + suffix + '.png' },
  ];
  icons.forEach(({ selector, href }) => {
    const link = document.querySelector(selector);
    if (link) {
      link.setAttribute('href', href);
    }
  });
}
`

const DEFAULT_META = {
  title: 'Rift',
  description: 'Chat with ever AI Model',
} as const

export const Route = createRootRoute({
  loader: async () => ({
    posthog: await getPublicPostHogConfigFn(),
    origin: await getAppOrigin(),
  }),
  head: ({ loaderData }) => {
    const origin = loaderData!.origin
    const ogImageUrl = `${origin}/og.webp`
    const canonicalUrl = origin

    return {
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          title: DEFAULT_META.title,
        },
        {
          name: 'description',
          content: DEFAULT_META.description,
        },
        {
          property: 'og:title',
          content: DEFAULT_META.title,
        },
        {
          property: 'og:description',
          content: DEFAULT_META.description,
        },
        {
          property: 'og:type',
          content: 'website',
        },
        {
          property: 'og:site_name',
          content: DEFAULT_META.title,
        },
        {
          property: 'og:url',
          content: canonicalUrl,
        },
        {
          property: 'og:image',
          content: ogImageUrl,
        },
        {
          property: 'og:image:type',
          content: 'image/webp',
        },
        {
          property: 'og:image:width',
          content: '1200',
        },
        {
          property: 'og:image:height',
          content: '630',
        },
        {
          property: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          property: 'twitter:title',
          content: DEFAULT_META.title,
        },
        {
          property: 'twitter:description',
          content: DEFAULT_META.description,
        },
        {
          property: 'twitter:image',
          content: ogImageUrl,
        },
      ],
      links: [
        {
          rel: 'stylesheet',
          href: appCss,
        },
        {
          rel: 'canonical',
          href: canonicalUrl,
        },
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.ico',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/favicon-32x32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/favicon-16x16.png',
        },
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png',
        },
        {
          rel: 'manifest',
          href: '/manifest.json',
        },
      ],
    }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { posthog } = Route.useLoaderData()
  const locale = getLocale()
  const direction = getLocaleDirection(locale)

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <DirectionProvider direction={direction}>
          <ZeroProvider>
            <ThemeProvider>
              <TooltipProvider delay={100}>
                <PostHogClientBootstrap config={posthog} />
                {children}
                <Toaster />
                <TanStackDevtools
                  config={{
                    position: 'bottom-right',
                  }}
                  plugins={[
                    {
                      name: 'Tanstack Router',
                      render: <TanStackRouterDevtoolsPanel />,
                    },
                  ]}
                />
              </TooltipProvider>
            </ThemeProvider>
          </ZeroProvider>
        </DirectionProvider>
        <Scripts />
      </body>
    </html>
  )
}
