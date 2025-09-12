"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ModalDialog, DirectSubscribeButton } from "./modal-dialog";

interface SubscriptionButtonProps {
  subscriptionLevel: string;
  userId: string;
  buttonText?: string;
}

export function SubscriptionButton({
  subscriptionLevel,
  userId,
  buttonText = "Suscribir",
}: SubscriptionButtonProps) {
  const currentOrgPlan = useQuery(api.organizations.getCurrentOrganizationPlan);

  // If still loading the organization data, show loading state
  if (currentOrgPlan === undefined) {
    return (
      <button
        disabled
        className="w-full mt-6 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed transition-colors duration-200"
      >
        Cargando...
      </button>
    );
  }

  // If user has an organization (currentOrgPlan is not null), show direct subscribe button
  if (currentOrgPlan !== null) {
    return (
      <DirectSubscribeButton
        subscriptionLevel={subscriptionLevel}
        userId={userId}
        buttonText={buttonText}
      />
    );
  }

  // If user doesn't have an organization (currentOrgPlan is null), show modal dialog for org creation
  return (
    <ModalDialog
      subscriptionLevel={subscriptionLevel}
      userId={userId}
      buttonText={buttonText}
    />
  );
}
