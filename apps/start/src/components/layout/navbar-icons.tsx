import type { ImgHTMLAttributes } from 'react'

export function AppLogo({
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <picture>
      <source srcSet="/logo-light.webp" media="(prefers-color-scheme: light)" />
      <source srcSet="/logo-dark.webp" media="(prefers-color-scheme: dark)" />
      <img src="/logo-dark.webp" alt="RIFT" className={className} {...props} />
    </picture>
  )
}
