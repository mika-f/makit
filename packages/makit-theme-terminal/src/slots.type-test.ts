/**
 * Compile-time only: asserts every export in `index.ts` still matches its
 * slot's public Slot Props (THEME §3.3), so a props change in
 * `makit-runtime` surfaces as a `typecheck` failure here rather than as a
 * Next.js build error in a project that uses the theme.
 *
 * Not an entry point and not imported by anything — `tsdown` never emits it.
 */
import type { ThemeComponentOverrides } from "@natsuneko-laboratory/makit-runtime";
import * as theme from "./index.js";

const _conformsToSlotProps: ThemeComponentOverrides = theme;
void _conformsToSlotProps;
