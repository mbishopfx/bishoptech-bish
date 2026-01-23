"use client";

import Link from "next/link";
import { Button } from "@/components/ai/ui/button";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export default function HeroAuthButton() {
  return (
    <>
      <AuthLoading>
        <Button variant="accent" size="lg" className="font-semibold text-white pointer-events-none" disabled>
          <span className="invisible">Suscribirse</span>
        </Button>
      </AuthLoading>
      
      <Authenticated>
        <Button asChild variant="accent" size="lg" className="font-semibold text-white">
          <Link href="/chat">Ir al chat</Link>
        </Button>
      </Authenticated>
      
      <Unauthenticated>
        <Button asChild variant="accent" size="lg" className="font-semibold text-white">
          <Link href="/#pricing">Suscribirse</Link>
        </Button>
      </Unauthenticated>
    </>
  );
}

