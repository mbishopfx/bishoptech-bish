Welcome to your new TanStack Start app! 

# Getting Started

To run this application:

```bash
bun install
bun --bun run dev
```

# Building For Production

To build this application for production:

```bash
bun --bun run build
```

## File Upload + Markdown Conversion

This app can convert supported uploaded files (PDF, images, Office docs, HTML/XML, CSV, ODF, Numbers) to markdown before sending chat requests, so models without native file handling can still answer from document context.

Required server environment variables:

- `UPLOAD_STORAGE_PROVIDER`: `cloudflare_r2` (default) or `s3_compatible`.
- Cloudflare R2 mode (`UPLOAD_STORAGE_PROVIDER=cloudflare_r2`):
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_BASE_URL` (public bucket domain such as `https://pub-<id>.r2.dev` or your custom CDN/domain)
- S3-compatible mode (`UPLOAD_STORAGE_PROVIDER=s3_compatible`, includes Railway buckets):
  - `S3_ENDPOINT` (or Railway `ENDPOINT`)
  - `S3_ACCESS_KEY_ID` (or Railway `ACCESS_KEY_ID`)
  - `S3_SECRET_ACCESS_KEY` (or Railway `SECRET_ACCESS_KEY`)
  - `S3_BUCKET_NAME` (or Railway `BUCKET`)
  - `S3_REGION` (or Railway `REGION`, defaults to `auto`)
  - `S3_PUBLIC_BASE_URL` (optional override when serving files from an external public domain)
  - If omitted in `s3_compatible`, the app defaults to `${BETTER_AUTH_URL}/api/files/object` (signed first-party proxy).

Markdown worker (separate from storage provider):
- `CF_MARKDOWN_WORKER_URL`: URL for your Worker (base URL or `/convert` endpoint).
- `CF_MARKDOWN_WORKER_TOKEN`: shared secret used to authenticate app -> Worker calls.
- `BYOK_ENCRYPTION_KEY_B64` (required when org BYOK is enabled): base64-encoded 32-byte key used for AES-256-GCM encryption of org provider API keys at rest.
- `CF_MARKDOWN_MAX_CHARS` (optional): max markdown characters per converted file (default `120000`).
- `ENABLE_EMBEDDING` (optional, first-class): set `false` to disable all embedding + vector RAG logic globally. The app will use markdown fallback context directly without requiring Qdrant configuration.
- `QDRANT_URL`: base URL for the Qdrant API (for example Railway internal URL).
- `QDRANT_API_KEY` (optional): API key when Qdrant auth is enabled.
- `QDRANT_COLLECTION_ATTACHMENTS` (optional): collection name used for attachment chunks (default `attachment_chunks_v1`).
- `QDRANT_TIMEOUT_MS` (optional): HTTP timeout for Qdrant operations (default `5000`).
- `QDRANT_UPSERT_BATCH_SIZE` (optional): batch size for chunk upserts (default `128`).

RAG chunking/retrieval/model tuning is code-configured in:
- `apps/start/src/lib/chat-backend/services/rag/pipeline-config.ts`

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
bun --bun run test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `bun install @tailwindcss/vite tailwindcss -D`

## Linting & Formatting


This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
bun --bun run lint
bun --bun run format
bun --bun run check
```


## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
