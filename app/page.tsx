import Script from "next/script";
import {
  HeroSection,
  IntegrationsSection,
  ArchitectureSection,
  Navbar,
  WhatIsRIFTSection,
  PerformanceSection,
  Footer,
  CTASection,
  PricingSection,
  FaqSection,
} from "@/components/landing";
import { landingPlans } from "@/components/landing/data/pricing";
import { faqs } from "@/components/landing/data/faqs";

const deploymentDomain =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL;

const defaultSiteUrl = "https://rift.mx";
const siteUrl = deploymentDomain
  ? deploymentDomain.startsWith("http")
    ? deploymentDomain
    : `https://${deploymentDomain}`
  : defaultSiteUrl;

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RIFT",
  url: siteUrl,
  logo: new URL("/opengraph-image.png", siteUrl).toString(),
  sameAs: ["https://compound.com.mx"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      email: "sales@rift.mx",
      contactType: "sales",
      areaServed: "Worldwide",
      availableLanguage: ["es", "en"],
    },
    {
      "@type": "ContactPoint",
      email: "contact@rift.mx",
      contactType: "customer support",
      areaServed: "Worldwide",
      availableLanguage: ["es", "en"],
    },
  ],
};

const softwareApplicationStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RIFT",
  operatingSystem: "Web",
  applicationCategory: "BusinessApplication",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "112",
  },
  offers: landingPlans.map((plan) => ({
    "@type": "Offer",
    price: plan.priceAmount ?? undefined,
    priceCurrency: plan.currency,
    availability: "https://schema.org/InStock",
    url: new URL(plan.href, siteUrl).toString(),
    category: plan.name,
    description: plan.description,
    eligibleRegion: "Worldwide",
    priceSpecification:
      plan.priceAmount !== null
        ? {
            "@type": "UnitPriceSpecification",
            priceCurrency: plan.currency,
            price: plan.priceAmount,
            billingIncrement: plan.billingPeriodLabel ? 1 : undefined,
            unitCode: plan.billingPeriodLabel === "mes" ? "MON" : undefined,
          }
        : undefined,
  })),
};

const whatIsRiftStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "¿Qué es RIFT?",
  url: new URL("/#about", siteUrl).toString(),
  description:
    "RIFT es la plataforma global que reúne modelos de OpenAI, Anthropic, Google, Mistral, DeepSeek y más en una sola interfaz enfocada a escuelas, empresas y profesionales.",
  isPartOf: siteUrl,
  inLanguage: "es",
  about: {
    "@type": "SoftwareApplication",
    name: "RIFT",
    applicationCategory: "BusinessApplication",
    offers: softwareApplicationStructuredData.offers,
    },
  mainEntity: {
    "@type": "Organization",
    name: "RIFT",
    areaServed: "Worldwide",
  },
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-amber-100 selection:text-amber-900 dark:selection:bg-amber-900 dark:selection:text-amber-50 overflow-x-hidden">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg dark:focus:bg-slate-900"
      >
        Saltar al contenido principal
      </a>

      <Navbar />

      <main
        id="contenido-principal"
        className="max-w-5xl mx-auto px-4 mt-28 sm:px-6 lg:px-8 space-y-20 md:space-y-32"
        role="main"
      >
        <HeroSection />
        <WhatIsRIFTSection />
        <PricingSection />
        <ArchitectureSection />
        <PerformanceSection />
        <IntegrationsSection />
        <FaqSection />
        <CTASection />
      </main>

      <Footer />

      <Script id="rift-org-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(organizationStructuredData)}
      </Script>
      <Script id="rift-software-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(softwareApplicationStructuredData)}
      </Script>
      <Script id="rift-about-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(whatIsRiftStructuredData)}
      </Script>
      <Script id="rift-faq-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(faqStructuredData)}
      </Script>
    </div>
  );
}
