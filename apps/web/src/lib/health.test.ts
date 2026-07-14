import assert from "node:assert/strict";
import { test } from "node:test";

import { getHealth } from "./health.ts";

test("getHealth returns ok payload", () => {
  assert.deepEqual(getHealth(), { status: "ok", service: "web" });
});
