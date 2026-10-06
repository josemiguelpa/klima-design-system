#!/usr/bin/env node
// Blocks publishing icons without confirmed provenance (TASK-013) or synthetic builds.

import { fileURLToPath } from "node:url";
import { assertPublishable } from "@klima-ds/icons-core";

await assertPublishable("@klima-ds/icons-vue", fileURLToPath(new URL("../dist", import.meta.url)));
