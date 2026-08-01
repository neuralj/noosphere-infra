---
name: sveltekit-tailwind
description: SvelteKit + Tailwind CSS v4 best practices for OpenLaputa viewer - Svelte 5 runes, component patterns, API routes, and performance optimization
---

# SvelteKit + Tailwind CSS v4 Best Practices

## When to Use

Apply this skill when building or modifying:
- SvelteKit pages and layouts
- Reusable Svelte components
- API routes (`+server.ts`)
- Tailwind CSS configuration
- TypeScript types and interfaces

## Svelte 5 Runes

### State Management

```svelte
<script>
  // ✅ Correct: Use $state for reactive state
  let count = $state(0);
  let user = $state({ name: 'Alice', age: 30 });
  
  // ❌ Wrong: Don't use let + $:
  // let count = 0;
  // $: doubled = count * 2;
</script>
```

**Rules**:
- Use `$state()` for all reactive variables
- Use `$derived()` for computed values (replaces `$:` declarations)
- Use `$effect()` for side effects (replaces `onMount` for reactive effects)
- Never use `$:` reactive declarations or `export let` for props

### Component Props

```svelte
<script>
  // ✅ Correct: Use $props() rune
  let { title, count = 0, onClick = () => {} } = $props();
  
  // With TypeScript
  interface Props {
    title: string;
    count?: number;
    onClick?: () => void;
  }
  let { title, count = 0, onClick = () => {} }: Props = $props();
</script>
```

**Rules**:
- Destructure props from `$props()`
- Provide default values in destructuring
- Define TypeScript interface for props
- Never use `export let` for props

### Derived Values

```svelte
<script>
  let count = $state(0);
  
  // ✅ Correct: Use $derived for computed values
  let doubled = $derived(count * 2);
  let message = $derived(count > 10 ? 'High' : 'Low');
</script>
```

**Rules**:
- Use `$derived()` for values computed from state
- Automatically tracks dependencies
- Replaces `$:` reactive declarations

### Effects

```svelte
<script>
  let userId = $state(1);
  
  // ✅ Correct: Use $effect for side effects
  $effect(async () => {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    // Update state...
  });
  
  // Cleanup function
  $effect(() => {
    const interval = setInterval(() => {
      // ...
    }, 1000);
    
    return () => clearInterval(interval);
  });
</script>
```

**Rules**:
- Use `$effect()` for side effects (API calls, subscriptions, timers)
- Return cleanup function if needed
- Runs after component mounts and when dependencies change
- For one-time setup, use `onMount` from `svelte`

## SvelteKit Architecture

### File Structure

```
src/
├── routes/
│   ├── +layout.svelte       # Root layout
│   ├── +layout.ts           # Root layout data (ssr = false)
│   ├── +page.svelte         # Homepage
│   ├── browse/
│   │   └── +page.svelte     # /browse route
│   └── api/
│       └── files/
│           └── +server.ts   # GET /api/files
├── lib/
│   ├── components/          # Reusable components
│   │   ├── FileTree.svelte
│   │   └── CodeViewer.svelte
│   └── utils/               # Helper functions
│       └── parsers.ts
└── app.css                  # Global styles (Tailwind)
```

**Rules**:
- `routes/` — file-based routing
- `lib/components/` — reusable UI components
- `lib/utils/` — pure functions, parsers
- API routes in `routes/api/` with `+server.ts`

### SPA Mode Configuration

```typescript
// src/routes/+layout.ts
export const ssr = false;
export const prerender = false;
```

**Rules**:
- Disable SSR for client-side SPA
- Set in root `+layout.ts`
- Use `adapter-static` for build

### API Routes

```typescript
// src/routes/api/files/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const path = url.searchParams.get('path') || '';
  
  try {
    const items = await getFiles(path);
    return json({ items, path });
  } catch (error) {
    return json({ error: String(error) }, { status: 500 });
  }
};
```

**Rules**:
- Export HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
- Use `json()` helper from `@sveltejs/kit`
- Type with `RequestHandler` from `./$types`
- Access query params via `url.searchParams`
- Return proper HTTP status codes

### Data Loading (if using SSR)

```typescript
// src/routes/browse/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const response = await fetch('/api/files');
  const data = await response.json();
  
  return {
    files: data.items
  };
};
```

**Rules**:
- Use `+page.ts` for data loading
- Return data to `+page.svelte` via `data` prop
- Use `fetch` from load context (not global fetch)

## Component Patterns

### Component File Structure

```svelte
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  
  // 2. Props
  interface Props {
    title: string;
    count?: number;
  }
  let { title, count = 0 }: Props = $props();
  
  // 3. State
  let isOpen = $state(false);
  
  // 4. Derived
  let displayCount = $derived(count > 0 ? count : 'None');
  
  // 5. Effects
  $effect(() => {
    console.log(`Count changed to ${count}`);
  });
  
  // 6. Functions
  function toggle() {
    isOpen = !isOpen;
  }
</script>

<!-- 7. HTML template -->
<div class="card">
  <h2>{title}</h2>
  <p>Count: {displayCount}</p>
  <button onclick={toggle}>Toggle</button>
</div>

<!-- 8. Styles (if needed) -->
<style>
  .card {
    padding: 1rem;
  }
</style>
```

**Rules**:
- Always use `<script lang="ts">`
- Follow order: imports → props → state → derived → effects → functions
- Use Tailwind for styling, avoid `<style>` blocks
- Keep components under 200 lines

### Event Handling

```svelte
<script>
  interface Props {
    onClick?: () => void;
  }
  let { onClick = () => {} }: Props = $props();
  
  function handleClick() {
    console.log('Clicked');
    onClick();
  }
</script>

<button onclick={handleClick}>Click me</button>
```

**Rules**:
- Use `onclick` (lowercase) for native events
- Define event handlers as props with default no-op
- Call parent callback after local logic

### Slots vs Snippets

```svelte
<!-- ✅ Svelte 5: Use snippets for flexible content -->
<script>
  interface Props {
    header?: import('svelte').Snippet;
    children: import('svelte').Snippet;
  }
  let { header, children }: Props = $props();
</script>

<div class="card">
  {#if header}
    <div class="header">
      {@render header()}
    </div>
  {/if}
  <div class="content">
    {@render children()}
  </div>
</div>

<!-- Usage -->
<Card>
  {#snippet header()}
    <h2>Title</h2>
  {/snippet}
  
  <p>Content</p>
</Card>
```

**Rules**:
- Use snippets (Svelte 5) instead of slots
- Define snippet props with `import('svelte').Snippet`
- Render with `{@render snippetName()}`
- `children` snippet for default content

## Tailwind CSS v4

### Configuration

```css
/* src/app.css */
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-surface: #1e1e2e;
  --color-text: #cdd6f4;
  
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

**Rules**:
- Use `@import "tailwindcss"` (not `@tailwind` directives)
- Define custom tokens in `@theme` block
- No `tailwind.config.js` needed (CSS-first config)
- Use `@tailwindcss/vite` plugin in `vite.config.ts`

### Vite Configuration

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit()
  ]
});
```

**Rules**:
- Add `@tailwindcss/vite` plugin before `sveltekit()`
- No PostCSS config needed

### Utility Patterns

```svelte
<!-- Spacing -->
<div class="p-4 m-2 space-y-3">

<!-- Flexbox -->
<div class="flex items-center justify-between gap-4">

<!-- Grid -->
<div class="grid grid-cols-2 md:grid-cols-3 gap-4">

<!-- Typography -->
<h1 class="text-2xl font-bold text-accent-blue">
<p class="text-sm text-text-muted">

<!-- Borders -->
<div class="border border-border rounded-lg">

<!-- Background -->
<div class="bg-surface-light">

<!-- Hover states -->
<button class="hover:bg-surface-lighter transition-colors">

<!-- Responsive -->
<div class="w-full md:w-72">
```

**Rules**:
- Use utility classes, avoid custom CSS
- Mobile-first: base styles for mobile, `md:` for desktop
- Use custom color tokens from `@theme`
- Add `transition-colors` for smooth hover effects

## TypeScript

### Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Rules**:
- Enable strict mode
- Type all props, state, and function parameters
- Avoid `any` type (use `unknown` if type is truly unknown)

### Type Imports

```typescript
// ✅ Import types separately
import type { PageData } from './$types';
import type { RequestHandler } from './$types';

// Or inline
let data: import('./$types').PageData;
```

**Rules**:
- Use `import type` for type-only imports
- SvelteKit generates types in `$types` (virtual module)

## Performance

### Lazy Loading

```svelte
<script>
  import { browser } from '$app/environment';
  
  let HeavyComponent;
  
  if (browser) {
    import('./HeavyComponent.svelte').then(m => {
      HeavyComponent = m.default;
    });
  }
</script>

{#if HeavyComponent}
  <HeavyComponent />
{:else}
  <div>Loading...</div>
{/if}
```

**Rules**:
- Lazy load heavy components (charts, editors)
- Use dynamic `import()` for code splitting
- Guard with `browser` check for SSR
- Show loading placeholder

### Image Optimization

```svelte
<img 
  src="/image.jpg" 
  alt="Description"
  width="800"
  height="600"
  loading="lazy"
  class="rounded-lg"
/>
```

**Rules**:
- Always specify `width` and `height` (prevent layout shift)
- Use `loading="lazy"` for below-fold images
- Use modern formats (WebP, AVIF) when possible

## Testing

### Component Testing

```typescript
// src/lib/components/Button.test.ts
import { render, screen } from '@testing-library/svelte';
import Button from './Button.svelte';

test('renders button with text', () => {
  render(Button, { props: { label: 'Click me' } });
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

**Rules**:
- Use `@testing-library/svelte` for component tests
- Test behavior, not implementation
- Use `screen.getByText` for queries

## Anti-Patterns

**Don't**:
- Use `$:` reactive declarations (use `$derived`)
- Use `export let` for props (use `$props()`)
- Mutate props directly (treat as immutable)
- Use global `fetch` in load functions (use context `fetch`)
- Skip TypeScript types (always type props, state, functions)
- Use `<slot>` (use snippets in Svelte 5)
- Forget cleanup in `$effect` (return cleanup function)
- Use inline styles (use Tailwind utilities)
