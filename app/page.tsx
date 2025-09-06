import {
  PricingSection,
  HeroSection,
  IntegrationsSection,
  KnowledgeCenterSection,
  ArchitectureSection,
  ModelsShowcase,
  Navbar,
  WhatIsLoopSection,
  PerformanceSection,
  Footer,
  CTASection,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <Navbar />

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 mt-20 sm:px-6 lg:px-8 space-y-24 ">
        <HeroSection />
        <ModelsShowcase />
      </div>

      {/* Full-width WhatIsLoopSection */}
      <div className="w-full">
        <WhatIsLoopSection />
      </div>

      {/* Main Content Container - Continue */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        <ArchitectureSection />
        <PerformanceSection />
        <KnowledgeCenterSection />
        <IntegrationsSection />
        <PricingSection />
        <CTASection />
        </div>
      {/* Footer */}
      <Footer />
    </div>
  );
}
