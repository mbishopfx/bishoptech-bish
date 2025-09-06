"use client";

import Link from "next/link";
import { Button } from "@/components/ai/ui/button";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export default function NavbarAuthButtons() {

  return (
    <div className="flex items-center space-x-4">
      <AuthLoading>
        <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse" />
      </AuthLoading>
      
      <Authenticated>
        <Link href="/chat">
          <Button
            size="sm"
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            Ir a chat
          </Button>
        </Link>
      </Authenticated>
      
      <Unauthenticated>
        <div className="flex items-center space-x-4">
          <Link
            href="/sign-in"
            className="text-gray-600 hover:text-accent font-medium text-sm transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link href="/sign-up">
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-medium text-sm"
            >
              Registrarse
            </Button>
          </Link>
        </div>
      </Unauthenticated>
    </div>
  );
}
