// Shapes of the files in public/data, as written by scripts/build-data.py and the deps script.

export type Kind = 'c' | 's' | 'e' | 'f'; // class, struct, enum, interface

/** data/index.json */
export interface IndexJson {
  stats: { assemblies: number; types: number; methods: number; fields: number };
  assemblies: AssemblyInfo[]; // sorted by i
}
export interface AssemblyInfo {
  i: number;
  n: string; // file name, e.g. "Models.dll"
  start: number; // first TypeDefIndex of the assembly
  c: number;
  s: number;
  e: number;
  f: number;
  m: number; // methods
  ns: [name: string, count: number][]; // every namespace, count desc; "" is the global namespace
}

/** data/types.json; t is sorted by TypeDefIndex */
export interface TypesJson {
  ns: string[];
  t: TypeRow[];
}
export type TypeRow = [typeDefIndex: number, asmI: number, kind: Kind, nsIndex: number, name: string];

/** data/asm/<i>.json */
export interface AsmJson {
  i: number;
  n: string;
  types: TypeDef[];
}
export interface TypeDef {
  i: number;
  ns: string;
  k: Kind;
  name: string;
  decl: string;
  attrs: string[];
  fields: Field[];
  props: string[];
  methods: Method[];
}
export interface Field {
  t: string; // declaration
  o: string | null; // offset; null for const/static fields
  a: string[]; // attribute lines
}
export interface Method {
  s: string; // signature
  rva: string | null;
  slot?: number;
  a: string[];
  g?: GenericInst[];
}
export type GenericInst = [rva: string | null, name: string];

/** data/deps.json (optional) */
export interface DepsJson {
  tool: string;
  refs: Record<string, number[]>; // assembly i -> referenced assembly i's
  unresolved: Record<string, string[]>; // assembly i -> referenced names with no matching assembly
  failed: string[];
}
