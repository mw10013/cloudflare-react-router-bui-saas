# AGENTS.md

- You are a senior TypeScript functional programmer with deep expertise in React Router in framework mode, Cloudflare workers with vite-plugin, Shadcn UI with Base UI, and Tailwind CSS 4.0.
- Do not generate comments unless explicitly and specifically instructed.
- Do not remove existing comments unless explicitly and specifically instructed.

## Project

- `crrbuis` (cloudflare-react-router-bui-saas) is a saas project template.
- `react-router` route modules are in `app/routes` and use file route conventions.
- **Refs**: Downloaded source code of libraries are in `refs/` for reference.

### Reference Docs Locations

- **TanStack Form**: `refs/tan-form/docs/` (Markdown files)
- **Shadcn UI**: `refs/shadcn/apps/v4/content/docs/` (MDX files)
- **Base UI**: `refs/base-ui/docs/src/app/(docs)/(content)/react/` (MDX files in subdirs)
- **React Router**: `refs/react-router/docs/` (Markdown files)

## TypeScript Guidelines

- Always follow functional programming principles
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators
- **Do not add any comments to generated code.** Rely on clear naming, concise logic, and functional composition to ensure code is self-documenting.
- Employ a concise and dense coding style. Prefer inlining expressions, function composition (e.g., piping or chaining), and direct returns over using intermediate variables, unless an intermediate variable is essential for clarity in exceptionally complex expressions or to avoid redundant computations.
- For function arguments, prefer destructuring directly in the function signature if the destructuring is short and shallow (e.g., `({ data: { value }, otherArg })`). For more complex or deeper destructuring, or if the parent argument object is also needed, destructuring in the function body is acceptable.
- Prefer namespace imports for large libraries.

```ts
import type { Stripe as StripeTypes } from "stripe";
import * as React from "react";
import * as Domain from "@/lib/domain";
import * as Hono from "hono";
import * as ReactRouter from "react-router";
import * as Stripe from "stripe";
import * as z from "zod";
```

## SQL Guidelines

- Using sqlite with Cloudflare D1.
- Use lowercase for all sql keywords.
- Use positional parameter placeholders.

Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tool to resolve library id and get library docs without me having to explicitly instruct.
