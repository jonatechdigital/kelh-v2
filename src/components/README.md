# Components Directory

This directory contains reusable React components for the KELH V2 application.

## Available Components

### Header

**Location:** `Header.tsx`

**Description:** Main application header shown on all authenticated pages.

**Features:**
- Displays app name and description
- Shows logged-in user's email
- Provides sign out functionality
- Automatically hidden on login/signup pages

**Usage:**
Already included in `src/app/layout.tsx`. The header appears automatically on all pages.

**Props:** None (Server Component that fetches user data internally)

## Adding New Components

When creating new components:

1. Create a new `.tsx` file in this directory
2. Use TypeScript for type safety
3. Add proper JSDoc comments
4. Export as named or default export
5. Update this README with component documentation

### Example Component Structure

```typescript
/**
 * ComponentName - Brief description
 * 
 * @param {Props} props - Component props
 * @returns {JSX.Element}
 */
export function ComponentName({ prop1, prop2 }: Props) {
  // Component logic
  return (
    // JSX
  );
}
```

## Component Guidelines

- **Server Components by default** - Use 'use client' only when needed (for interactivity)
- **TypeScript** - Always type your props and state
- **Tailwind CSS** - Use Tailwind for styling (already configured)
- **Accessibility** - Include proper ARIA labels and semantic HTML
- **Responsive** - Design mobile-first, test on different screen sizes
