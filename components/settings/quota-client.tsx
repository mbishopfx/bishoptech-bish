"use client";

import { usePreloadedQuery, Preloaded, Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Progress } from "@/components/ai/ui/progress";

interface QuotaData {
  currentUsage: number;
  limit: number;
  quotaConfigured: boolean;
}

type QuotaInfo = {
  standard: QuotaData;
  premium: QuotaData;
  nextResetDate?: number;
} | null;

function QuotaCard({ type, data }: { type: "standard" | "premium"; data: QuotaData }) {
  const title = type === "standard" ? "Standard" : "Premium";
  const { currentUsage, limit, quotaConfigured } = data;
  
  if (!quotaConfigured) {
    return (
      <div className="border border-gray-200 dark:border-border bg-white dark:bg-popover-secondary rounded-lg p-4">
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-text-muted">Cuota no configurada</p>
          <p className="text-sm text-muted-foreground">Contacta al administrador para configurar límites.</p>
        </div>
      </div>
    );
  }

  const percentage = limit > 0 ? Math.min((currentUsage / limit) * 100, 100) : 0;
  const isUnlimited = limit === 0;
  const remaining = isUnlimited ? "Ilimitado" : limit - currentUsage;

  return (
    <div className="border border-gray-200 dark:border-border bg-white dark:bg-popover-secondary rounded-lg p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          {!isUnlimited && (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentUsage}/{limit} usado
            </p>
          )}
          {isUnlimited && (
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">Ilimitado</p>
          )}
          <p className="text-sm font-medium text-gray-500 dark:text-text-muted">
            {remaining} mensajes restantes
          </p>
        </div>
        <div className="space-y-2">
          {!isUnlimited ? (
            <Progress value={percentage} className="w-full h-2 [&>div]:bg-accent" />
          ) : (
            <div className="w-full h-2 bg-green-200 dark:bg-green-800 rounded-full">
              <div className="h-2 bg-green-500 dark:bg-green-400 rounded-full w-full"></div>
            </div>
          )}
          {!isUnlimited && (
            <p className="text-xs text-gray-500 dark:text-text-muted">
              {percentage.toFixed(0)}% utilizado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NextResetDate({ nextResetDate }: { nextResetDate?: number }) {
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "No disponible";
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="text-sm text-gray-600 dark:text-text-muted">
      <strong>Próximo Reinicio:</strong>{" "}
      <span className="text-gray-900 dark:text-white">{formatDate(nextResetDate)}</span>
    </div>
  );
}

export function QuotaClient({ 
  preloadedQuotaInfo 
}: { 
  preloadedQuotaInfo: Preloaded<typeof api.users.getUserFullQuotaInfo> 
}) {
  const { isAuthenticated } = useConvexAuth();

  // Extract the SSR snapshot without resuming a live query on the client
  const snapshot = (preloadedQuotaInfo as unknown as {
    _valueJSON?: QuotaInfo;
  })?._valueJSON ?? null;

  const renderQuotaView = (info: NonNullable<QuotaInfo>) => {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <QuotaCard 
            type="standard" 
            data={info.standard} 
          />
          <QuotaCard 
            type="premium" 
            data={info.premium} 
          />
        </div>
        
        <div className="border border-gray-200 dark:border-border bg-white dark:bg-popover-secondary rounded-lg p-6">
          <NextResetDate 
            nextResetDate={info.nextResetDate} 
          />
        </div>

        <div className="p-6">
          <div className="flex items-start space-x-3">
            <div className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Cómo funcionan las cuotas</h4>
              <ul className="text-sm text-gray-600 dark:text-text-muted space-y-2 list-disc pl-5">
                <li>Cada mensaje enviado consume 1 crédito del tipo de mensaje correspondiente (Standard y Premium para modelos avanzados).</li>
                <li>Las cuotas se reinician automáticamente al inicio del ciclo de tu organización.</li>
                <li>Cada llamada a herramientas (como búsqueda web) realizada por la IA consume 1 crédito del plan Standard.</li>
                <li>Los modelos de IA pueden realizar multiples llamadas a herramientas en un solo mensaje o ninguna dependiendo de la tarea que se le pida.</li>
                <li>Si alcanzas el límite, no podrás enviar más mensajes para el tipo de mensaje correspondiente hasta el próximo ciclo.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const QuotaReactive = ({ preloaded }: { preloaded: Preloaded<typeof api.users.getUserFullQuotaInfo> }) => {
    // Safe to call only when authenticated via wrapper
    const liveInfo = usePreloadedQuery(preloaded);

    if (liveInfo === null) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No se pudo cargar la información de cuotas.
        </div>
      );
    }

    return renderQuotaView(liveInfo);
  };

  return (
    <div className="space-y-0">
      <AuthLoading>
        {snapshot ? renderQuotaView(snapshot) : (
          <div className="text-center py-12 text-muted-foreground">Cargando...</div>
        )}
      </AuthLoading>

      <Authenticated>
        <QuotaReactive preloaded={preloadedQuotaInfo} />
      </Authenticated>

      <Unauthenticated>
        {snapshot ? (
          renderQuotaView(snapshot)
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No estás autenticado. Por favor, inicia sesión.
          </div>
        )}
      </Unauthenticated>
    </div>
  );
}
