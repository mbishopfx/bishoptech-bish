/**
 * Icons used by the pricing table. Mirrors the next app's landing-icons
 * for consistent visual design across both apps.
 */

import type { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

export function StandarIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M10.2857 28C8.8347 25.6164 8 22.8236 8 19.8377C8 11.0908 15.1634 4 24 4C32.8366 4 40 11.0908 40 19.8377C40 22.8236 39.1654 25.6164 37.7142 28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M14.7657 34.1964C14.582 33.6432 14.4901 33.3666 14.5008 33.1426C14.5235 32.6686 14.8223 32.2524 15.2631 32.081C15.4716 32 15.7621 32 16.3431 32H31.6568C32.238 32 32.5284 32 32.7368 32.081C33.1778 32.2524 33.4766 32.6686 33.4992 33.1426C33.5098 33.3666 33.418 33.6432 33.2342 34.1964C32.8946 35.2188 32.7248 35.7302 32.463 36.144C31.9144 37.0112 31.0544 37.6334 30.0612 37.8816C29.587 38 29.05 38 27.9762 38H20.0238C18.9499 38 18.413 38 17.9389 37.8816C16.9457 37.6334 16.0856 37.0112 15.537 36.144C15.2751 35.7302 15.1053 35.2188 14.7657 34.1964Z"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M30 38L29.7414 39.2932C29.4586 40.7074 29.3172 41.4144 29.0002 41.9732C28.5104 42.837 27.7164 43.4878 26.7732 43.7988C26.1632 44 25.4422 44 24 44C22.5578 44 21.8368 44 21.2268 43.7988C20.2836 43.4878 19.4897 42.837 18.9997 41.9732C18.6829 41.4144 18.5415 40.7074 18.2586 39.2932L18 38"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  )
}

export function PremiumIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        opacity="0.4"
        d="M19.2012 12.2242C19.8449 10.5919 22.155 10.5919 22.7988 12.2242L24.6206 16.8432C25.7998 19.8333 28.1666 22.2002 31.1568 23.3794L35.7758 25.2012C37.408 25.845 37.408 28.155 35.7758 28.7988L31.1568 30.6206C28.1666 31.7998 25.7998 34.1666 24.6206 37.1568L22.7988 41.7758C22.155 43.408 19.8449 43.408 19.2012 41.7758L17.3795 37.1568C16.2002 34.1666 13.8333 31.7998 10.8432 30.6206L6.22422 28.7988C4.59192 28.155 4.59192 25.845 6.22422 25.2012L10.8432 23.3794C13.8333 22.2002 16.2002 19.8333 17.3795 16.8432L19.2012 12.2242Z"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M36.3254 5.45908C36.5668 4.84697 37.4332 4.84697 37.6746 5.45908L38.3576 7.19119C38.8 8.31247 39.6876 9.20007 40.8088 9.64229L42.541 10.3254C43.153 10.5669 43.153 11.4331 42.541 11.6746L40.8088 12.3577C39.6876 12.7999 38.8 13.6875 38.3576 14.8088L37.6746 16.5409C37.4332 17.153 36.5668 17.153 36.3254 16.5409L35.6424 14.8088C35.2 13.6875 34.3124 12.7999 33.1912 12.3577L31.459 11.6746C30.847 11.4331 30.847 10.5669 31.459 10.3254L33.1912 9.64229C34.3124 9.20007 35.2 8.31247 35.6424 7.19119L36.3254 5.45908Z"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  )
}

export function AIModelsIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8 32.9998C8 36.3134 10.6863 38.9998 14 38.9998C14 41.7612 16.2386 43.9998 19 43.9998C21.7614 43.9998 24 41.7612 24 38.9998C24 41.7612 26.2386 43.9996 29 43.9996C31.7614 43.9996 34 41.761 34 38.9996C37.3138 38.9996 40 36.3132 40 32.9996C40 31.8622 39.6836 30.7988 39.134 29.8926C41.9054 29.3624 44 26.9256 44 23.9996C44 21.0734 41.9054 18.6366 39.134 18.1065C39.6836 17.2002 40 16.1368 40 14.9995C40 11.6858 37.3138 8.99951 34 8.99951C34 6.23807 31.7614 3.99951 29 3.99951C26.2386 3.99951 24 6.23827 24 8.99969C24 6.23827 21.7614 3.99969 19 3.99969C16.2386 3.99969 14 6.23827 14 8.99969C10.6863 8.99969 8 11.686 8 14.9997C8 16.137 8.31644 17.2004 8.86608 18.1067C6.09454 18.6368 4 21.0736 4 23.9998C4 26.9258 6.09454 29.3626 8.86608 29.8928C8.31644 30.799 8 31.8624 8 32.9998Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M15 28.9998L18.6838 17.9484C18.8726 17.3819 19.4028 16.9998 20 16.9998C20.5972 16.9998 21.1274 17.3819 21.3162 17.9484L25 28.9998M31 16.9998V28.9998M17 24.9998H23"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SoporteIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M34 23.609C34 22.9176 34 22.572 34.104 22.264C34.4064 21.3688 35.2036 21.0216 36.0022 20.6578C36.9 20.2488 37.3488 20.0444 37.7936 20.0084C38.2986 19.9676 38.8044 20.0764 39.236 20.3186C39.8082 20.6396 40.2072 21.2498 40.6158 21.746C42.5026 24.0376 43.4458 25.1836 43.791 26.4472C44.0696 27.4668 44.0696 28.5332 43.791 29.5528C43.2876 31.3958 41.697 32.9408 40.5196 34.3708C39.9174 35.1022 39.6162 35.468 39.236 35.6814C38.8044 35.9236 38.2986 36.0324 37.7936 35.9916C37.3488 35.9556 36.9 35.7512 36.0022 35.3422C35.2036 34.9784 34.4064 34.6312 34.104 33.736C34 33.428 34 33.0824 34 32.391V23.609Z"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M14 23.6092C14 22.7388 13.9756 21.9564 13.2718 21.3444C13.0159 21.1218 12.6765 20.9672 11.9978 20.658C11.1 20.2492 10.6511 20.0448 10.2063 20.0088C8.87182 19.9008 8.15384 20.8116 7.38426 21.7464C5.4975 24.038 4.55412 25.1838 4.20892 26.4474C3.93036 27.4672 3.93036 28.5336 4.20892 29.5532C4.7124 31.3962 6.30304 32.941 7.48042 34.3712C8.22258 35.2726 8.93154 36.095 10.2063 35.992C10.6511 35.956 11.1 35.7514 11.9978 35.3426C12.6765 35.0334 13.0159 34.8788 13.2718 34.6562C13.9756 34.0442 14 33.262 14 32.3914V23.6092Z"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        opacity="0.4"
        d="M40 21V18C40 10.268 32.8366 4 24 4C15.1634 4 8 10.268 8 18V21"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M40 35C40 44 32 44 24 44"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ExpandIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        opacity="0.4"
        d="M23.9996 14C18.4767 14 13.9995 18.4771 13.9995 24C13.9995 29.5228 18.4767 34 23.9996 34C29.5224 34 33.9996 29.5228 33.9996 24C33.9996 18.4772 29.5224 14 23.9996 14Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35.4728 12.5267L42.9996 5M35.4728 12.5267C34.5936 11.6475 35.1662 8.04296 35.3928 6M35.4728 12.5267C36.352 13.4059 39.9566 12.8333 41.9996 12.6067"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5263 35.4732L4.99951 43M12.5263 35.4732C11.647 34.594 8.04247 35.1666 5.99951 35.3932M12.5263 35.4732C13.4055 36.3524 12.8328 39.957 12.6062 42"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35.4728 35.4732L42.9996 43M35.4728 35.4732C36.352 34.594 39.9566 35.1666 41.9996 35.3932M35.4728 35.4732C34.5936 36.3524 35.1662 39.957 35.3928 42"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5263 12.5267L4.99951 5M12.5263 12.5267C13.4055 11.6475 12.8328 8.04296 12.6062 6M12.5263 12.5267C11.647 13.4059 8.04247 12.8333 5.99951 12.6067"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SSOIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        opacity="0.4"
        d="M15 36C16.8337 34.0458 19.446 33.023 22.063 33.0004M26 24C26 26.2092 24.2374 28 22.063 28C19.8888 28 18.1261 26.2092 18.1261 24C18.1261 21.7908 19.8888 20 22.063 20C24.2374 20 26 21.7908 26 24Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M17 8.00391C11.7112 8.02363 8.88202 8.20855 7.05026 9.94391C5 11.8862 5 15.0124 5 21.2648V30.7384C5 36.9908 5 40.1168 7.05026 42.0592C9.1005 44.0016 12.4003 44.0016 19 44.0016H23M27 8.00391C32.2888 8.02363 35.118 8.20855 36.9498 9.94391C39 11.8862 39 15.0124 39 21.2648V23.0016"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.5443 7.26326C17.7362 6.43364 17.8322 6.01884 18.0164 5.68008C18.4457 4.89092 19.2376 4.31096 20.1828 4.0934C20.5886 4 21.0592 4 22 4C22.9408 4 23.4114 4 23.8172 4.0934C24.7624 4.31096 25.5542 4.8909 25.9836 5.68008C26.1678 6.01884 26.2638 6.43364 26.4556 7.26326L26.6222 7.98352C26.9626 9.45488 27.1328 10.1906 26.876 10.7565C26.7098 11.123 26.4264 11.4368 26.062 11.6582C25.4992 12 24.6648 12 22.9962 12H21.0038C19.3351 12 18.5008 12 17.938 11.6582C17.5735 11.4368 17.2902 11.123 17.1239 10.7565C16.8672 10.1906 17.0374 9.45488 17.3777 7.98352L17.5443 7.26326Z"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        opacity="0.4"
        d="M32.354 36.9118C32.9552 37.2004 33.7008 37.946 34.0616 38.5474C34.1818 39.389 34.7832 36.1422 37.7172 34.2182M43 36.002C43 40.4202 39.4182 44.002 35 44.002C30.5818 44.002 27 40.4202 27 36.002C27 31.5836 30.5818 28.002 35 28.002C39.4182 28.002 43 31.5836 43 36.002Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LogsIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        opacity="0.4"
        d="M34.9552 21.0002C34.97 21 34.985 21 35 21C39.9706 21 44 25.0294 44 30C44 34.9706 39.9706 39 35 39H14C8.47716 39 4 34.5228 4 29C4 23.8006 7.96796 19.5281 13.0408 19.0454M34.9552 21.0002C34.9848 20.6708 35 20.3372 35 20C35 13.9249 30.0752 9 24 9C18.2465 9 13.5247 13.4172 13.0408 19.0454M34.9552 21.0002C34.7506 23.269 33.8572 25.3392 32.4856 27M13.0408 19.0454C13.3565 19.0154 13.6765 19 14 19C16.2516 19 18.3295 19.7442 20.001 21"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 19.0454C13.4847 13.4172 18.2153 9 23.9796 9C30.066 9 35 13.9249 35 20C35 22.6592 34.0546 25.0982 32.481 27"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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

/** Teams/people icon for team management features. */
export function TeamsIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        opacity="0.4"
        d="M33 23C36.866 23 40 19.866 40 16C40 12.134 36.866 9 33 9C29.3702 9 26.3856 11.7628 26.0346 15.3003M33 23C32.2924 23 31.6094 22.895 30.9654 22.6998M33 23C39.0752 23 44 27.4772 44 33"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M15 23C11.134 23 8 19.866 8 16C8 12.134 11.134 9 15 9C18.6298 9 21.6144 11.7628 21.9654 15.3003M15 23C15.7076 23 16.3907 22.895 17.0345 22.6998M15 23C8.92486 23 4 27.4772 4 33"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 22C31 18.134 27.866 15 24 15C20.134 15 17 18.134 17 22C17 25.866 20.134 29 24 29C27.866 29 31 25.866 31 22Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 39C35 33.4772 30.0752 29 24 29C17.9249 29 13 33.4772 13 39"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Directory sync icon for Directory Sync, SIEM, Audit logs. */
export function DirectorySyncIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M30 16C30 10.4772 25.5228 6 20 6C14.4772 6 10 10.4772 10 16C10 21.5228 14.4772 26 20 26C25.5228 26 30 21.5228 30 16Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M35 42V28M28 35H42"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 40C6 32.268 12.268 26 20 26C22.9744 26 25.7324 26.9276 28 28.5094"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Onboarding icon for technical onboarding. */
export function OnboardingIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M4 44H44"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 8H20C16.6907 8 16 8.69066 16 12V44H32V12C32 8.69066 31.3094 8 28 8Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M16 26H10C6.69066 26 6 26.6906 6 30V44H16V26Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M38 26H32V44H42V30C42 26.6906 41.3094 26 38 26Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M24 8V4"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 44V40"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 30H26M22 23H26M22 16H26"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Message/chat icon for message allowance and chat features. */
export function MessageIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        opacity="0.4"
        d="M17.2563 25.3472H16.3384C13.3709 25.3472 11.8872 25.3472 11.2547 24.3688C10.6223 23.3906 11.2249 22.0276 12.4301 19.3016L16.0534 11.1065C17.1491 8.628 17.697 7.38876 18.7599 6.69438C19.8228 6 21.1718 6 23.87 6H28.0488C31.3264 6 32.9652 6 33.5832 7.0707C34.2014 8.1414 33.3884 9.57176 31.7622 12.4325L29.6184 16.2037C28.81 17.6259 28.4058 18.337 28.4114 18.919C28.4188 19.6755 28.821 20.3724 29.4708 20.754C29.9708 21.0478 30.7854 21.0478 32.4148 21.0478C34.4746 21.0478 35.5046 21.0478 36.041 21.4044C36.7378 21.8676 37.1026 22.6964 36.9748 23.5264C36.8764 24.1652 36.1836 24.9312 34.798 26.4634L23.7278 38.7046C21.5534 41.109 20.4662 42.3112 19.7361 41.9308C19.0061 41.5502 19.3567 39.9642 20.0578 36.7924L21.4314 30.5792C21.9652 28.164 22.2322 26.9562 21.5902 26.1518C20.9482 25.3472 19.7175 25.3472 17.2563 25.3472Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M20 41.9996C19.9067 41.9968 19.8191 41.974 19.7361 41.9308C19.0061 41.5502 19.3567 39.9642 20.0578 36.7924L21.4314 30.5792C21.9652 28.164 22.2322 26.9562 21.5902 26.1518C20.9482 25.3472 19.7175 25.3472 17.2563 25.3472H16.3384C13.3709 25.3472 11.8872 25.3472 11.2547 24.3688C10.6223 23.3906 11.2249 22.0276 12.4301 19.3016L16.0534 11.1065C17.1491 8.628 17.697 7.38876 18.7599 6.69438C19.8228 6 21.1718 6 23.87 6H26"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Image generation icon. */
export function ImageIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8 40C8 36.2288 8 34.3431 9.17157 33.1716C10.3431 32 12.2288 32 16 32H32C35.7712 32 37.6569 32 38.8284 33.1716C40 34.3431 40 36.2288 40 40"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M8 8C8 11.7712 8 13.6569 9.17157 14.8284C10.3431 16 12.2288 16 16 16H32C35.7712 16 37.6569 16 38.8284 14.8284C40 13.6569 40 11.7712 40 8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        opacity="0.4"
        d="M8 24H40"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        opacity="0.4"
        d="M20 24L24 28L32 20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Analytics/usage icon for Usage Analytics. */
export function AnalyticsIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M16 34V28C16 26.8954 16.8954 26 18 26H22C23.1046 26 24 26.8954 24 28V34"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 34V20C24 18.8954 24.8954 18 26 18H30C31.1046 18 32 18.8954 32 20V34"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 34V14C32 12.8954 32.8954 12 34 12H38C39.1046 12 40 12.8954 40 14V34"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M8 34V32C8 30.8954 8.89543 30 10 30H14C15.1046 30 16 30.8954 16 32V34"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.4"
        d="M4 40H44"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
