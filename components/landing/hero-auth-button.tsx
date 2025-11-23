"use client";

import Link from "next/link";
import { Button } from "@/components/ai/ui/button";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export default function HeroAuthButton() {
  return (
    <>
      <AuthLoading>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </AuthLoading>
      
      <Authenticated>
        <Button asChild variant="accent" size="lg" className="font-semibold rounded-lg">
          <Link href="/chat" className="font-semibold">Ir al chat</Link>
        </Button>
      </Authenticated>
      
      <Unauthenticated>
        <Button asChild variant="accent" size="lg" className="font-semibold">
          <Link href="/#pricing" className="font-semibold">Suscribirse</Link>
        </Button>
      </Unauthenticated>
    </>
  );
}

