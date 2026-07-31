import { arrayOf, bool, enumOf, num, str, type JsonSchema } from "./primitives"

/**
 * Adding a component = one entry here. `type`'s enum, the `oneOf` union, and
 * `FLOW_COMPONENT_TYPES` all derive from this map — never hand-maintain a
 * parallel list elsewhere.
 */
function component(
  name: string,
  opts: {
    required?: string[]
    properties?: JsonSchema
    description?: string
  } = {}
): JsonSchema {
  return {
    type: "object",
    title: name,
    description: opts.description,
    required: ["type", ...(opts.required ?? [])],
    properties: {
      type: { const: name },
      visible: bool(),
      ...opts.properties,
    },
  }
}

const dataSourceProp = arrayOf({ $ref: "#/$defs/dataSourceItem" })
const actionProp = { $ref: "#/$defs/action" }

export const COMPONENTS: Record<string, JsonSchema> = {
  // Text & rich content
  TextHeading: component("TextHeading", {
    required: ["text"],
    properties: { text: str() },
  }),
  TextSubheading: component("TextSubheading", {
    required: ["text"],
    properties: { text: str() },
  }),
  TextBody: component("TextBody", {
    required: ["text"],
    properties: {
      text: { anyOf: [str(), arrayOf(str())] },
      "font-weight": enumOf(["bold", "italic", "bold_italic", "normal"]),
      strikethrough: bool(),
      markdown: bool(),
    },
  }),
  TextCaption: component("TextCaption", {
    required: ["text"],
    properties: {
      text: { anyOf: [str(), arrayOf(str())] },
      "font-weight": enumOf(["bold", "italic", "bold_italic", "normal"]),
      strikethrough: bool(),
      markdown: bool(),
    },
  }),
  RichText: component("RichText", {
    required: ["text"],
    properties: { text: arrayOf(str()) },
  }),

  // Media
  Image: component("Image", {
    required: ["src"],
    properties: {
      src: str(),
      width: num(),
      height: num(),
      "scale-type": enumOf(["cover", "contain"]),
      "aspect-ratio": num(),
      "alt-text": str(),
    },
  }),
  ImageCarousel: component("ImageCarousel", {
    required: ["images"],
    properties: {
      images: arrayOf({ $ref: "#/$defs/carouselItem" }),
      "aspect-ratio": num(),
      "scale-type": enumOf(["cover", "contain"]),
    },
  }),
  Video: component("Video", {
    required: ["source"],
    properties: { source: str(), thumbnail: str() },
  }),

  // Inputs
  TextInput: component("TextInput", {
    required: ["name", "label"],
    properties: {
      name: str(),
      label: str(),
      "input-type": enumOf([
        "text",
        "number",
        "email",
        "password",
        "passcode",
        "phone",
      ]),
      required: bool(),
      "helper-text": str(),
      "init-value": str(),
      pattern: str(),
      "min-chars": num(),
      "max-chars": num(),
      enabled: bool(),
      visible: bool(),
    },
  }),
  TextArea: component("TextArea", {
    required: ["name", "label"],
    properties: {
      name: str(),
      label: str(),
      required: bool(),
      "helper-text": str(),
      "init-value": str(),
      "max-length": num(),
      enabled: bool(),
    },
  }),
  CheckboxGroup: component("CheckboxGroup", {
    required: ["name", "data-source"],
    properties: {
      name: str(),
      label: str(),
      required: bool(),
      "data-source": dataSourceProp,
      "init-value": arrayOf(str()),
      "min-selected-items": num(),
      "max-selected-items": num(),
      enabled: bool(),
      "media-size": enumOf(["regular", "large"]),
    },
  }),
  RadioButtonsGroup: component("RadioButtonsGroup", {
    required: ["name", "data-source"],
    properties: {
      name: str(),
      label: str(),
      required: bool(),
      "data-source": dataSourceProp,
      "init-value": str(),
      enabled: bool(),
      "media-size": enumOf(["regular", "large"]),
    },
  }),
  Dropdown: component("Dropdown", {
    required: ["name", "label", "data-source"],
    properties: {
      name: str(),
      label: str(),
      required: bool(),
      "data-source": dataSourceProp,
      "init-value": str(),
      enabled: bool(),
    },
  }),
  ChipsSelector: component("ChipsSelector", {
    required: ["name", "data-source"],
    properties: {
      name: str(),
      label: str(),
      required: bool(),
      "data-source": dataSourceProp,
      "init-value": arrayOf(str()),
      "max-selected-items": num(),
      description: str(),
    },
  }),
  DatePicker: component("DatePicker", {
    required: ["name", "label"],
    properties: {
      name: str(),
      label: str(),
      required: bool(),
      "init-value": str(),
      "min-date": str(),
      "max-date": str(),
      "unavailable-dates": arrayOf(str()),
      "helper-text": str(),
      enabled: bool(),
    },
  }),
  CalendarPicker: component("CalendarPicker", {
    required: ["name", "label"],
    properties: {
      name: str(),
      label: {
        oneOf: [
          str(),
          {
            type: "object",
            properties: { "start-date": str(), "end-date": str() },
          },
        ],
      },
      mode: enumOf(["single", "range"]),
      required: bool(),
      "init-value": { type: "object" },
      "min-date": str(),
      "max-date": str(),
      "unavailable-dates": arrayOf(str()),
      "helper-text": str(),
    },
  }),
  PhotoPicker: component("PhotoPicker", {
    required: ["name"],
    properties: {
      name: str(),
      label: str(),
      description: str(),
      "photo-source": enumOf(["camera_gallery", "camera", "gallery"]),
      "min-uploaded-photos": num(),
      "max-uploaded-photos": num(),
      "max-file-size-kb": num(),
      required: bool(),
    },
  }),
  DocumentPicker: component("DocumentPicker", {
    required: ["name"],
    properties: {
      name: str(),
      label: str(),
      description: str(),
      "min-uploaded-documents": num(),
      "max-uploaded-documents": num(),
      "max-file-size-kb": num(),
      "allowed-mime-types": arrayOf(str()),
      required: bool(),
    },
  }),
  OptIn: component("OptIn", {
    required: ["name", "label"],
    properties: {
      name: str(),
      label: str(),
      required: bool(),
      "init-value": bool(),
      "on-click-action": actionProp,
    },
  }),

  // Navigation & actions
  Footer: component("Footer", {
    required: ["label", "on-click-action"],
    properties: {
      label: str(),
      "on-click-action": actionProp,
      "left-caption": str(),
      "center-caption": str(),
      "right-caption": str(),
      enabled: bool(),
    },
  }),
  EmbeddedLink: component("EmbeddedLink", {
    required: ["text", "on-click-action"],
    properties: {
      text: str(),
      "on-click-action": actionProp,
      "font-weight": enumOf(["bold", "italic", "bold_italic", "normal"]),
    },
  }),
  NavigationList: component("NavigationList", {
    required: ["name", "list-items"],
    properties: {
      name: str(),
      "list-items": arrayOf({ $ref: "#/$defs/navigationItem" }),
    },
  }),

  // Structure & logic
  Form: component("Form", {
    required: ["name", "children"],
    properties: {
      name: str(),
      "init-values": { type: "object" },
      "error-messages": { type: "object" },
      children: arrayOf({ $ref: "#/$defs/component" }),
    },
  }),
  If: component("If", {
    required: ["condition", "then"],
    properties: {
      condition: str(),
      then: arrayOf({ $ref: "#/$defs/component" }),
      else: arrayOf({ $ref: "#/$defs/component" }),
    },
  }),
  Switch: component("Switch", {
    required: ["value", "cases"],
    properties: {
      value: str(),
      cases: {
        type: "object",
        additionalProperties: arrayOf({ $ref: "#/$defs/component" }),
      },
    },
  }),
}

export const FLOW_COMPONENT_TYPES = Object.keys(COMPONENTS)
