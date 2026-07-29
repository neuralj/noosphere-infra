---
name: ui-styling
description: Create beautiful, accessible user interfaces with shadcn/ui components (built on Radix UI + Tailwind), Tailwind CSS utility-first styling, and canvas-based visual designs. Use when building user interfaces, implementing design systems, creating responsive layouts, adding accessible components (dialogs, dropdowns, forms, tables), customizing themes and colors, implementing dark mode, generating visual designs and posters, or establishing consistent styling patterns across applications.
argument-hint: "[component or layout]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# UI Styling Skill

Comprehensive skill for creating beautiful, accessible user interfaces combining shadcn/ui components, Tailwind CSS utility styling, and canvas-based visual design systems.

## Reference

- shadcn-svelte: https://shadcn-svelte.com/docs (Svelte port, primary driver)
- shadcn/ui: https://ui.shadcn.com/llms.txt (React original, reference only)
- Tailwind CSS: https://tailwindcss.com/docs

## When to Use This Skill

Use when:
- Building UI with Svelte/SvelteKit (primary) or React-based frameworks
- Implementing accessible components (dialogs, forms, tables, navigation)
- Styling with utility-first CSS approach
- Creating responsive, mobile-first layouts
- Implementing dark mode and theme customization
- Building design systems with consistent tokens
- Generating visual designs, posters, or brand materials
- Rapid prototyping with immediate visual feedback
- Adding complex UI patterns (data tables, charts, command palettes)

## Core Stack

### Component Layer: shadcn-svelte (Svelte port of shadcn/ui)
- Pre-built accessible components via Melt UI / Bits UI primitives
- Copy-paste distribution model (components live in your codebase)
- TypeScript-first with full type safety
- Svelte 5 runes compatible (`$state`, `$props`, `$derived`, `$effect`)
- CLI-based installation (`npx shadcn-svelte@latest add button`)

### Styling Layer: Tailwind CSS
- Utility-first CSS framework
- Build-time processing with zero runtime overhead
- Mobile-first responsive design
- Consistent design tokens (colors, spacing, typography)
- Automatic dead code elimination

### Visual Design Layer: Canvas
- Museum-quality visual compositions
- Philosophy-driven design approach
- Sophisticated visual communication
- Minimal text, maximum visual impact
- Systematic patterns and refined aesthetics

## Quick Start

### SvelteKit Component Setup

**Prerequisites:** Tailwind CSS v4 (via `@tailwindcss/vite`), `bits-ui`, `clsx`, `tailwind-merge`.

```bash
# Install shadcn-svelte dependencies
npm install bits-ui clsx tailwind-merge

# Or use the CLI (creates config + adds cn util + installs deps)
npx shadcn-svelte@latest init --base-color zinc --css src/app.css
```

**Add components:**
```bash
npx shadcn-svelte@latest add button card dialog form tabs
# Add all at once:
npx shadcn-svelte@latest add --all
```

**Use components with utility styling (Svelte 5):**
```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import { Card, CardHeader, CardTitle, CardContent } from "$lib/components/ui/card/index.js"
  let count = $state(0)
</script>

<div class="container mx-auto p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  <Card>
    <CardHeader>
      <CardTitle>Analytics</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <p class="text-muted-foreground">View your metrics</p>
      <Button onclick={() => count++}>Clicked {count} times</Button>
    </CardContent>
  </Card>
</div>
```

### Alternative: Tailwind-Only Setup

**Vite projects:**
```bash
npm install -D tailwindcss @tailwindcss/vite
```

```javascript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
export default { plugins: [tailwindcss()] }
```

```css
/* src/index.css */
@import "tailwindcss";
```

## Component Library Guide

**Comprehensive component catalog with usage patterns, installation, and composition examples.**

See: `references/shadcn-components.md`

Covers:
- Form & input components (Button, Input, Select, Checkbox, Date Picker, Form validation)
- Layout & navigation (Card, Tabs, Accordion, Navigation Menu)
- Overlays & dialogs (Dialog, Drawer, Popover, Toast, Command)
- Feedback & status (Alert, Progress, Skeleton)
- Display components (Table, Data Table, Avatar, Badge)

## Theme & Customization

**Theme configuration, CSS variables, dark mode implementation, and component customization.**

See: `references/shadcn-theming.md`

Covers:
- Dark mode via `.dark` class on `<html>` (no `next-themes` needed for Svelte)
- CSS variable system (`--background`, `--foreground`, etc.)
- Tailwind v4 integration via `@theme inline` block
- Color customization and palettes (Zinc, Neutral, Stone, etc.)
- Component variant customization
- Theme toggle implementation

### CSS Variable Pattern (Tailwind v4)

```css
@import "tailwindcss";

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  /* ... */
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  /* ... */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... enables bg-background, text-foreground utilities */
}
```

## Accessibility Patterns

**ARIA patterns, keyboard navigation, screen reader support, and accessible component usage.**

See: `references/shadcn-accessibility.md`

Covers:
- Radix UI accessibility features
- Keyboard navigation patterns
- Focus management
- Screen reader announcements
- Form validation accessibility

## Tailwind Utilities

**Core utility classes for layout, spacing, typography, colors, borders, and shadows.**

See: `references/tailwind-utilities.md`

Covers:
- Layout utilities (Flexbox, Grid, positioning)
- Spacing system (padding, margin, gap)
- Typography (font sizes, weights, alignment, line height)
- Colors and backgrounds
- Borders and shadows
- Arbitrary values for custom styling

## Responsive Design

**Mobile-first breakpoints, responsive utilities, and adaptive layouts.**

See: `references/tailwind-responsive.md`

Covers:
- Mobile-first approach
- Breakpoint system (sm, md, lg, xl, 2xl)
- Responsive utility patterns
- Container queries
- Max-width queries
- Custom breakpoints

## Tailwind Customization

**Config file structure, custom utilities, plugins, and theme extensions.**

See: `references/tailwind-customization.md`

Covers:
- @theme directive for custom tokens
- Custom colors and fonts
- Spacing and breakpoint extensions
- Custom utility creation
- Custom variants
- Layer organization (@layer base, components, utilities)
- Apply directive for component extraction

## Visual Design System

**Canvas-based design philosophy, visual communication principles, and sophisticated compositions.**

See: `references/canvas-design-system.md`

Covers:
- Design philosophy approach
- Visual communication over text
- Systematic patterns and composition
- Color, form, and spatial design
- Minimal text integration
- Museum-quality execution
- Multi-page design systems

## Utility Scripts

**Python automation for component installation and configuration generation.**

### shadcn_add.py
Add shadcn/ui components with dependency handling:
```bash
python scripts/shadcn_add.py button card dialog
```

### tailwind_config_gen.py
Generate tailwind.config.js with custom theme:
```bash
python scripts/tailwind_config_gen.py --colors brand:blue --fonts display:Inter
```

## Best Practices

1. **Component Composition**: Build complex UIs from simple, composable primitives
2. **Utility-First Styling**: Use Tailwind classes directly; extract components only for true repetition
3. **Mobile-First Responsive**: Start with mobile styles, layer responsive variants
4. **Accessibility-First**: Leverage Radix UI primitives, add focus states, use semantic HTML
5. **Design Tokens**: Use consistent spacing scale, color palettes, typography system
6. **Dark Mode Consistency**: Apply dark variants to all themed elements
7. **Performance**: Leverage automatic CSS purging, avoid dynamic class names
8. **TypeScript**: Use full type safety for better DX
9. **Visual Hierarchy**: Let composition guide attention, use spacing and color intentionally
10. **Expert Craftsmanship**: Every detail matters - treat UI as a craft

## Reference Navigation

**Component Library**
- `references/shadcn-components.md` - Complete component catalog
- `references/shadcn-theming.md` - Theming and customization
- `references/shadcn-accessibility.md` - Accessibility patterns

**Styling System**
- `references/tailwind-utilities.md` - Core utility classes
- `references/tailwind-responsive.md` - Responsive design
- `references/tailwind-customization.md` - Configuration and extensions

**Visual Design**
- `references/canvas-design-system.md` - Design philosophy and canvas workflows

**Automation**
- `scripts/shadcn_add.py` - Component installation
- `scripts/tailwind_config_gen.py` - Config generation

## Common Patterns

**Form with validation (Svelte 5 + shadcn-svelte):**
```svelte
<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js"
  import * as Form from "$lib/components/ui/form/index.js"
  import { Input } from "$lib/components/ui/input/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import { superForm, superValidate } from "sveltekit-superforms"
  import { zod } from "sveltekit-superforms/adapters"
  import { z } from "zod"

  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })

  let { data } = $props()
  let form = $derived(superValidate(data.form, zod(schema)))
</script>

<Card.Root class="w-96">
  <Card.Header>
    <Card.Title>Sign In</Card.Title>
  </Card.Header>
  <Card.Content>
    <Form.Root {form} method="POST" class="space-y-4">
      <Form.Field name="email">
        <Form.Label>Email</Form.Label>
        <Form.Control>
          <Input type="email" />
        </Form.Control>
        <Form.Message />
      </Form.Field>
      <Button type="submit" class="w-full">Sign In</Button>
    </Form.Root>
  </Card.Content>
</Card.Root>
```

**Responsive layout with dark mode (Svelte 5):**
```svelte
<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js"
</script>

<div class="min-h-screen bg-background">
  <div class="container mx-auto px-4 py-8">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card.Root>
        <Card.Content class="p-6">
          <h3 class="text-xl font-semibold text-foreground">Content</h3>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>
```

**Responsive layout with dark mode:**
```tsx
<div className="min-h-screen bg-white dark:bg-gray-900">
  <div className="container mx-auto px-4 py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Content
          </h3>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
```

## Resources

- shadcn-svelte Docs: https://shadcn-svelte.com/docs
- shadcn/ui Docs: https://ui.shadcn.com (React original, reference)
- Bits UI (Svelte primitives): https://bits-ui.com
- Melt UI (Svelte primitives): https://melt-ui.com
- Tailwind CSS Docs: https://tailwindcss.com
- Tailwind UI: https://tailwindui.com
- v0 (AI UI Generator): https://v0.dev
