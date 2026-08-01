---
name: infra-dashboard
description: Infrastructure dashboard design rules for OpenLaputa viewer - file browser, topology visualization, configuration panels, and dark theme
---

# Infrastructure Dashboard Design Rules

## When to Use

Apply this skill when building or modifying:
- File browser with tree navigation
- Docker image topology diagrams
- Compose service visualization
- Nginx route mapping
- CI/CD pipeline views
- Any infrastructure dashboard component

## Design System

### Color Tokens (Catppuccin Mocha)

```css
/* Background layers */
--color-surface: #1e1e2e;        /* Main background */
--color-surface-light: #2a2a3e;  /* Card/panel background */
--color-surface-lighter: #363650; /* Hover/active states */

/* Borders */
--color-border: #3e3e5e;         /* Default borders */

/* Text */
--color-text: #cdd6f4;           /* Primary text */
--color-text-muted: #7f849c;     /* Secondary text */

/* Accent colors */
--color-accent-blue: #89b4fa;    /* Links, primary actions */
--color-accent-green: #a6e3a1;   /* Success, ports */
--color-accent-yellow: #f9e2af;  /* Warnings, file paths */
--color-accent-red: #f38ba8;     /* Errors */
--color-accent-purple: #cba6f7;  /* Secondary accent */
--color-accent-teal: #94e2d5;    /* Tertiary accent */
```

### Spacing Scale

Use 4px base unit:
- `p-1` = 4px (tight spacing)
- `p-2` = 8px (compact)
- `p-3` = 12px (default)
- `p-4` = 16px (comfortable)
- `p-6` = 24px (section spacing)

### Border Radius

- `rounded` = 4px (small elements)
- `rounded-lg` = 8px (cards, panels)
- `rounded-xl` = 12px (modals, large containers)

### Typography

- **Font family**: System UI stack (`system-ui, -apple-system, sans-serif`)
- **Monospace**: `'JetBrains Mono', 'Fira Code', monospace` for code/paths
- **Scale**: 
  - `text-xs` = 12px (labels, metadata)
  - `text-sm` = 14px (body text)
  - `text-base` = 16px (emphasis)
  - `text-lg` = 18px (section titles)
  - `text-2xl` = 24px (page titles)

## Component Patterns

### File Browser

#### Tree Navigation
```svelte
<!-- File tree item structure -->
<div class="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-lighter rounded">
  <span class="w-4 text-text-muted">▸</span> <!-- Expand indicator -->
  <span>📁</span> <!-- Icon -->
  <span class="flex-1 truncate">filename</span>
  <span class="text-xs text-text-muted">1.2 KB</span> <!-- Size -->
</div>
```

**Rules**:
- Directories first, then files (alphabetical within each group)
- Hide dotfiles by default (`.git`, `.env`)
- Indent nested items with `ml-4 border-l border-border/50`
- Use semantic icons: 📁 directory, 📄 file, 🐳 Dockerfile, 📋 YAML, 📝 Markdown
- Show file size for files, omit for directories

#### Code Preview Panel
```svelte
<div class="flex h-full">
  <!-- Left: File tree (fixed width) -->
  <div class="w-72 border-r border-border overflow-auto">
    <!-- FileTree component -->
  </div>
  
  <!-- Right: Code viewer (flex-1) -->
  <div class="flex-1 overflow-auto">
    <div class="px-4 py-2 border-b border-border bg-surface-light">
      <code class="text-sm font-mono text-accent-blue">path/to/file</code>
    </div>
    <div class="p-4">
      <!-- CodeViewer or MarkdownView -->
    </div>
  </div>
</div>
```

**Rules**:
- File tree: fixed width 288px (`w-72`), scrollable
- Code viewer: flex-1, scrollable
- Header bar shows current file path in monospace
- Markdown files render as HTML, other files use syntax highlighting (Shiki)

### Topology Visualization

#### Mermaid Diagram Integration
```svelte
<script>
  import MermaidDiagram from '$lib/components/MermaidDiagram.svelte';
  
  const graph = `graph TD
    A[Base Image] --> B[Derived Image]
    classDef internal fill:#2a2a3e,stroke:#3b82f6,color:#cdd6f4
    classDef external fill:#1e1e2e,stroke:#7f849c,color:#7f849c,stroke-dasharray: 5 5
    class A internal
    class B external`;
</script>

<MermaidDiagram code={graph} />
```

**Rules**:
- Use `graph TD` (top-down) for dependency trees
- Internal images: solid border, `--color-surface-light` fill, `--color-accent-blue` stroke
- External images: dashed border, `--color-surface` fill, `--color-text-muted` stroke
- Node labels: image names in monospace
- Wrap in card with `bg-surface-light rounded-lg border border-border p-6`

#### Service Cards (Compose/Nginx)
```svelte
<div class="bg-surface-light rounded-lg border border-border p-4">
  <h3 class="font-semibold text-accent-blue">service-name</h3>
  
  <div class="mt-3 space-y-2 text-sm">
    <div>
      <span class="text-text-muted text-xs uppercase">Image</span>
      <p class="font-mono text-xs text-accent-yellow">ghcr.io/image:tag</p>
    </div>
    
    <div>
      <span class="text-text-muted text-xs uppercase">Ports</span>
      <div class="flex flex-wrap gap-1 mt-1">
        <span class="px-2 py-0.5 bg-surface-lighter rounded text-xs font-mono text-accent-green">8080:8080</span>
      </div>
    </div>
  </div>
</div>
```

**Rules**:
- Title: service name in `--color-accent-blue`
- Metadata labels: uppercase, `text-xs`, `--color-text-muted`
- Values: monospace, `text-xs`
- Ports/volumes: pill badges with `bg-surface-lighter`, `text-accent-green`
- Use `space-y-2` for vertical spacing between metadata sections

### Configuration Tables

```svelte
<table class="w-full text-sm">
  <thead>
    <tr class="text-text-muted text-xs uppercase">
      <th class="text-left pb-2 font-medium">Path</th>
      <th class="text-left pb-2 font-medium">Proxy Pass</th>
    </tr>
  </thead>
  <tbody class="divide-y divide-border/50">
    <tr>
      <td class="py-1.5 font-mono text-xs">/api</td>
      <td class="py-1.5 font-mono text-xs text-accent-green">http://127.0.0.1:8092</td>
    </tr>
  </tbody>
</table>
```

**Rules**:
- Header: uppercase, `text-xs`, `--color-text-muted`, `font-medium`
- Body: monospace, `text-xs`
- Values (URLs, paths): `--color-accent-green`
- Row divider: `divide-border/50` (50% opacity)
- Padding: `py-1.5` for compact rows

## Layout Patterns

### Sidebar Navigation
```svelte
<aside class="w-56 bg-surface-light border-r border-border flex flex-col">
  <div class="p-4 border-b border-border">
    <h1 class="text-lg font-bold text-accent-blue">OpenLaputa</h1>
    <p class="text-xs text-text-muted mt-1">Infrastructure Viewer</p>
  </div>
  
  <nav class="flex-1 p-2 space-y-1">
    <a href="/" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                       hover:bg-surface-lighter hover:text-text
                       text-text-muted transition-colors">
      <span class="text-base">📁</span>
      <span>Files</span>
    </a>
  </nav>
</aside>
```

**Rules**:
- Fixed width: 224px (`w-56`)
- Active link: `bg-primary/20 text-accent-blue`
- Inactive link: `text-text-muted`, hover: `bg-surface-lighter text-text`
- Icon + label layout with `gap-3`

### Dashboard Grid
```svelte
<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
  {#each cards as card}
    <a href={card.href} class="bg-surface-light rounded-lg p-4 border border-border
                                hover:border-primary/50 hover:bg-surface-lighter
                                transition-all group">
      <span class="text-2xl">{card.icon}</span>
      <h3 class="font-semibold mt-2 group-hover:text-accent-blue">{card.label}</h3>
      <p class="text-xs text-text-muted mt-1">{card.desc}</p>
    </a>
  {/each}
</div>
```

**Rules**:
- Responsive grid: 2 cols mobile, 3 cols desktop (`md:grid-cols-3`)
- Card hover: border becomes `--color-primary` at 50% opacity
- Icon: large (`text-2xl`), title: `font-semibold`, description: `text-xs text-text-muted`

## Responsive Design

### Breakpoints
- Mobile: < 768px (single column, collapsible sidebar)
- Tablet: 768px - 1024px (2 column grid)
- Desktop: > 1024px (3 column grid, full sidebar)

### Sidebar Collapse (Mobile)
```svelte
{#if sidebarOpen}
  <aside class="fixed inset-y-0 left-0 w-56 z-50">
    <!-- Sidebar content -->
  </aside>
{/if}
```

**Rules**:
- Mobile: sidebar as overlay with backdrop
- Desktop: sidebar always visible, flex layout
- Use `overflow-auto` on sidebar and main content for independent scrolling

## Performance

### Lazy Loading
```svelte
<script>
  import { browser } from '$app/environment';
  
  let MermaidDiagram;
  
  if (browser) {
    import('$lib/components/MermaidDiagram.svelte').then(m => {
      MermaidDiagram = m.default;
    });
  }
</script>

{#if MermaidDiagram}
  <MermaidDiagram code={graph} />
{:else}
  <div class="p-4 text-text-muted">Loading diagram...</div>
{/if}
```

**Rules**:
- Lazy load heavy components (Mermaid, Shiki) on client-side only
- Show loading placeholder while importing
- Use `$app/environment` to guard browser-only imports

## Accessibility

**Rules**:
- All interactive elements must have visible focus states
- Use semantic HTML: `<nav>`, `<main>`, `<aside>`, `<button>`
- Color contrast: minimum 4.5:1 for text (WCAG AA)
- Keyboard navigation: all tree items focusable with arrow keys
- Screen reader: use `aria-expanded` for tree nodes, `aria-current` for active nav

## Anti-Patterns

**Don't**:
- Use emojis as functional icons (use SVG: Heroicons/Lucide)
- Omit `cursor-pointer` on clickable elements
- Skip hover states (use smooth transitions: 150-300ms)
- Use bright neon colors (stick to Catppuccin palette)
- Create harsh animations (respect `prefers-reduced-motion`)
- Forget responsive breakpoints (test 375px, 768px, 1024px, 1440px)
- Use light mode only (this is a dark-mode-first design)
