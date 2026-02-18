export function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg
      width="55"
      height="44"
      viewBox="0 0 55 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        opacity="0.4"
        d="M47.3429 32.6765V13.6961C47.3429 8.10397 47.3429 5.3079 45.6055 3.57063C43.8683 1.83337 41.0723 1.83337 35.4802 1.83337H18.8723C13.2801 1.83337 10.484 1.83337 8.74677 3.57063C7.00952 5.3079 7.00952 8.10397 7.00952 13.6961V32.6765"
        stroke="currentColor"
        strokeWidth="3.55882"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50.8642 42.1666H3.48814C2.5796 42.1666 1.98869 41.2385 2.39502 40.4499L7.00951 32.6765H47.3429L51.9573 40.4499C52.3637 41.2385 51.7727 42.1666 50.8642 42.1666Z"
        stroke="currentColor"
        strokeWidth="3.55882"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      width="30"
      height="44"
      viewBox="0 0 30 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_94_836)">
        <path
          opacity="0.4"
          d="M14.9272 36.1609H14.9475"
          stroke="currentColor"
          strokeWidth="3.03448"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.9615 1.77014H11.8925C7.12431 1.77014 4.74019 1.77014 3.25888 3.25143C1.77759 4.73275 1.77759 7.11686 1.77759 11.8851V32.115C1.77759 36.8832 1.77759 39.2672 3.25888 40.7487C4.74019 42.2299 7.12431 42.2299 11.8925 42.2299H17.9615C22.7297 42.2299 25.1138 42.2299 26.5952 40.7487C28.0764 39.2672 28.0764 36.8832 28.0764 32.115V11.8851C28.0764 7.11686 28.0764 4.73275 26.5952 3.25143C25.1138 1.77014 22.7297 1.77014 17.9615 1.77014Z"
          stroke="currentColor"
          strokeWidth="3.03448"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_94_836">
          <rect width="29.9655" height="44" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function getDeviceType(userAgent: string | null | undefined): "phone" | "laptop" {
  if (!userAgent) return "laptop";
  
  const ua = userAgent.toLowerCase();
  // Check for mobile devices
  const mobilePatterns = [
    /mobile/,
    /android/,
    /iphone/,
    /ipod/,
    /ipad/,
    /blackberry/,
    /windows phone/,
    /opera mini/,
    /iemobile/,
  ];
  
  return mobilePatterns.some((pattern) => pattern.test(ua)) ? "phone" : "laptop";
}

export function parseUserAgent(userAgent: string | null | undefined): { browser: string; os: string } {
  if (!userAgent) {
    return { browser: "Desconocido", os: "Desconocido" };
  }

  const ua = userAgent;
  let browser = "Desconocido";
  let os = "Desconocido";

  // Detect OS
  if (/iPhone|iPad|iPod/.test(ua)) {
    os = "iOS";
  } else if (/Android/.test(ua)) {
    os = "Android";
  } else if (/Windows/.test(ua)) {
    os = "Windows";
  } else if (/Mac OS X|macOS/.test(ua)) {
    os = "macOS";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  } else if (/CrOS/.test(ua)) {
    os = "Chrome OS";
  }

  // Detect browser - check for specific browsers first
  if (/Electron/.test(ua)) {
    browser = "Electron";
  } else if (/SamsungBrowser/.test(ua)) {
    browser = "Samsung Internet";
    // Samsung Internet is typically on Android, even if OS string shows Linux
    if (/Android/.test(ua) || /Mobile/.test(ua)) {
      os = "Android";
    }
  } else if (/Edg/.test(ua)) {
    browser = "Edge";
  } else if (/Firefox/.test(ua) && !/Seamonkey/.test(ua)) {
    browser = "Firefox";
  } else if (/Chrome/.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua)) {
    browser = "Chrome";
  } else if (/Safari/.test(ua) && !/Chrome|Edg/.test(ua)) {
    browser = "Safari";
  } else if (/Opera|OPR/.test(ua)) {
    browser = "Opera";
  } else if (/Brave/.test(ua)) {
    browser = "Brave";
  }

  return { browser, os };
}

export function formatLastSeen(updatedAt: string): string {
  const now = new Date();
  const lastSeen = new Date(updatedAt);
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Visto hace un momento";
  } else if (diffMins < 60) {
    return `Visto hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
  } else if (diffHours < 24) {
    return `Visto hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  } else if (diffDays < 7) {
    return `Visto hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
  } else {
    const weeks = Math.floor(diffDays / 7);
    return `Visto hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  }
}
