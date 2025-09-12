"use client";

import React, { useState } from "react";
import {
  Button,
  Callout,
  Dialog,
  Flex,
  Text,
  TextField,
} from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";

/**
 * The 'subscriptionLevel' prop is the name of the subscription plan and is directly tied to the Stripe price lookup key.
 * You will need to have a price in Stripe with the same lookup key as the subscriptionLevel.
 * See https://docs.stripe.com/products-prices/pricing-models for more details
 */
export function ModalDialog({
  subscriptionLevel,
  userId,
  buttonText = "Suscribir",
}: {
  subscriptionLevel: string;
  userId: string;
  buttonText?: string;
}) {
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubscribe = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    setLoading(true);

    if (orgName === "") {
      setError(
        "Por favor, completa el nombre de la organización antes de continuar.",
      );
      setLoading(false);
      return;
    }

    // Call API to create a new organization and subscribe to plan
    // The user will be redirected to Stripe Checkout
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        orgName,
        subscriptionLevel: subscriptionLevel.toLowerCase(),
      }),
    });

    const { error, url } = await res.json();

    if (!error) {
      return router.push(url);
    }

    setLoading(false);
    setError(`Error al suscribirse al plan: ${error}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button
          onClick={() => setError("")}
          className="w-full mt-6 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors duration-200"
        >
          {buttonText}
        </button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Suscribirse a {subscriptionLevel}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Ingresa los detalles de tu empresa
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Nombre de la organización
            </Text>
            <TextField.Root
              placeholder="Ingresa el nombre de tu organización"
              onBlur={(e) => setOrgName(e.target.value)}
            />
          </label>
          {error && (
            <Callout.Root color="red">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancelar
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button loading={loading} onClick={handleSubscribe}>
              Suscribir
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
