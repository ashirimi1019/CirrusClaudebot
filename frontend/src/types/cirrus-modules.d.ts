/**
 * Wildcard ambient module declarations for the monorepo skill / lib aliases.
 *
 * These aliases are resolved at build time by webpack (via next.config.ts):
 *   @cirrus/skills/*  →  ../src/core/skills/*
 *   @cirrus/lib/*     →  ../src/lib/*
 *
 * Keeping the resolution in webpack (not in tsconfig paths) prevents the
 * frontend TypeScript compiler from crawling into the monorepo source tree
 * and surfacing pre-existing type errors that live in the skill files.
 *
 * Each imported module is treated as `any` here; the actual implementation
 * types are checked by the root tsconfig.json when running the CLI.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module '@cirrus/skills/*';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module '@cirrus/lib/*';
