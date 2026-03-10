'use client'

import React from 'react'

/**
 * Decorative blob background graphic with cyan/teal gradient shapes and blur effects.
 * Intended for hero sections, auth pages, or other full-width background use cases.
 * Accepts standard SVG props for sizing and styling.
 */
export function BlobBackgroundGraphic(props: React.SVGProps<SVGSVGElement>) {
  const baseId = React.useId().replace(/:/g, '-')
  const clipId = `${baseId}-clip`
  const filterB = `${baseId}-filter-b`
  const filterC = `${baseId}-filter-c`
  const filterD = `${baseId}-filter-d`
  const filterE = `${baseId}-filter-e`
  const filterF = `${baseId}-filter-f`
  const filterG = `${baseId}-filter-g`

  return (
    <svg
      viewBox="0 0 1242 655"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <g clipPath={`url(#${clipId})`}>
        <g style={{ mixBlendMode: 'overlay' }} filter={`url(#${filterB})`}>
          <path
            opacity=".1"
            d="m-26.733-246.038 420.999-34.957 14.453 881.581-435.452-846.624Z"
            fill="#9CEDFF"
          />
        </g>
        <g style={{ mixBlendMode: 'overlay' }} filter={`url(#${filterC})`}>
          <path
            opacity=".2"
            d="M1104.23-55.942 777.715-83.054l-11.209 683.736L1104.23-55.942Z"
            fill="#7DFFD0"
          />
        </g>
        <g style={{ mixBlendMode: 'overlay' }} opacity=".1" filter={`url(#${filterD})`}>
          <path
            opacity=".4"
            d="M180.164 74.44c14.281 6.219 26.713 6.07 27.769-.332 1.055-6.401-9.666-16.631-23.946-22.85-14.281-6.217-26.713-6.069-27.768.333-1.056 6.402 9.665 16.632 23.945 22.85Z"
            fill="#fff"
          />
        </g>
        <g style={{ mixBlendMode: 'overlay' }} opacity=".07" filter={`url(#${filterE})`}>
          <path
            d="M984.06 90.697c-4.452-9.503-.357-20.815 9.146-25.266l7.194-3.371c9.51-4.452 20.82-.357 25.27 9.146 4.45 9.502.35 20.814-9.15 25.265l-7.19 3.372c-9.507 4.451-20.819.356-25.27-9.147Z"
            fill="#fff"
          />
        </g>
        <g style={{ mixBlendMode: 'overlay' }} opacity=".07" filter={`url(#${filterF})`}>
          <path
            d="M613.495 438.69c-9.11-19.448-.73-42.598 18.718-51.708l7.444-3.487c19.448-9.11 42.598-.73 51.708 18.718 9.11 19.447.729 42.597-18.718 51.707l-7.445 3.488c-19.447 9.109-42.597.729-51.707-18.718Z"
            fill="#fff"
          />
        </g>
        <g style={{ mixBlendMode: 'overlay' }} opacity=".2" filter={`url(#${filterG})`}>
          <path
            d="M287 137c0-157.953 128.047-286 286-286S859-20.953 859 137 730.953 423 573 423 287 294.953 287 137Z"
            fill="#6CE4FF"
          />
        </g>
      </g>
      <defs>
        <filter
          id={filterB}
          x="-154.733"
          y="-408.995"
          width="691.452"
          height="1137.58"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="64" result="effect1_foregroundBlur_2002_4174" />
        </filter>
        <filter
          id={filterC}
          x="638.506"
          y="-211.054"
          width="593.723"
          height="939.735"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="64" result="effect1_foregroundBlur_2002_4174" />
        </filter>
        <filter
          id={filterD}
          x="108.147"
          y="-1.309"
          width="147.857"
          height="128.318"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="24" result="effect1_foregroundBlur_2002_4174" />
        </filter>
        <filter
          id={filterE}
          x="944"
          y="22"
          width="121.728"
          height="117.902"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="16" result="effect1_foregroundBlur_2002_4174" />
        </filter>
        <filter
          id={filterF}
          x="565"
          y="335"
          width="174.86"
          height="170.902"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="16" result="effect1_foregroundBlur_2002_4174" />
        </filter>
        <filter
          id={filterG}
          x="159"
          y="-277"
          width="828"
          height="828"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="64" result="effect1_foregroundBlur_2002_4174" />
        </filter>
        <clipPath id={clipId}>
          <path fill="#fff" d="M0 0h1242v655H0z" />
        </clipPath>
      </defs>
    </svg>
  )
}
