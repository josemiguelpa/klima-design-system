#!/usr/bin/env node
// Generates dist/ from the icon inventory and SVG sources of @klima-ds/icons-core.
// Without pulled sources (e.g. CI) it builds a synthetic, never-publishable set.

import { fileURLToPath } from "node:url";
import { collectStyles, renderAstro, writeBuild } from "@klima-ds/icons-core";

const outDir = fileURLToPath(new URL("../dist", import.meta.url));
const { styles, buildInfo } = await collectStyles("icons-astro");
await writeBuild("icons-astro", outDir, renderAstro(styles), buildInfo);
