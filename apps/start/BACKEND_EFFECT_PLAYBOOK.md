# Backend Effect Playbook (TanStack Start)

This document is the canonical implementation guide for backend code in `apps/start`.

Primary source of Effect style:
- `reference/effect-smol/LLMS.md`

Use this playbook for all new backend services, features, and refactors.

## 1. Core Rules

1. Write effectful methods with `Effect.fn("Service.method")`.
2. Use `Effect.gen` for imperative flow; use combinators for typed recovery (`catchTag`, `catchTags`, `mapError`).
3. Define services with `ServiceMap.Service<...>()("namespace/Service")`.
4. Expose service implementations as static class properties:
- `Service.layer`
- `Service.layerMemory` (test-only)
- `Service.layerNoop` (explicit noop behavior)
5. Do not create `*Live`/`*Memory` free-floating layer constants.
6. Do not use `namespace` wrappers for service layers.
7. Keep server-only runtime wiring in `runtime/*-runtime.ts` and execute via shared `makeRuntimeRunner`.
8. Keep route/server-function files thin. Business logic belongs in services.
9. Use tagged domain errors (`Schema.TaggedErrorClass`) and preserve typed error channels.
10. Reuse cross-cutting helpers from `src/lib/server-effect` instead of re-implementing runtime/auth/db checks.

## 2. Required Folder Shape

For each backend domain (example: `chat-backend`, `file-backend`, `byok`), use:

- `domain/`
- `http/`
- `runtime/`
- `services/`

For large services, split internals:

- `services/<service-name>/helpers.ts`
- `services/<service-name>/operations/<operation>.ts`

Guideline:
- If service file exceeds ~300-400 lines or mixes multiple workflows, split into operation modules.

## 3. Service Template

```ts
import { Effect, Layer, ServiceMap } from 'effect'

export type ExampleServiceShape = {
  readonly doThing: (input: { readonly id: string }) => Effect.Effect<void, ExampleError>
}

export class ExampleService extends ServiceMap.Service<
  ExampleService,
  ExampleServiceShape
>()('example/ExampleService') {
  static readonly layer = Layer.succeed(this, {
    doThing: Effect.fn('ExampleService.doThing')(({ id }) =>
      Effect.gen(function* () {
        // implementation
      }),
    ),
  })
}
```

## 4. Runtime Template

Use one runtime per backend domain:

- `src/lib/<domain>/runtime/<domain>-runtime.ts`

```ts
import { Layer } from 'effect'
import { makeRuntimeRunner } from '@/lib/server-effect'

const layer = Layer.mergeAll(
  DepA.layer,
  DepB.layer,
  FeatureService.layer,
)

const runtime = makeRuntimeRunner(layer)

export const DomainRuntime = {
  layer,
  run: runtime.run,
  runExit: runtime.runExit,
  dispose: runtime.dispose,
}
```

Rules:
1. No `run-*-effect.ts` files.
2. No `runtime/live.ts` files.
3. Runtime composition must be centralized in `*-runtime.ts`.
4. `ServerRuntime` is allowed for route-level programs that only need
framework-boundary helpers (for example auth extraction) and no domain services.
5. Do not create one-off per-route runtimes when `ServerRuntime` already covers
the route requirements.

## 5. Route and Server Function Boundaries

### Route handlers

- Parse request/auth/transport concerns only.
- Build one domain `program` effect.
- Execute with `<Domain>Runtime.run(program)`.
- Use shared failure mappers for response envelopes.

### `createServerFn` handlers

- Keep handlers thin.
- Avoid static imports of `*.server.*` inside client-reachable files.
- If needed, dynamically import server module inside `.handler(...)`.

## 6. Error Design

1. Define explicit tagged domain errors per failure mode.
2. Keep errors close to domain in `domain/errors.ts`.
3. Map infrastructure errors once at boundaries.
4. Prefer `catchTag`/`catchTags` over broad catch-all remapping.
5. Include stable fields (`message`, `requestId`, plus domain context).

## 7. Shared Infrastructure Rules

1. Database access must go through `ZeroDatabaseService` (or domain helper wrapping it).
2. Avoid repeated `if (!db)` checks in multiple operations.
3. Use shared auth extraction helpers in `server-effect/http`:
- `requireUserAuth(...)` for user-scoped routes/services.
- `requireOrgAuth(...)` for organization-scoped routes/services.
4. Fire-and-forget behavior must use `server-effect/runtime/detached` helpers.
5. Managed runtime execution must use `server-effect/runtime/runtime-runner`.
6. Plain async adapter modules (for example provider SDK wrappers, vector DB
clients, content pipelines) are allowed when they are:
- side-effect/infrastructure focused (not domain orchestration),
- called from Effect services,
- wrapped at call sites with `Effect.tryPromise` / `Effect.try`.

## 8. Observability and Telemetry

1. Emit structured events for domain failures and important transitions.
2. Keep telemetry mapping in dedicated modules (for example `services/<service>/failure-telemetry.ts`).
3. Avoid ad-hoc `console.*` in domain services.

## 9. Testing Requirements

For backend features, add/maintain:

1. Service behavior tests (happy path + typed failure path).
2. Command/input normalization tests (if route/server input is normalized).
3. Runtime runner tests where new runtime behavior is introduced.
4. At least one integration-style flow test through orchestrator/runtime boundary.

Use memory/noop layers for deterministic tests (`layerMemory`, `layerNoop`).

## 10. Code Review Checklist (Must Pass)

1. Service methods are `Effect.fn` with stable names.
2. No `*Live` free constants and no service `namespace` wrappers.
3. Runtime is composed in one `*-runtime.ts` with `Layer.mergeAll`.
4. Routes/server functions are thin and call runtime `run`.
5. Tagged domain errors are explicit and mapped intentionally.
6. Reusable infra concerns use `server-effect` helpers.
7. Large services are split into operation modules.
8. Lint/tests pass for touched backend modules.

## 11. Anti-Patterns (Do Not Add)

1. Mixing server-only imports into client-reachable modules.
2. Repeating infra guards in many operations.
3. Unstructured error remapping (`catch` everything to one generic error).
4. Huge single-file orchestrators/persistence services with unrelated branches.
5. Multiple competing runtime entry points for same backend domain.
6. Calling async infrastructure helpers directly from routes instead of through
Effect services and runtime-executed programs.
