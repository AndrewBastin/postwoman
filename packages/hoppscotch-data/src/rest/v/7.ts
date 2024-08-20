import { z } from "zod";
import { defineVersion } from "verzod";
import { V6_SCHEMA } from "./6";
import { v4 as uuidV4 } from "uuid";

// With V7 we introduce a new field `_ref_id` which is a unique identifier for the request
// used internally for sync resolution sorta cases. If the value is not present
// on load, then we generate a new one. Also make sure to regenerate it in import kinds of cases

export const V7_SCHEMA = V6_SCHEMA.extend({
  v: z.literal("7"),
  _ref_id: z.string()
    .catch(() => uuidV4())
})

export default defineVersion({
  schema: V7_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V6_SCHEMA>) {
    return {
      ...old,
      v: "7" as const,
      _ref_id: uuidV4()
    }
  }
})
