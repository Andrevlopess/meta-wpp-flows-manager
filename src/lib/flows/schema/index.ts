import { ACTION_SCHEMA } from "./actions"
import { CAROUSEL_ITEM, DATA_SOURCE_ITEM, NAVIGATION_ITEM } from "./data-source"
import { COMPONENTS, FLOW_COMPONENT_TYPES } from "./components"
import { str, type JsonSchema } from "./primitives"
import { DATA_DECLARATION, LAYOUT, SCREEN, SCREEN_DATA } from "./screen"

export const FLOW_SCHEMA_VERSIONS = [
  "7.3",
  "7.2",
  "7.1",
  "7.0",
  "6.3",
  "6.2",
  "6.1",
  "6.0",
  "5.1",
] as const

const componentUnion: JsonSchema = {
  oneOf: FLOW_COMPONENT_TYPES.map((name) => ({
    $ref: `#/$defs/components/${name}`,
  })),
}

// draft-07: `$defs` is treated as a plain object by vscode-json-languageservice's
// resolver, and `$ref: "#/$defs/x"` is pure JSON-pointer resolution, so this
// works despite `$defs` technically being 2019-09 naming.
export const FLOW_JSON_SCHEMA: JsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "WhatsApp Flow JSON",
  type: "object",
  required: ["version", "screens"],
  properties: {
    version: { enum: [...FLOW_SCHEMA_VERSIONS] },
    data_api_version: { enum: ["3.0"] },
    routing_model: {
      type: "object",
      additionalProperties: { type: "array", items: { type: "string" } },
    },
    data_channel_uri: str(),
    screens: { type: "array", minItems: 1, items: { $ref: "#/$defs/screen" } },
  },
  $defs: {
    component: componentUnion,
    components: COMPONENTS,
    screen: SCREEN,
    layout: LAYOUT,
    screenData: SCREEN_DATA,
    dataDeclaration: DATA_DECLARATION,
    action: ACTION_SCHEMA,
    dataSourceItem: DATA_SOURCE_ITEM,
    navigationItem: NAVIGATION_ITEM,
    carouselItem: CAROUSEL_ITEM,
  },
}

export { FLOW_COMPONENT_TYPES }
