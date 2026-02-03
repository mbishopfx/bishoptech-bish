"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getAutumnBillingPortalUrl } from "@/actions/getAutumnBillingPortalUrl";

export function BillingButton({ workosId }: { workosId?: string }) {
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    if (!workosId) return;

    setLoading(true);
    try {
      const returnUrl = typeof window !== "undefined" ? window.location.href : undefined;
      const result = await getAutumnBillingPortalUrl(workosId, returnUrl);

      if ("error" in result) {
        console.error("Autumn billing portal error:", result.error);
        alert("No se pudo acceder al portal de facturación. Por favor intenta más tarde.");
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to redirect to billing portal:", error);
      alert("No se pudo acceder al portal de facturación. Por favor intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  if (!workosId) return null;

  return (
    <button
      onClick={handleManageBilling}
      disabled={loading}
      className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Cargando...
        </>
      ) : (
        "Gestionar Suscripción"
      )}
    </button>
  );
}
