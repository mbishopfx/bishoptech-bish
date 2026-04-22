# ARCH3R Marketplace and Plugins

ARCH3R uses a plugin activation model so a single deployment can serve different customer needs without forcing every org into the same left-rail experience.

## Plugin model

Every plugin has:

- a global installed definition in code
- org-scoped entitlement state
- org-scoped activation state
- readiness/config state
- left-rail visibility state

This means a feature can exist in the platform without automatically cluttering every organization’s workspace.

## Current plugin lanes

### Core activatable tools

- `Projects`
- `Ticket Triage`

These are free core tools that still use the same activation mechanics as paid plugins.

### Paid or gated campaign tools

- `Social Publishing`
- `Voice Campaigns`
- `SMS Campaigns`

These remain gated by both:

- entitlement
- readiness

An org should not see a tool as usable if billing is present but configuration is missing.

### System surfaces

- `Plugin Marketplace`
- `Operator`

These are control surfaces for activation and workspace oversight.

## Why this model is valuable

- New features can ship globally without forcing immediate adoption.
- Paid add-ons can be activated only for customers who purchase them.
- Org admins can keep the workspace focused on what their team actually uses.
- The platform can grow without turning the product into a cluttered all-tools dashboard.

## Readiness model

A plugin can be:

- `ready`
- `needs_configuration`
- `needs_linked_account`
- `needs_entitlement`

That makes admin setup actionable instead of vague.

## Activation flow

1. The feature ships globally in the platform catalog.
2. The org becomes entitled through plan or add-on access.
3. The org completes the required configuration in the Integration Wizard.
4. The org admin activates the plugin.
5. The plugin appears in the left rail.

## Marketplace design intent

The marketplace is not meant to feel like a toy app store. It is a controlled operations catalog:

- what this org can activate
- what is blocked
- what is ready
- what still needs billing or configuration

That lets ARCH3R evolve into a larger suite without losing clarity.
