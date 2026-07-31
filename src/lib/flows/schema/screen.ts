import { arrayOf, bool, str, type JsonSchema } from "./primitives"

export const DATA_DECLARATION: JsonSchema = {
  type: "object",
  required: ["type"],
  properties: {
    type: { enum: ["string", "number", "boolean", "array", "object"] },
    __example__: {},
    items: {},
    properties: {},
  },
}

export const SCREEN_DATA: JsonSchema = {
  type: "object",
  additionalProperties: { $ref: "#/$defs/dataDeclaration" },
}

export const LAYOUT: JsonSchema = {
  type: "object",
  required: ["type", "children"],
  properties: {
    type: { const: "SingleColumnLayout" },
    children: arrayOf({ $ref: "#/$defs/component" }),
  },
}

export const SCREEN: JsonSchema = {
  type: "object",
  required: ["id", "layout"],
  properties: {
    id: {
      type: "string",
      pattern: "^[A-Za-z_][A-Za-z0-9_]*$",
      description: "Screen identifier, referenced by `next.name` actions.",
    },
    title: str(),
    subtitle: str(),
    terminal: bool(),
    success: bool(),
    refresh_on_back: bool(),
    sensitive: { type: "array", items: { type: "string" } },
    data: { $ref: "#/$defs/screenData" },
    layout: { $ref: "#/$defs/layout" },
  },
}
