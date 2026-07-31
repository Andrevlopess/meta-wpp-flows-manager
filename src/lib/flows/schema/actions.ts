import { str, type JsonSchema } from "./primitives"

const nextRef: JsonSchema = {
  type: "object",
  required: ["type", "name"],
  properties: {
    type: { enum: ["screen", "plugin"] },
    name: str(),
  },
}

function actionVariant(name: string, extra: JsonSchema = {}): JsonSchema {
  return {
    type: "object",
    title: `action:${name}`,
    required: ["name"],
    properties: { name: { const: name }, ...extra },
  }
}

export const ACTION_SCHEMA: JsonSchema = {
  oneOf: [
    actionVariant("navigate", {
      next: nextRef,
      payload: { type: "object" },
    }),
    actionVariant("complete", { payload: { type: "object" } }),
    actionVariant("data_exchange", { payload: { type: "object" } }),
    actionVariant("update_data", { payload: { type: "object" } }),
    actionVariant("open_url", { url: str() }),
  ],
}
