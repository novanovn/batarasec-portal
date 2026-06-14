# BataraSec Portal - Design System

## Overview
Design system untuk BataraSec Portal dibangun menggunakan Tailwind CSS v4 dengan CSS custom properties (design tokens) untuk konsistensi visual.

## Color Palette

### Primary Colors
- **Background**: `#141416` (`var(--color-background)`) - Main background
- **Card**: `#1c1c1e` (`var(--color-card)`) - Card/surface backgrounds
- **Border**: `#3f3f46` (`var(--color-border)`) - Borders and dividers

### Text Colors
- **Foreground**: `#f4f4f5` (`var(--color-foreground)`) - Primary text
- **Muted**: `#71717a` (`var(--color-muted)`) - Secondary/muted text
- **Muted Dark**: `#52525b` (`var(--color-muted-dark)`) - Tertiary text

### Accent Colors
- **Accent**: `#185fa5` (`var(--color-accent)`) - Primary action/brand color
- **Accent Dark**: `#0f4a7a` (`var(--color-accent-dark)`) - Hover state
- **Accent Light**: `#2a7acc` (`var(--color-accent-light)`) - Light variant

### Semantic Colors
- **Success**: `#10b981` (`var(--color-success)`) - Success states
- **Warning**: `#f59e0b` (`var(--color-warning)`) - Warning states
- **Danger**: `#ef4444` (`var(--color-danger)`) - Error/danger states

## Design Tokens

### Spacing
Menggunakan Tailwind spacing scale default: `p-2`, `m-4`, `gap-6`, etc.

### Border Radius
- Default: `0.5rem` (`var(--radius)`)
- Usage: `rounded-[var(--radius)]`

### Typography
- **Body Font**: System fonts via Segoe UI, Roboto fallback
- **Font Smoothing**: Antialiased for crisp text rendering

## Component Variants

### Buttons

#### Primary Button
```tsx
<button className="btn-primary">Action</button>
```
- Background: Accent color
- Text: White
- Hover: Accent Dark

#### Secondary Button
```tsx
<button className="btn-secondary">Cancel</button>
```
- Background: Card color
- Border: 1px border
- Hover: Border color background

#### Outline Button
```tsx
<button className="btn-outline">Learn More</button>
```
- Background: Transparent
- Border: 1px border
- Hover: Card color background

### Input Fields
```tsx
<input className="input" placeholder="Enter text..." />
```
- Auto-focus ring effect
- Smooth transitions
- Built-in validation states

### Cards
```tsx
<div className="card">
  Content here
</div>
```
- Card background with subtle border
- Default padding included

### Badges
```tsx
<span className="badge">New</span>
```
- Compact inline component
- Icon-friendly with gap

## Usage Guidelines

### Colors
1. **Always use CSS variables** for consistency
2. Use Tailwind classes when possible: `bg-background`, `text-foreground`, `border-border`
3. For semantic colors: `text-success`, `bg-warning`, `border-danger`

### Components
- Use provided component classes (`.btn-primary`, `.input`, `.card`, `.badge`)
- Extend with additional Tailwind utilities as needed
- Keep component sizing consistent with design tokens

### Accessibility
- All interactive elements have focus states
- Color contrast meets WCAG AA standards
- Semantic HTML and ARIA attributes where needed

## Customization

To modify design tokens, edit `/app/globals.css` in the `@theme inline` block:

```css
@theme inline {
  --color-background: #141416;
  --color-accent: #185fa5;
  /* ... other tokens */
}
```

Changes automatically propagate to all components using these tokens.

## Design Mode in v0

Access the design editor in v0 by:
1. Click settings icon (⚙️) in top right
2. Select "Design"
3. Edit colors, typography, and spacing visually
4. Changes sync to `globals.css` automatically
