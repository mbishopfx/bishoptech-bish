import katexStylesHref from 'katex/dist/katex.min.css?url'

/**
 * Streamdown math exposes the KaTeX stylesheet path as a bare package string.
 * Vite needs the asset resolved ahead of time so the lazy math loader can
 * inject a browser-safe URL when a message first uses math syntax.
 */
export { katexStylesHref }
