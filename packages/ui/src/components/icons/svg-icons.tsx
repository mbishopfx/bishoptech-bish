'use client'

import React from 'react'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

/**
 * Send/send message icon for chat prompt submit button.
 * Matches the design used in the next app's prompt input.
 */
export function SentIcon({ className, ...props }: IconProps) {
  const clipId = React.useId()
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g clipPath={`url(#${clipId})`}>
        <path
          opacity="0.4"
          d="M36.3936 0.566282C37.794 0.701262 39.2598 1.07836 40.1946 2.08514C41.1018 3.06212 41.3998 4.53112 41.4776 5.92954C41.5596 7.40414 41.412 9.1646 41.1136 11.0602C40.5154 14.8612 39.2736 19.4346 37.7834 23.8192C36.2924 28.2056 34.5304 32.4694 32.8664 35.6494C32.0384 37.2318 31.2062 38.601 30.4142 39.5906C30.02 40.0828 29.595 40.5332 29.143 40.8688C28.7142 41.1876 28.0888 41.531 27.3366 41.4978C26.1284 41.4444 25.2104 40.7826 24.5356 39.9066C23.889 39.0672 23.3784 37.929 22.9246 36.6142C22.0146 33.9776 21.1596 30.0894 20.0576 25.0782C19.8208 24.0014 19.6216 23.636 19.4426 23.4432C19.271 23.2582 18.9448 23.0452 17.9292 22.7604C17.3036 22.5848 16.3558 22.3916 15.1604 22.148C14.7928 22.073 14.4017 21.9934 13.9895 21.908C12.2869 21.5552 10.3065 21.12 8.42323 20.5584C6.55997 20.0028 4.68569 19.2934 3.24655 18.352C1.83659 17.4298 0.512588 16.0558 0.500048 14.1116C0.495288 13.371 0.842468 12.7566 1.17247 12.3247C1.51845 11.872 1.97839 11.4466 2.48243 11.0517C3.49469 10.2586 4.88711 9.43296 6.49253 8.61694C9.71829 6.9773 14.0256 5.2659 18.4444 3.84352C22.8604 2.42204 27.4576 1.26674 31.2626 0.767642C33.16 0.518782 34.9222 0.424462 36.3936 0.566282Z"
          fill="currentColor"
        />
        <path
          d="M20.0008 24.8268C19.789 23.9426 19.6076 23.6202 19.4434 23.4432C19.2718 23.2582 18.9454 23.0452 17.93 22.7604C17.6046 22.669 17.1922 22.573 16.7031 22.4676L25.5856 13.5857C26.3668 12.8047 27.633 12.8048 28.414 13.5858C29.195 14.3669 29.195 15.6332 28.414 16.4143L20.0008 24.8268Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="42" height="42" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

/**
 * Loading spinner icon for chat prompt submit when sending.
 * Matches the design used in the next app's prompt input.
 */
export function LoadingIcon({ className, ...props }: IconProps) {
  const clipId = React.useId()
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M20 2V8"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          opacity="0.4"
          d="M20 32V38"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          opacity="0.4"
          d="M38 20H32"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M8 20H2"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          opacity="0.4"
          d="M32.727 7.27344L28.4844 11.5161"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M11.5161 28.4844L7.27344 32.727"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          opacity="0.4"
          d="M32.727 32.727L28.4844 28.4844"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M11.5161 11.5161L7.27344 7.27344"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="40" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

/**
 * Stop icon for chat prompt submit when streaming (to stop generation).
 * Matches the design used in the next app's prompt input.
 */
export function StopIcon({ className, ...props }: IconProps) {
  const clipId = React.useId()
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M22 42C33.0457 42 42 33.0457 42 22C42 10.9543 33.0457 2 22 2C10.9543 2 2 10.9543 2 22C2 33.0457 10.9543 42 22 42Z"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          opacity="0.4"
          d="M16.7777 28.3258C17.7866 29 19.191 29 22 29C24.809 29 26.2134 29 27.2222 28.3258C27.659 28.034 28.034 27.659 28.3258 27.2222C29 26.2134 29 24.809 29 22C29 19.191 29 17.7866 28.3258 16.7777C28.034 16.341 27.659 15.966 27.2222 15.6741C26.2134 15 24.809 15 22 15C19.191 15 17.7866 15 16.7777 15.6741C16.341 15.966 15.966 16.341 15.6741 16.7777C15 17.7866 15 19.191 15 22C15 24.809 15 26.2134 15.6741 27.2222C15.966 27.659 16.341 28.034 16.7777 28.3258Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="44" height="44" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

/**
 * Regenerate/retry icon used by chat message actions.
 * Geometry matches the icon used in the Next chat implementation.
 */
export function RedoIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M15.1667 0.999756L15.7646 2.11753C16.1689 2.87322 16.371 3.25107 16.2374 3.41289C16.1037 3.57471 15.6635 3.44402 14.7831 3.18264C13.9029 2.92131 12.9684 2.78071 12 2.78071C6.75329 2.78071 2.5 6.90822 2.5 11.9998C2.5 13.6789 2.96262 15.2533 3.77093 16.6093"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M8.83246 22.9999L8.23448 21.8821C7.8302 21.1264 7.62806 20.7486 7.76173 20.5868C7.89539 20.4249 8.33561 20.5556 9.21601 20.817C10.0962 21.0783 11.0307 21.219 11.9991 21.219C17.2458 21.219 21.4991 17.0914 21.4991 11.9999C21.4991 10.3207 21.0365 8.74638 20.2282 7.39038"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Copy icon used by chat message actions.
 * Geometry matches the icon used in the Next chat implementation.
 */
export function CopyIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M16 28C16 22.3432 16 19.5148 17.7574 17.7574C19.5148 16 22.3432 16 28 16H30C35.6568 16 38.4852 16 40.2426 17.7574C42 19.5148 42 22.3432 42 28V30C42 35.6568 42 38.4852 40.2426 40.2426C38.4852 42 35.6568 42 30 42H28C22.3432 42 19.5148 42 17.7574 40.2426C16 38.4852 16 35.6568 16 30V28Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M31.9998 16C31.995 10.0858 31.9056 7.02242 30.184 4.92486C29.8516 4.51978 29.4802 4.14836 29.0752 3.81592C26.8624 2 23.575 2 17 2C10.425 2 7.13756 2 4.92486 3.81592C4.51978 4.14834 4.14836 4.51978 3.81592 4.92486C2 7.13756 2 10.425 2 17C2 23.575 2 26.8624 3.81592 29.0752C4.14834 29.4802 4.51978 29.8516 4.92486 30.184C7.02242 31.9056 10.0858 31.995 16 31.9998"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Edit icon used for user message editing action.
 * Geometry matches the icon used in the Next chat implementation.
 */
export function EditIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M28.8498 5.21018L30.8298 3.2302C32.4702 1.58994 35.1296 1.58994 36.7698 3.2302C38.41 4.87048 38.41 7.52986 36.7698 9.17014L34.7898 11.1501M28.8498 5.21018L15.5312 18.5288C14.5161 19.544 13.7961 20.8156 13.4479 22.2082L12 28L17.7918 26.552C19.1844 26.204 20.456 25.4838 21.4712 24.4688L34.7898 11.1501M28.8498 5.21018L34.7898 11.1501"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M33.9998 23C33.9998 29.575 33.9998 32.8624 32.184 35.0752C31.8516 35.4802 31.4802 35.8516 31.075 36.184C28.8624 38 25.5748 38 18.9998 38H18C10.4575 38 6.68632 38 4.34318 35.6568C2.00006 33.3138 2 29.5424 2 22V21C2 14.425 2 11.1376 3.81588 8.92488C4.14834 8.5198 4.5198 8.14834 4.92488 7.81588C7.13758 6 10.425 6 17 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Lightweight check icon used as copied/saved confirmation glyph.
 */
export function CheckIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
