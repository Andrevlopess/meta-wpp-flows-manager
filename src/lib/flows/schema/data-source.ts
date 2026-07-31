import { arrayOf, bool, str, type JsonSchema } from "./primitives"

export const DATA_SOURCE_ITEM: JsonSchema = {
  type: "object",
  required: ["id", "title"],
  properties: {
    id: str(),
    title: str(),
    description: str(),
    metadata: str(),
    image: str(),
    "alt-text": str(),
    enabled: bool(),
  },
}

export const NAVIGATION_ITEM: JsonSchema = {
  type: "object",
  required: ["id", "main-content"],
  properties: {
    id: str(),
    "main-content": {
      type: "object",
      required: ["title"],
      properties: {
        title: str(),
        metadata: str(),
        description: str(),
      },
    },
    start: { type: "object" },
    end: { type: "object" },
    badge: str(),
    tags: arrayOf(str()),
    "on-click-action": { $ref: "#/$defs/action" },
  },
}

export const CAROUSEL_ITEM: JsonSchema = {
  type: "object",
  required: ["src"],
  properties: {
    src: str(),
    "alt-text": str(),
  },
}

export const DATA_SOURCE_ARRAY = arrayOf({ $ref: "#/$defs/dataSourceItem" })
export const NAVIGATION_LIST_ARRAY = arrayOf({ $ref: "#/$defs/navigationItem" })
export const CAROUSEL_ARRAY = arrayOf({ $ref: "#/$defs/carouselItem" })
