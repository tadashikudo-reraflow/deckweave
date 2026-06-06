import { XMLParser } from "fast-xml-parser";

export const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: false,
  parseAttributeValue: false,
  trimValues: false
});

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function first<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function attr(node: unknown, name: string): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const record = node as Record<string, unknown>;
  const value = record[name] ?? record[`@_${name}`];
  return typeof value === "string" ? value : undefined;
}
