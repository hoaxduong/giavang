# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application using React 19, TypeScript, and Tailwind CSS 4. The project is configured with shadcn/ui components (New York style) and uses pnpm as the package manager.

## Development Commands

### Running the application
```bash
pnpm dev           # Start development server at http://localhost:3000
pnpm build         # Create production build
pnpm start         # Run production server
pnpm lint          # Run ESLint (uses flat config format)
```

### Package management
This project uses pnpm version 10.24.0. Always use `pnpm` instead of npm or yarn.

## Architecture

### Project Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/lib/` - Utility functions and shared code
- `src/components/` - React components (will include UI components from shadcn/ui)
- TypeScript path alias: `@/*` maps to `./src/*`

### Styling System
- **Tailwind CSS 4** with PostCSS plugin (`@tailwindcss/postcss`)
- **tw-animate-css** for animations
- **shadcn/ui** configuration:
  - Style: New York
  - Base color: neutral
  - CSS variables enabled
  - Component aliases: `@/components`, UI components at `@/components/ui`
  - Icon library: lucide-react
- Custom dark mode implementation using `.dark` class with `@custom-variant`
- Design tokens use OKLCH color space for consistent colors across displays
- Utility function `cn()` in `@/lib/utils` for conditional class merging (clsx + tailwind-merge)

### TypeScript Configuration
- Target: ES2017
- Module resolution: bundler
- Strict mode enabled
- JSX runtime: react-jsx (automatic JSX transform, no need to import React)
- Path alias `@/*` configured for `./src/*`

### Next.js Configuration
- App Router (Next.js 13+)
- React Server Components enabled
- TypeScript configured
- Font optimization using next/font with Geist fonts (Geist Sans and Geist Mono)

### ESLint Configuration
- Uses flat config format (`eslint.config.mjs`)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Adding shadcn/ui Components

When adding shadcn/ui components, use the CLI:
```bash
pnpx shadcn@latest add <component-name>
```

Components will be added to `src/components/ui/` with proper styling and configuration based on `components.json`.

## Key Dependencies

- **Next.js 16.0.5** - React framework with App Router
- **React 19.2.0** - Latest React with React Server Components
- **Tailwind CSS 4** - Utility-first CSS framework (v4 with new PostCSS architecture)
- **class-variance-authority** - Component variant management
- **lucide-react** - Icon library
- **tailwind-merge** - Merge Tailwind classes intelligently
