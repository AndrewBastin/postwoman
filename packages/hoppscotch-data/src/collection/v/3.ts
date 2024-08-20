import { defineVersion } from "verzod"
import { z } from "zod"
import { v2_baseCollectionSchema } from "./2"
import { v4 as uuidV4 } from "uuid"

// V3 of collection schema introduces _ref_id field which is a unique identifier
// used internally for sync resolution sorta cases. If the value is not present on load,
// then we generate a new one. Also make sure to regenerate it in import kinds of cases

export const v3_baseCollectionSchema = v2_baseCollectionSchema.extend({
  v: z.literal(3),
  _ref_id: z.string()
    .catch(() => uuidV4())
})

type Input = z.input<typeof v3_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v3_baseCollectionSchema> & {
  folders: Output[]
}

export const V3_SCHEMA: z.ZodType<Output, z.ZodTypeDef, Input> = v3_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(V3_SCHEMA))
})

export default defineVersion({
  initial: false,
  schema: V3_SCHEMA,
  up(old: z.infer<typeof V3_SCHEMA>) {
    const result: z.infer<typeof V3_SCHEMA> = {
      ...old,
      v: 3,
      _ref_id: uuidV4()
    }

    return result
  }
})
