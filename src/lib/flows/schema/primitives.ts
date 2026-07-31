export type JsonSchema = Record<string, unknown>

/**
 * Nearly every Flow JSON property may be a dynamic binding string, e.g.
 * "${data.foo}" or "${form.bar}". A naive `{"type":"boolean"}` on a bound
 * field would false-positive constantly, so every scalar helper below
 * accepts the real type OR a dynamic binding.
 */
export const DYNAMIC_REF: JsonSchema = {
  type: "string",
  pattern: "^\\$\\{[a-zA-Z_][\\w.\\[\\]'\"-]*\\}$",
  description: "Dynamic binding, e.g. ${data.items} or ${form.email}",
}

/**
 * Boolean-context properties (visible, enabled, required, ...) also accept a
 * backtick-quoted condition expression mixing dynamic refs with operators,
 * e.g. `${screen.A.data.x} == 'grad'` or
 * `(${a} == 'x') || (${b} == 'y')`.
 */
export const CONDITION_EXPR: JsonSchema = {
  type: "string",
  pattern: "^`.*\\$\\{[a-zA-Z_][\\w.\\[\\]'\"-]*\\}.*`$",
  description:
    "Condition expression, e.g. `${screen.A.data.x} == 'grad'` or `(${a} == 'x') || (${b} == 'y')`",
}

// anyOf (not oneOf): the "real type" branch has no constraint that excludes
// a dynamic-ref/condition string, so such a value can satisfy more than one
// branch at once. oneOf would reject that as ambiguous even though it's the
// intended match.
export function str(extra: JsonSchema = {}): JsonSchema {
  return { anyOf: [{ type: "string", ...extra }, DYNAMIC_REF] }
}

export function bool(): JsonSchema {
  return { anyOf: [{ type: "boolean" }, DYNAMIC_REF, CONDITION_EXPR] }
}

export function num(extra: JsonSchema = {}): JsonSchema {
  return { anyOf: [{ type: "number", ...extra }, DYNAMIC_REF] }
}

export function arrayOf(items: JsonSchema): JsonSchema {
  return { anyOf: [{ type: "array", items }, DYNAMIC_REF] }
}

export function enumOf(values: readonly string[]): JsonSchema {
  return { anyOf: [{ enum: [...values] }, DYNAMIC_REF] }
}

export function obj(
  properties: JsonSchema,
  required: string[] = []
): JsonSchema {
  return { type: "object", properties, required }
}

export const visibleRef = bool
export const labelRef = () => str()
