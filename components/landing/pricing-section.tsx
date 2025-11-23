"use client";

import { Button } from "@/components/ai/ui/button";
import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import {
  StandarIcon,
  PremiumIcon,
  AIModelsIcon,
  SoporteIcon,
  ExpandIcon,
  SSOIcon,
  LogsIcon,
} from "@/components/ui/icons/landing-icons";
import { Scim, RedoIcon } from "@/components/ui/icons/svg-icons";
import { landingPlans } from "@/components/landing/data/pricing";

const priceFormatters: Record<string, Intl.NumberFormat> = {};

function formatPrice(amount: number, currency: string) {
  if (!priceFormatters[currency]) {
    priceFormatters[currency] = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
  }
  return priceFormatters[currency].format(amount);
}

function getFeatureIcon(feature: string) {
  const lowerFeature = feature.toLowerCase();

  if (lowerFeature.includes("mensajes estándar")) return StandarIcon;
  if (lowerFeature.includes("mensajes premium")) return PremiumIcon;
  if (lowerFeature.includes("modelos")) return AIModelsIcon;
  if (lowerFeature.includes("historial")) return RedoIcon;
  if (lowerFeature.includes("soporte")) return SoporteIcon;
  if (lowerFeature.includes("límites")) return ExpandIcon;
  if (lowerFeature.includes("sso")) return SSOIcon;
  if (lowerFeature.includes("logs")) return LogsIcon;
  if (lowerFeature.includes("seicm")) return Scim;
  if (lowerFeature.includes("sla")) return ShieldCheck;

  return Check;
}

export default function PricingSection() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const handlePlanSelection = (planName: string) => {
    const searchParams = new URLSearchParams({
      plan: planName.toLowerCase(),
    }).toString();

    if (isAuthenticated) {
      router.push(`/subscribe?${searchParams}`);
    } else {
      router.push(`/sign-up?${searchParams}`);
    }
  };

  return (
    <section
      className="flex w-full flex-col items-center scroll-mt-20 pt-24 md:pt-0"
      id="pricing"
      aria-labelledby="pricing-heading"
      aria-describedby="pricing-summary"
    >
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12 md:mb-0">
        <h2
          id="pricing-heading"
          className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:text-white"
        >
          Planes Simples y Transparentes
        </h2>
        <p
          id="pricing-summary"
          className="max-w-[700px] text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/0.6)] dark:text-zinc-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
        >
          Elige el plan que mejor se adapte a tus necesidades.<br /> Sin costos ocultos.
        </p>
      </div>

      <div className="max-md:px-4 max-md:py-4 max-lg:p-4 relative w-full lg:p-12 max-w-[1082px]">
        {/* Top border */}
        <div className="max-lg:top-3.5 absolute inset-x-0 top-12 flex w-full items-center justify-center">
          <svg width="100%" height="1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="inline-block h-auto w-full will-change-transform max-w-[1082px]">
            <line x1="0" y1="0.5" x2="100%" y2="0.5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.12" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" className="stroke-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:stroke-white" />
          </svg>
        </div>

        {/* Left border */}
        <div className="max-lg:left-3.5 absolute inset-y-0 left-12 flex h-full items-center justify-center">
          <svg width="1" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="inline-block h-full max-w-full will-change-transform">
            <line x1="0.5" y1="0" x2="0.5" y2="100%" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.12" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" className="stroke-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:stroke-white" />
          </svg>
        </div>

        {/* Content container */}
        <div className="max-lg:h-auto max-lg:flex-col relative flex w-full items-stretch justify-center gap-8 lg:gap-0 overflow-hidden">
          {landingPlans.map((plan, index) => {
            const formattedPrice = plan.priceAmount !== null ? formatPrice(plan.priceAmount, plan.currency) : "Custom";
            const period = plan.billingPeriodLabel ? `/${plan.billingPeriodLabel}` : "";
            return (
            <div key={plan.name} className="contents">
              {index > 0 && <VerticalDivider />}
              <article
                aria-labelledby={`plan-${plan.name.toLowerCase()}-title`}
                className="relative z-[2] flex w-full flex-col items-center gap-6 px-6 py-12"
              >
                <GradientBackground id={plan.gradientId} />

                {plan.popular && (
                  <div className="absolute top-4 px-3 py-1 bg-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] text-white dark:bg-white dark:text-black text-xs font-bold rounded-full uppercase tracking-wide">
                    Más Popular
                  </div>
                )}

                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <h3 id={`plan-${plan.name.toLowerCase()}-title`} className="text-2xl font-medium leading-6 tracking-tight text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:text-white">
                    <span className="text-4xl font-bold tracking-tight">
                      {formattedPrice}
                    </span>
                    {period && plan.priceAmount !== null && (
                      <span className="ml-1 text-sm font-medium opacity-60">
                        {period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-6 tracking-tight text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/0.6)] dark:text-zinc-400 max-w-[280px]">
                    {plan.description}
                  </p>
                </div>

                <ul className="flex-1 space-y-4 w-full max-w-[280px]" aria-label={`Características del plan ${plan.name}`}>
                  {plan.features.map((feature) => {
                    const Icon = getFeatureIcon(feature);
                    return (
                      <li
                        key={feature}
                        className="flex items-center text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/0.8)] dark:text-zinc-300"
                      >
                        <div className="mr-3 shrink-0">
                          <Icon className="h-5 w-5 text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:text-white opacity-80" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    );
                  })}
                </ul>

                <footer className="w-full max-w-[280px] mt-auto">
                  {plan.name !== "Enterprise" ? (
                    <Button
                      onClick={() => handlePlanSelection(plan.name)}
                      className="hover:bg-white hover:text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] hover:shadow-[rgba(0,0,0,0.1)_0px_0px_0px_1px] relative flex w-full cursor-pointer select-none items-center justify-center whitespace-nowrap bg-white text-sm leading-4 tracking-normal duration-[0.17s] text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 shadow-[rgba(0,0,0,0.05)_0px_0px_0px_1px] rounded-[50px] h-10 border-none"
                    >
                      {plan.buttonText}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="hover:bg-white hover:text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] hover:shadow-[rgba(0,0,0,0.1)_0px_0px_0px_1px] relative flex w-full cursor-pointer select-none items-center justify-center whitespace-nowrap bg-white text-sm leading-4 tracking-normal duration-[0.17s] text-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 shadow-[rgba(0,0,0,0.05)_0px_0px_0px_1px] rounded-[50px] h-10 border-none"
                    >
                      <Link href={plan.href}>{plan.buttonText}</Link>
                    </Button>
                  )}
                </footer>
              </article>
          </div>
          );
        })}
        </div>

        {/* Right border */}
        <div className="max-lg:top-0 max-lg:right-4 max-lg:bottom-auto max-lg:z-[11] absolute inset-y-0 right-12 flex h-full items-center justify-center">
          <svg width="1" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="inline-block h-full max-w-full will-change-transform">
            <line x1="0.5" y1="0" x2="0.5" y2="100%" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.12" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" className="stroke-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:stroke-white" />
          </svg>
        </div>

        {/* Bottom border */}
        <div className="max-lg:bottom-3.5 absolute inset-x-0 bottom-12 flex w-full items-center justify-center">
          <svg width="100%" height="1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="inline-block h-auto w-full will-change-transform max-w-[1082px]">
            <line x1="0" y1="0.5" x2="100%" y2="0.5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.12" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" className="stroke-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:stroke-white" />
          </svg>
        </div>
      </div>
    </section>
  );
}

function GradientBackground({ id }: { id: string }) {
  const gradients = {
    "1": (
      <>
        <rect width="300" height="300" fill="url(#paint0_radial_262_665)" />
        <rect width="300" height="300" fill="url(#paint1_radial_262_665)" />
        <rect width="300" height="300" fill="url(#paint2_radial_262_665)" />
        <rect width="300" height="300" fill="url(#paint3_radial_262_665)" />
        <defs>
          <radialGradient id="paint0_radial_262_665" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(117 300) rotate(-90) scale(181)">
            <stop stopColor="#5767C2" stopOpacity="0.1" />
            <stop offset="1" stopColor="#5767C2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="paint1_radial_262_665" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(199 79.5) rotate(-180) scale(142.5)">
            <stop stopColor="#FF6D2E" stopOpacity="0.07" />
            <stop offset="1" stopColor="#FF6D2E" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="paint2_radial_262_665" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(331 243.5) rotate(-180) scale(208)">
            <stop stopColor="#2CC256" stopOpacity="0.1" />
            <stop offset="1" stopColor="#2CC256" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="paint3_radial_262_665" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-94 71) scale(150)">
            <stop stopColor="#2CC256" stopOpacity="0.1" />
            <stop offset="1" stopColor="#2CC256" stopOpacity="0" />
          </radialGradient>
        </defs>
      </>
    ),
    "2": (
      <>
        <rect width="300" height="300" transform="matrix(-1 8.74228e-08 8.74228e-08 1 300 0)" fill="url(#paint0_radial_262_666)" />
        <rect width="300" height="300" transform="matrix(-1 8.74228e-08 8.74228e-08 1 300 0)" fill="url(#paint1_radial_262_666)" />
        <rect width="300" height="300" transform="matrix(-1 8.74228e-08 8.74228e-08 1 300 0)" fill="url(#paint2_radial_262_666)" />
        <rect width="300" height="300" transform="matrix(-1 8.74228e-08 8.74228e-08 1 300 0)" fill="url(#paint3_radial_262_666)" />
        <rect width="300" height="300" transform="matrix(-1 8.74228e-08 8.74228e-08 1 300 0)" fill="url(#paint4_radial_262_666)" />
        <defs>
          <radialGradient id="paint0_radial_262_666" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(300 243.5) rotate(-155.81) scale(205)">
            <stop stopColor="#2CC256" stopOpacity="0.1" />
            <stop offset="1" stopColor="#2CC256" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="paint1_radial_262_666" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="rotate(38.6107) scale(273.226)">
            <stop stopColor="#2CC256" stopOpacity="0.1" />
            <stop offset="1" stopColor="#2CC256" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="paint2_radial_262_666" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(103 383) rotate(-89.3415) scale(174.011)">
            <stop stopColor="#FAC507" stopOpacity="0.1" />
            <stop offset="1" stopColor="#FAC507" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="paint3_radial_262_666" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-50 242.5) scale(147.5)">
            <stop stopColor="#CD81F3" stopOpacity="0.07" />
            <stop offset="1" stopColor="#CD81F3" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="paint4_radial_262_666" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(425.5 62) rotate(-178.961) scale(193.032)">
            <stop stopColor="#FF6D2E" stopOpacity="0.07" />
            <stop offset="1" stopColor="#FF6D2E" stopOpacity="0" />
          </radialGradient>
        </defs>
      </>
    ),
    "3": (
      <>
        <path fill="url(#a)" d="M0 300h300V0H0v300Z" />
        <path fill="url(#b)" d="M0 300h300V0H0v300Z" />
        <path fill="url(#c)" d="M0 300h300V0H0v300Z" />
        <path fill="url(#d)" d="M0 300h300V0H0v300Z" />
        <radialGradient id="a" cx="0" cy="0" r="1" gradientTransform="matrix(0 181 -181 0 183 0)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5767C2" stopOpacity=".1" />
          <stop offset="1" stopColor="#5767C2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="b" cx="0" cy="0" r="1" gradientTransform="translate(101 220.5) scale(142.5)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6D2E" stopOpacity=".07" />
          <stop offset="1" stopColor="#FF6D2E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="c" cx="0" cy="0" r="1" gradientTransform="matrix(208 0 0 208 -31 56.5)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2CC256" stopOpacity=".1" />
          <stop offset="1" stopColor="#2CC256" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="d" cx="0" cy="0" r="1" gradientTransform="matrix(-150 0 0 -150 394 229)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2CC256" stopOpacity=".1" />
          <stop offset="1" stopColor="#2CC256" stopOpacity="0" />
        </radialGradient>
      </>
    ),
  };

  return (
    <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 inline-block h-full w-full will-change-transform z-[-1]">
      {gradients[id as keyof typeof gradients]}
    </svg>
  );
}

function VerticalDivider() {
  return (
    <div className="relative z-[2] hidden h-auto min-w-[24px] w-6 bg-white dark:bg-background lg:flex">
      <div className="absolute inset-y-0 right-0 flex h-full items-center justify-center">
        <svg width="1" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="inline-block h-full max-w-full will-change-transform">
          <line x1="0.5" y1="0" x2="0.5" y2="100%" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.12" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" className="stroke-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:stroke-white" />
        </svg>
      </div>
      <div className="absolute inset-y-0 left-0 flex h-full items-center justify-center">
        <svg width="1" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="inline-block h-full max-w-full will-change-transform">
          <line x1="0.5" y1="0" x2="0.5" y2="100%" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.12" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" className="stroke-[color(display-p3_0.1725490196_0.1764705882_0.1882352941/1)] dark:stroke-white" />
        </svg>
      </div>
    </div>
  );
}
