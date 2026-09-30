/// <reference types="nativewind/types" />

// TypeScript 6 rejects a side-effect import with no declaration, and the
// global stylesheet is imported for its Tailwind output, not its exports.
declare module '*.css';
