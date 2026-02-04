---
description: 'Styling standards with BEM methodology and Tailwind CSS 4'
applyTo: '**/*.css, **/*.html'
---

# Styling Standards

<!-- Based on project-specific BEM methodology + Tailwind CSS 4 integration -->

Instructions for creating consistent, maintainable styles using a modified BEM naming convention combined with Tailwind CSS 4's `@apply` directive. All styles must be organized in dedicated CSS files within the `src/styles/tailwind/` directory structure.

## Project Context

- **CSS Framework:** Tailwind CSS 4 with custom design system
- **Methodology:** Modified BEM (Block-Element-Modifier) with hyphen-separated format
- **Organization:** Dedicated CSS files in `src/styles/tailwind/` (abstracts, base, components, layout, pages, utilities)
- **Component Styles:** Components use global CSS classes, not inline styles or framework-specific scoped styles
- **Responsive Design:** Mobile-first approach with Tailwind's responsive utilities
- **Accessibility:** WCAG 2.1 AA compliance required

---

## Critical Styling Rules

### 🔴 MUST Follow These Rules

1. **Hyphen-Separated BEM Format:** Use `block-element-modifier` format (NOT traditional `block__element--modifier`)
2. **Dedicated CSS Files:** All styles MUST be in `*.css` files within `src/styles/tailwind/`, never in component files
3. **@apply Directive:** Compose Tailwind utilities into semantic BEM classes using `@apply`
4. **@layer Directive:** Wrap custom styles in `@layer components`, `@layer base`, or `@layer utilities`
5. **No Inline Styles:** Never use `style` attribute in HTML templates
6. **No Component Scoped Styles:** Never use framework-specific scoped styles (e.g., `styleUrls`, `styles`, `scoped` attribute)
7. **Global CSS Classes:** All styles are global; rely on BEM naming for uniqueness
8. **Utility Class Usage in HTML:** ONLY spacing and layout utilities allowed directly in HTML (e.g., `flex`, `gap-4`, `p-6`, `grid`); all visual styles (colors, typography, effects) MUST be in component classes

---

## BEM Methodology (Hyphen-Separated Format)

### Critical Rule: Hyphen-Separated, NOT Traditional BEM

This project uses a **modified BEM format** with hyphens throughout:

| ❌ Traditional BEM | ✅ Our Format |
|-------------------|---------------|
| `.block__element--modifier` | `.block-element-modifier` |
| `.card__header--primary` | `.card-header-primary` |
| `.user__avatar--large` | `.user-avatar-large` |
| `.nav__item--active` | `.nav-item-active` |

**Rationale:** Hyphen-separated format provides:
- Better readability and consistency
- Easier to type and remember
- Cleaner integration with Tailwind's utility classes
- Reduced cognitive load for developers

### BEM Structure

#### Block (Component)

The **root element** representing a standalone entity with independent meaning.

**Naming:** Use descriptive, lowercase, hyphen-separated names

**Examples:** `.card`, `.user-profile`, `.search-form`, `.data-table`

**Avoid:**
- PascalCase (`.Card`)
- Underscores (`.user_profile`)
- camelCase (`.searchForm`)
- Missing hyphens (`.userprofile`)

#### Element (Child Component)

A **part of a block** that has no standalone meaning and is semantically tied to its block.

**Naming:** `block-element` (block name + hyphen + element name)

**Examples:** `.card-header`, `.card-body`, `.user-profile-avatar`, `.search-form-input`

**Avoid:**
- Double underscore (`.card__header`)
- camelCase (`.cardHeader`)
- Generic names without block prefix (`.header`)
- Deep nesting (`.card-header-item-link` → flatten to `.card-link`)

#### Modifier (Variant)

A **flag on a block or element** that changes appearance, behavior, or state.

**Naming:** `block-modifier` or `block-element-modifier`

**Block Modifiers:** `.btn-primary`, `.btn-lg`, `.card-featured`

**Element Modifiers:** `.card-header-primary`, `.user-profile-avatar-large`

**Avoid:**
- Double dash (`.btn--primary`)
- camelCase (`.btnPrimary`)
- Missing block/element prefix (`.primary`)
- State prefixes (`.btn-is-primary`, `.btn-has-icon`)

### State Classes

For **dynamic states** (active, disabled, loading, etc.), use modifier format.

**Examples:** `.btn-active`, `.btn-disabled`, `.btn-loading`, `.nav-item-active`

**Avoid:**
- Generic state classes (`.is-active`)
- Plain state classes (`.btn.active`)
- Attribute selectors (`.btn[disabled]`)

### Component Structure Example

**Block:** `.user-card` (root container)

**Elements:**
- `.user-card-header` (header container)
- `.user-card-avatar` (avatar image)
- `.user-card-name` (name text)
- `.user-card-body` (content area)
- `.user-card-footer` (action area)

**Modifiers:**
- `.user-card-featured` (highlighted variant)
- `.user-card-compact` (smaller spacing)
- `.user-card-avatar-large` (larger avatar)

**HTML Pattern:** Combine block, elements, and modifiers as needed. Use multiple modifiers for different variants.

---

## Three-Layer Styling Architecture

This project follows a three-layer styling system for maintainability, consistency, and scalability:

### Layer 1: Utility Classes (Atomic)

Single-responsibility Tailwind utilities that apply one specific style property.

**Categories:** Spacing, Layout, Typography, Colors, Sizing, Borders, Effects

**Direct HTML Usage Rule:**

✅ **Allowed in HTML:** Spacing and Layout utilities only
- **Spacing:** `p-*`, `m-*`, `gap-*`, `space-*`
- **Layout:** `flex`, `grid`, `block`, `inline-*`, `container`, `items-*`, `justify-*`, `self-*`, `order-*`
- **Sizing:** `w-*`, `h-*`, `max-*`, `min-*` (when used for structural purposes)

❌ **Not allowed in HTML:** Must use `@apply` in component classes
- **Colors:** `bg-*`, `text-*`, `border-*`
- **Typography:** `text-*`, `font-*`, `leading-*`
- **Effects:** `shadow-*`, `opacity-*`, `transition-*`
- **Borders:** `rounded-*`, `border-*`
- **Other visual styles**

**Rationale:** Spacing and layout are structural and contextual. Visual styles must be encapsulated in component classes for consistency.

### Layer 2: Component Classes (Semantic)

BEM-named classes that compose utility classes into reusable, semantic components.

**Structure:** Block-Element-Modifier (hyphen-separated)
- **Block:** `.btn`, `.card`, `.user-card`
- **Element:** `.card-header`, `.user-card-avatar`
- **Modifier:** `.btn-primary`, `.card-featured`

**Purpose:**
- Encapsulate visual styles (colors, typography, effects, borders)
- Provide semantic meaning to UI elements
- Create reusable component patterns
- Maintain design system consistency

**Usage:** Applied directly in HTML templates for all visual styling. Combine with Layer 1 layout/spacing utilities for positioning.

### Layer 3: Design Tokens (System)

Global design variables defined in Tailwind configuration representing the design system foundation.

**Categories:**
- **Colors:** Primary, secondary, accent, destructive, muted, border
- **Spacing:** Tailwind scale (0-96, 0.25rem increments)
- **Typography:** Font families, sizes, weights, line heights
- **Borders:** Radius values, widths
- **Shadows:** Shadow scale (sm, md, lg, xl)
- **Breakpoints:** Responsive breakpoints (sm, md, lg, xl, 2xl)
- **Transitions:** Timing functions and durations

**Definition Location:** `config/tailwind.config.js`

**Usage:** Design tokens are referenced by Layer 1 utilities and consumed in Layer 2 components. Never hardcode values; always reference tokens.

### Layer Interaction Summary

```
Layer 3 (Design Tokens)
    ↓ defines values for
Layer 1 (Utility Classes)
    ↓ composed into
Layer 2 (Component Classes)
    ↓ applied in
HTML Templates (+ Layout/Spacing utilities)
```

**Key Principles:**
1. Design tokens define the design system foundation
2. Utility classes provide atomic building blocks
3. Component classes create semantic, reusable patterns
4. HTML uses component classes + layout/spacing utilities
5. Never hardcode values; always reference tokens

---

## Tailwind CSS Integration

### Using @apply Directive

Compose Tailwind utilities into semantic BEM classes using `@apply`.

**Pattern:** Use `@layer components` wrapper, then define BEM classes with `@apply` directives to compose utilities.

**Guidelines:**
- Group related properties together
- Include interaction states (hover, focus, active)
- Include accessibility states (disabled, aria-*)
- Use theme variables, not hardcoded values

**Avoid:** Using visual style utilities directly in HTML templates.

### Responsive Design with @apply

Implement mobile-first responsive design using Tailwind's responsive utilities within `@apply`.

**Mobile-First Approach:**
- Start with mobile styles (no prefix)
- Add tablet styles (`sm:` prefix)
- Add desktop styles (`md:`, `lg:`, `xl:` prefixes)

**Breakpoints:**
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up
- `2xl:` - 1536px and up

**Avoid:** Desktop-first approach (applying large screen styles first, then overriding for smaller screens).

### Theme Variables

Always use Tailwind's theme variables for consistency.

**Available Theme Variables:**
- **Colors:** `bg-card`, `text-foreground`, `border-border`, `bg-primary`, `text-destructive`
- **Spacing:** Use Tailwind scale (`p-4`, `m-2`, `gap-6`)
- **Borders:** `rounded-md`, `rounded-lg`, `border`
- **Shadows:** `shadow-sm`, `shadow-md`, `shadow-lg`

**Avoid:** Hardcoding colors (`bg-white`, `text-black`, `border-gray-200`) or arbitrary values when theme values exist.

### Arbitrary Values

Use arbitrary values sparingly and only when design system doesn't have exact value needed.

**When to Use:**
- Design spec requires specific value not in Tailwind scale
- One-off special cases

**Requirements:**
- Document why arbitrary value is needed (comment)
- Consider if value should be added to design system instead

**Avoid:** Using arbitrary values when equivalent theme values exist (e.g., `p-[16px]` instead of `p-4`).

---

## File Organization

### Directory Structure

All styles must be organized in `src/styles/tailwind/`:

```
src/styles/tailwind/
├── _all.css                 # Main entry point (imports all other files)
├── abstracts/               # Variables, mixins, functions
│   ├── _all.css
│   ├── variables.css
│   └── mixins.css
├── base/                    # Reset, typography, base elements
│   ├── _all.css
│   ├── reset.css
│   └── typography.css
├── components/              # Component styles (buttons, cards, forms, etc.)
│   ├── _all.css
│   ├── badge.css
│   ├── button.css
│   ├── card.css
│   ├── form.css
│   ├── input.css
│   └── ...
├── layout/                  # Layout components (header, sidebar, footer)
│   ├── _all.css
│   ├── header.css
│   ├── sidebar.css
│   └── footer.css
├── pages/                   # Page-specific styles
│   ├── _all.css
│   ├── home.css
│   └── auth.css
└── utilities/               # Utility classes and helpers
    ├── _all.css
    ├── spacing.css
    └── typography.css
```

### File Naming Conventions

| File Type | Naming Pattern | Example |
|-----------|---------------|---------|
| Component styles | `component-name.css` | `button.css`, `user-card.css` |
| Layout styles | `layout-name.css` | `header.css`, `sidebar.css` |
| Page styles | `page-name.css` | `home.css`, `login.css` |
| Utility styles | `utility-name.css` | `spacing.css`, `typography.css` |
| Index files | `_all.css` | Imports all files in directory |

### Component CSS File Template

**Structure:**
1. File header comment with component name
2. `@layer components` wrapper
3. Block styles (root element)
4. Element styles (child elements)
5. Modifier styles (variants)
6. State modifiers (active, disabled, loading)

**Naming:** `component-name.css` (lowercase, hyphen-separated)

### Importing Styles

Import styles in `_all.css` files using `@import` directive.

**Pattern:** Each directory has an `_all.css` that imports all files in that directory.

**Order:** Import in alphabetical order for consistency.

---

## Component Styling Workflow

### Step 1: Create Component Structure

Create component **without** framework-specific style isolation (e.g., `styleUrls`, `styles`, or `scoped` blocks).

**Critical:** Never use component-level styling. All styles must be in global CSS files.

### Step 2: Create HTML Template with BEM Classes

Use BEM class names following hyphen-separated format.

**Include:**
- Block class on root element
- Element classes on child elements
- Modifier classes for variants (use conditional class binding)
- Layout/spacing utilities as needed (`flex`, `gap-*`, `p-*`)

**Avoid:**
- Visual style utilities in HTML
- Inline styles
- Generic class names without block prefix

### Step 3: Create CSS File in Tailwind Directory

Create dedicated CSS file in `src/styles/tailwind/components/`.

**Structure:**
1. Wrap in `@layer components`
2. Define block styles with all visual properties
3. Define element styles
4. Define modifier styles
5. Include all interaction states (hover, focus, disabled)

**Use:** `@apply` to compose Tailwind utilities. Reference theme variables, not hardcoded values.

### Step 4: Import CSS File

Add `@import` statement to `src/styles/tailwind/components/_all.css`.

**Pattern:** Import new file in alphabetical order with other imports.

---

## Advanced Patterns

### Variant Classes (Multiple Modifiers)

Create composable modifiers for flexible variants.

**Pattern:**
- Base class with common styles
- Type modifiers (primary, secondary, outline, ghost)
- Size modifiers (sm, lg)
- Shape modifiers (circle, square)
- State modifiers (loading, disabled)

**Usage:** Combine multiple modifier classes for different variants (e.g., `.btn .btn-primary .btn-sm`).

### Data Attributes for Dynamic States

Use data attributes with Tailwind's `data-*` variant for dynamic state styling.

**Pattern:** Apply styles based on data attribute values using `data-[attribute=value]:utility` format.

**Use Cases:**
- Loading states
- Size variants
- Complex state combinations

**Benefits:** Cleaner than adding/removing multiple classes dynamically.

### Group Hover/Focus States

Use Tailwind's `group-*` variants for parent-child interactions.

**Pattern:**
1. Add `group` class to parent element
2. Use `group-hover:*`, `group-focus:*` on child elements
3. Child elements respond when parent is hovered/focused

**Use Cases:** Cards with hover effects, navigation items, interactive lists.

### Dark Mode Support

Use Tailwind's `dark:` variant for dark mode styles.

**Pattern:** Add `dark:` prefix to utilities for dark mode overrides.

**Requirements:**
- Always provide dark mode styles for components
- Use semantic color tokens (they handle light/dark automatically)
- Test in both light and dark modes

**Tokens:** Use `bg-card`, `text-foreground`, `border-border` which adapt to theme automatically.

### Animation Classes

Create reusable animation utilities in `@layer utilities`.

**Common Animations:**
- Fade in/out
- Slide in/out (from various directions)
- Scale in/out
- Spin (for loading indicators)

**Usage:** Apply animation classes to elements that need motion feedback.

---

## Accessibility (a11y)

### Focus States

Always provide visible focus indicators for accessibility.

**Required Elements:** Buttons, links, inputs, interactive elements

**Pattern:** Use `focus-visible:ring-2` for keyboard focus indication.

**Guidelines:**
- Focus ring should contrast with background
- Use `focus-visible:` (keyboard only) over `focus:` (all focus)
- Ensure minimum 2px visible outline

### ARIA State Styling

Style based on ARIA attributes for semantic state indication.

**Common ARIA States:**
- `aria-invalid` - Form validation errors
- `aria-selected` - Selected items (tabs, options)
- `aria-disabled` - Disabled state
- `aria-expanded` - Expanded/collapsed state

**Pattern:** Use `aria-[state]:utility` format for state-specific styling.

### Color Contrast

Ensure WCAG 2.1 AA compliance for color contrast ratios.

**Requirements:**
- Normal text: 4.5:1 minimum contrast ratio
- Large text (18pt+): 3:1 minimum contrast ratio
- UI components: 3:1 minimum contrast ratio

**Tools:** Use browser DevTools or online contrast checkers to verify.

**Theme Variables:** Use semantic tokens (`text-foreground`, `bg-background`) which are designed for proper contrast.

### Screen Reader Only Content

Create utility for visually hidden but screen-reader accessible content.

**Use Cases:**
- Hidden labels for icon-only buttons
- Skip navigation links
- Additional context for screen readers

**Classes:**
- `.sr-only` - Hidden from view, accessible to screen readers
- `.sr-only-focusable` - Visible when focused (for skip links)

---

## Performance Optimization

### Critical CSS

Keep critical styles minimal - only what's needed for above-the-fold content.

**Include:**
- Base reset styles
- Typography fundamentals
- Layout essentials

**Defer:** Component-specific styles, below-fold content styles.

### Avoid Deep Nesting

Keep specificity low by flattening BEM structure.

**Good:** Flat, single-level class names (`.card-title-icon`)

**Bad:** Nested selectors (`.card .header .title .icon`)

**Benefits:** Faster CSS, easier overrides, better maintainability.

### Reduce Redundancy

Use `@apply` to avoid repeating utilities across similar components.

**Pattern:** Define base class with common styles, extend with modifiers.

**Benefits:** DRY (Don't Repeat Yourself), easier maintenance, smaller CSS output.

---

## Common Patterns

### Card Component

**Structure:**
- `.card` - Root container with border, background, shadow
- `.card-header` - Top section with padding
- `.card-title` - Large, semibold heading
- `.card-description` - Muted secondary text
- `.card-body` - Main content area
- `.card-footer` - Bottom actions area

**Visual Properties:** Use theme colors, consistent spacing, subtle shadows.

### Form Components

**Structure:**
- `.form-group` - Container with vertical spacing
- `.form-label` - Label text with appropriate sizing
- `.form-input` - Input field with border, focus states
- `.form-error` - Error message in destructive color
- `.form-description` - Helper text in muted color

**States:** Include focus, error (`aria-invalid`), disabled states.

### Dialog/Modal

**Structure:**
- `.dialog-overlay` - Full-screen semi-transparent backdrop
- `.dialog-content` - Centered modal container with shadow
- `.dialog-header` - Header section with title alignment
- `.dialog-title` - Large heading
- `.dialog-description` - Secondary text
- `.dialog-footer` - Action buttons area

**Animations:** Fade in/out with scale effects using `data-[state]` attributes.

### Table

**Structure:**
- `.table` - Root table element
- `.table-header` - Header section with border
- `.table-head` - Header cell with medium font weight
- `.table-body` - Body section with row dividers
- `.table-row` - Row with hover state
- `.table-cell` - Data cell with padding

**States:** Hover effects on rows, selected state using `data-[state]`.

---

## Testing Styles

### Visual Regression Testing

Test styles with Playwright visual comparisons.

**Pattern:** Use `toHaveScreenshot()` to capture and compare visual snapshots.

**Test Cases:**
- Default state
- Hover state
- Focus state
- Disabled state
- Different variants

### Accessibility Testing

Test color contrast and focus states.

**Verify:**
- Focus indicators are visible
- Color contrast meets WCAG AA standards
- ARIA states affect styling correctly
- Keyboard navigation works properly

---

## Checklist

### Before Creating Component Styles

- [ ] Component uses BEM hyphen-separated naming (block-element-modifier)
- [ ] CSS file created in appropriate `src/styles/tailwind/` subdirectory
- [ ] Styles wrapped in `@layer components` (or `@layer utilities`)
- [ ] Imported in corresponding `_all.css` file
- [ ] No framework-specific scoped styles (e.g., `styleUrls`, `styles`, `scoped`)
- [ ] No inline styles in HTML template

### CSS Quality

- [ ] Uses `@apply` to compose Tailwind utilities
- [ ] Mobile-first responsive design with breakpoint utilities
- [ ] Uses theme variables (bg-card, text-foreground, etc.)
- [ ] Includes hover, focus, and active states
- [ ] Includes disabled and loading states
- [ ] Supports dark mode with `dark:` variant
- [ ] Provides accessible focus indicators
- [ ] Styles ARIA states (aria-invalid, aria-selected, etc.)
- [ ] Meets WCAG 2.1 AA color contrast requirements

### Organization

- [ ] File named following convention (component-name.css)
- [ ] Styles organized logically (block → elements → modifiers)
- [ ] Flat BEM structure (avoid deep nesting)
- [ ] Reusable modifiers for common variants
- [ ] Consistent with existing component patterns

### Documentation

- [ ] Complex patterns documented with comments
- [ ] Arbitrary values justified with comments
- [ ] Exported classes documented in component interface

---

## Common Mistakes to Avoid

### ❌ DON'T: Use Traditional BEM Format

**Bad:** `.card__header`, `.card__header--primary`, `.btn--large`

**Good:** `.card-header`, `.card-header-primary`, `.btn-large`

### ❌ DON'T: Use Component Scoped Styles

Never use framework-specific scoped styles (e.g., `styleUrls`, `styles`, `scoped` attribute). All styles must be in global CSS files in `src/styles/tailwind/`.

### ❌ DON'T: Use Inline Styles

Never use `style` attribute in HTML templates. Use component classes instead.

### ❌ DON'T: Use Visual Style Utilities Directly in HTML

**Bad:** `<button class="rounded-md bg-primary text-white shadow-sm">Button</button>`

**Good:** `<button class="btn btn-primary">Button</button>`

**Exception:** Layout and spacing utilities ARE allowed: `<div class="flex gap-4 p-6">...</div>`

### ❌ DON'T: Create Styles Outside Tailwind Directory

**Bad:** `src/app/shared/components/button/button.css`

**Good:** `src/styles/tailwind/components/button.css`

### ❌ DON'T: Use Deep Nesting

**Bad:** `.card .header .title .icon { }`

**Good:** `.card-title-icon { }`

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [BEM Methodology](http://getbem.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- Project Tailwind Config: `config/tailwind.config.js`

---

## Questions and Support

For styling questions:

1. Check existing components in `src/styles/tailwind/components/` for patterns
2. Review this instruction file for guidelines
3. Consult with team lead for complex styling decisions
4. Reference Tailwind CSS documentation for utility classes

Remember: Consistency is key. Follow the project's BEM + Tailwind pattern for all new styles.
