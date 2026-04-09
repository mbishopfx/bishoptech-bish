'use client'

import { startTransition, useEffect, useState } from 'react'
import type { PluginConfig } from 'streamdown'
import { waitForPageSettled } from '@/lib/frontend/performance/page-settled'

const KATEX_STYLES_LINK_ID = 'streamdown-katex-styles'

let mathPluginPromise: Promise<typeof import('@streamdown/math')> | undefined
let mermaidPluginPromise:
  | Promise<typeof import('@streamdown/mermaid')>
  | undefined
let mathStylesHrefPromise: Promise<string> | undefined
let streamdownPluginsPromise: Promise<PluginConfig> | undefined
let cachedStreamdownPlugins: PluginConfig | undefined

async function ensureStylesheet(href: string): Promise<void> {
  if (typeof document === 'undefined') return

  const existingLink = document.getElementById(
    KATEX_STYLES_LINK_ID,
  ) as HTMLLinkElement | null
  if (existingLink) {
    if (existingLink.dataset.loaded === 'true') {
      return
    }

    await new Promise<void>((resolve, reject) => {
      existingLink.addEventListener(
        'load',
        () => {
          existingLink.dataset.loaded = 'true'
          resolve()
        },
        { once: true },
      )
      existingLink.addEventListener(
        'error',
        () => {
          reject(new Error('Failed to load KaTeX stylesheet'))
        },
        { once: true },
      )
    })
    return
  }

  const link = document.createElement('link')
  link.id = KATEX_STYLES_LINK_ID
  link.rel = 'stylesheet'
  link.href = href

  await new Promise<void>((resolve, reject) => {
    link.addEventListener(
      'load',
      () => {
        link.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    link.addEventListener(
      'error',
      () => {
        reject(new Error('Failed to load KaTeX stylesheet'))
      },
      { once: true },
    )
    document.head.appendChild(link)
  })
}

function loadMathPlugin() {
  mathPluginPromise ??= import('@streamdown/math')
  return mathPluginPromise
}

function loadMathStylesHref() {
  mathStylesHrefPromise ??= import('./streamdown-math-styles').then(
    ({ katexStylesHref }) => katexStylesHref,
  )
  return mathStylesHrefPromise
}

function loadMermaidPlugin() {
  mermaidPluginPromise ??= import('@streamdown/mermaid')
  return mermaidPluginPromise
}

async function loadStreamdownPlugins(): Promise<PluginConfig> {
  if (cachedStreamdownPlugins) {
    return cachedStreamdownPlugins
  }

  streamdownPluginsPromise ??= (async () => {
    const [mathModule, mathStylesHref, mermaidModule] = await Promise.all([
      loadMathPlugin(),
      loadMathStylesHref(),
      loadMermaidPlugin(),
    ])

    await ensureStylesheet(mathStylesHref)

    cachedStreamdownPlugins = {
      math: mathModule.math,
      mermaid: mermaidModule.mermaid,
    }

    return cachedStreamdownPlugins
  })()

  return streamdownPluginsPromise
}

/**
 * Streamdown's optional plugins stay off the critical path by loading once
 * after the page has finished its initial work. Keeping this hook global and
 * shared avoids per-message syntax checks while still deferring the heavy
 * diagram/math stack until after first load.
 */
export function useStreamdownPlugins(): PluginConfig | undefined {
  const [plugins, setPlugins] = useState<PluginConfig | undefined>(
    cachedStreamdownPlugins,
  )

  useEffect(() => {
    if (cachedStreamdownPlugins) {
      setPlugins(cachedStreamdownPlugins)
      return
    }

    let cancelled = false

    void waitForPageSettled()
      .then(() => loadStreamdownPlugins())
      .then((nextPlugins) => {
        if (cancelled) return

        startTransition(() => {
          setPlugins(nextPlugins)
        })
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Failed to load Streamdown plugins:', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return plugins
}
