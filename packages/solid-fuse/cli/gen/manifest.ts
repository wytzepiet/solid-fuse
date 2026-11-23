/**
 * The manifest `solid_fuse_gen` writes (packages/solid-fuse/gen, format 1).
 * The emitters only read it; every Dart string in it already uses the
 * prefixes in `imports`.
 */

export const MANIFEST_FORMAT = 1;

export type Ref =
  | { k: "bool" | "int" | "double" | "num" | "String" | "Object" | "dynamic"; null?: true }
  | { k: "enum" | "data" | "handle"; id: string; null?: true }
  | { k: "list" | "set" | "iterable"; of: Ref; null?: true }
  | { k: "map"; key: Ref; of: Ref; null?: true }
  | { k: "widget"; as?: string; null?: true }
  | { k: "key"; null?: true }
  | { k: "typeParam"; name: string; bound?: string; null?: true }
  /** Supplied on the Dart side, never by JS: a TickerProvider (`vsync`),
   *  or the BuildContext the adapter builds in (`context`). In a callback's
   *  arguments, one Dart passes and JS doesn't get. */
  | { k: "supplied"; of: "vsync" | "context" }
  | { k: "omitted"; reason: string }
  | { k: "void" }
  | FnRef;

export interface FnRef {
  k: "fn";
  args: { name: string; type: Ref }[];
  ret: Ref;
  context?: true;
  async?: true;
  sync?: true;
  dart: string;
  null?: true;
}

export interface Param {
  name: string;
  named: boolean;
  required: boolean;
  nullable?: true;
  deprecated?: true;
  doc?: string;
  /** Present when the parameter crosses the bridge; else `skip` is. */
  type?: Ref;
  dart?: string;
  /** Dart source of the default. */
  default?: string;
  /** The default as a plain value, when it is one. */
  defaultValue?: unknown;
  skip?: string;
  /** Required but nullable and skipped: the adapter passes null. */
  passNull?: true;
}

export interface Invocable {
  name?: string;
  deprecated?: true;
  params: Param[];
}

export interface Variant extends Invocable {
  /** `Class` or `Class.ctor`. */
  tag: string;
  /** Dart type of the subclass, when the variant is a subclass's. */
  class?: string;
}

export interface Const {
  /** `Owner.field`. */
  name: string;
  dart: string;
  deprecated?: true;
}

export interface Field {
  name: string;
  type: Ref;
}

export interface DataType {
  kind: "data";
  name: string;
  dart: string;
  doc?: string;
  deprecated?: true;
  abstract?: boolean;
  /** Input side (JS -> Dart). Absent for types that are only read. */
  variants?: Variant[];
  consts?: Const[];
  /** Short forms: a value of `kind` that `fn` (Dart) turns into this type. */
  shorthands?: { kind: "bool" | "number" | "string" | "list"; fn: string; type: Ref; dart: string; ts?: string }[];
  inputSkipped?: string;
  /** An abstract class JS implements: an object with a function per
   *  abstract member, which a generated subclass calls. */
  implement?: Implement;
  implementSkipped?: string;
  /** Output side (Dart -> JS). */
  fields?: Field[];
  outputSkipped?: string;
}

export interface Implement {
  /** The superclass constructor the subclass calls; none is the unnamed one. */
  ctor?: string;
  members: {
    name: string;
    getter?: true;
    /** The override's parameters (all required and positional). */
    params: { name: string; dart: string }[];
    /** The override's return type. */
    ret: string;
    fn: FnRef;
  }[];
}

export interface EnumType {
  kind: "enum";
  name: string;
  dart: string;
  doc?: string;
  deprecated?: true;
  values: (string | { name: string; deprecated: true })[];
}

export interface HandleMethod extends Invocable {
  name: string;
  doc?: string;
  ret: Ref;
  async?: true;
}

export interface HandleType {
  kind: "handle";
  name: string;
  dart: string;
  doc?: string;
  deprecated?: true;
  abstract?: boolean;
  supertypes: string[];
  ctors: Invocable[];
  /** Members, for the handles JS creates (`Manifest.handles`). */
  /** Getters JS mirrors (a Listenable's, re-read when it notifies). */
  state?: Field[];
  setters?: { name: string; type: Ref; dart: string; nullable?: true }[];
  methods?: HandleMethod[];
  /** Stream getters. */
  streams?: Field[];
  /** Has a `dispose()` to call when JS lets go. */
  disposable?: true;
}

export type TypeDecl = DataType | EnumType | HandleType;

export interface Widget {
  id: string;
  component: string;
  class: string;
  ctor?: string;
  dart: string;
  deprecated?: true;
  doc?: string;
  typeParams?: { name: string; bound?: string }[];
  params: Param[];
  children?: { param: string; many: boolean };
  textChild?: string;
}

export interface Manifest {
  format: number;
  generator: string;
  fingerprint: string;
  inputHash?: string;
  imports: { uri: string; prefix: string }[];
  widgets: Widget[];
  handles: string[];
  types: Record<string, TypeDecl>;
  skipped: { item: string; reason: string }[];
}

export function readManifest(json: string): Manifest {
  const m = JSON.parse(json) as Manifest;
  if (m.format !== MANIFEST_FORMAT) {
    throw new Error(`manifest format ${m.format}, this CLI reads ${MANIFEST_FORMAT}: update solid_fuse_gen or the CLI`);
  }
  return m;
}

/** `package:flutter/widgets.dart` -> `flutter`; `dart:ui` -> `flutter`. */
export function moduleOf(uri: string): string {
  if (uri.startsWith("dart:")) return "flutter";
  const m = /^package:([^/]+)\//.exec(uri);
  return m ? m[1] : "flutter";
}

/** The import uri of a type id (`<uri>#<Dart type>`). */
export function uriOf(id: string): string {
  return id.slice(0, id.indexOf("#"));
}

/** A parameter the caller has to give. */
export function mustSupply(p: Param): boolean {
  return p.required && !p.nullable;
}
