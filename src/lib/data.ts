// Pure helpers shared by the UI and check.mjs (no React, no DOM).
import type { AssemblyInfo, IndexJson, Kind, TypeRow, TypesJson } from './types';

export const fmt = (n: number) => n.toLocaleString('en-US');
export const pct = (v: number, total: number) => (v / total * 100).toFixed(1) + '%';
export const nsName = (ns: string) => ns || '(global)';

export const KIND: Record<Kind, string> = { c: 'class', s: 'struct', e: 'enum', f: 'interface' };
export const KINDS: Kind[] = ['c', 's', 'e', 'f'];

const GAME = new Set(['Models', 'Battle', 'Global', 'Game', 'Client', 'Realm', 'UI', 'MainMenu', 'Network', 'Auth', 'Core', 'Content', 'Bootstrap', 'UiState', 'Analytics', 'AnalyticsWindows', 'Steam', 'Inputs', 'SharedType', 'TalkSystem', 'TargetSystem', 'Assembly-CSharp', 'Assembly-CSharp-firstpass']);
export const CATS = ['Game', 'Kefir', 'Unity', '.NET', 'Other'] as const;
export type Category = (typeof CATS)[number];
export function category(name: string): Category {
  const b = name.replace(/\.dll$/, '');
  if (GAME.has(b)) return 'Game';
  if (b.startsWith('Kefir.')) return 'Kefir';
  if (/^Unity(Engine)?\b/.test(b)) return 'Unity';
  if (/^(System|mscorlib|Mono)\b/.test(b)) return '.NET';
  return 'Other';
}

export const typeCount = (a: Pick<AssemblyInfo, 'c' | 's' | 'e' | 'f'>) => a.c + a.s + a.e + a.f;

// Hash routes: #/assembly/<i>, #/type/<i>, anything else is a page path.
export type Route = { kind: 'page'; path: string } | { kind: 'assembly'; id: number } | { kind: 'type'; id: number };
export function parseRoute(path: string): Route {
  const m = /^\/(assembly|type)\/(\d+)$/.exec(path);
  if (!m) return { kind: 'page', path };
  const id = Number(m[2]);
  return m[1] === 'assembly' ? { kind: 'assembly', id } : { kind: 'type', id };
}

// The assembly that owns a TypeDefIndex: the one with the greatest `start` <= idx.
export function asmForIndex(assemblies: AssemblyInfo[], idx: number): AssemblyInfo | null {
  let best: AssemblyInfo | null = null;
  for (const a of assemblies) if (a.start <= idx && (!best || a.start > best.start)) best = a;
  return best;
}

// Positions in `lower` (lowercased names) containing q: exact matches, then prefix, then the rest; at most `limit`.
export function rank(lower: string[], q: string, limit: number): number[] {
  const exact: number[] = [], prefix: number[] = [], other: number[] = [];
  lower.forEach((n, j) => {
    if (n === q) exact.push(j);
    else if (n.startsWith(q)) { if (prefix.length < limit) prefix.push(j); }
    else if (other.length < limit && n.includes(q)) other.push(j);
  });
  return exact.concat(prefix, other).slice(0, limit);
}

// Derived views of a loaded JSON object, computed once per object.
const derived = new WeakMap<object, Map<string, unknown>>();
function once<T>(obj: object, key: string, make: () => T): T {
  let m = derived.get(obj);
  if (!m) derived.set(obj, (m = new Map()));
  if (!m.has(key)) m.set(key, make());
  return m.get(key) as T;
}

// types.json names lowercased, for search.
export const lowerNames = (types: TypesJson) => once(types, 'lower', () => types.t.map(t => t[4].toLowerCase()));

// types.json grouped: asmI -> namespace -> types sorted by name.
export const typeIndex = (types: TypesJson) => once(types, 'tree', () => {
  const byAsm = new Map<number, Map<string, TypeRow[]>>();
  for (const t of types.t) {
    const ns = types.ns[t[3]];
    let m = byAsm.get(t[1]);
    if (!m) byAsm.set(t[1], (m = new Map()));
    let list = m.get(ns);
    if (!list) m.set(ns, (list = []));
    list.push(t);
  }
  for (const m of byAsm.values()) for (const list of m.values()) list.sort((x, y) => x[4].localeCompare(y[4]));
  return byAsm;
});

// Assemblies per category, most types first.
export const asmByCat = (index: IndexJson) => once(index, 'cats', () => {
  const m = new Map<Category, AssemblyInfo[]>(CATS.map(c => [c, []]));
  for (const a of index.assemblies) m.get(category(a.n))?.push(a);
  for (const list of m.values()) list.sort((x, y) => typeCount(y) - typeCount(x));
  return m;
});

// Every (assembly, namespace) pair, for the sidebar filter.
export interface NsEntry { a: AssemblyInfo; n: string; count: number; lower: string }
export const nsEntries = (index: IndexJson) => once(index, 'ns', (): NsEntry[] =>
  index.assemblies.flatMap(a => a.ns.map(([n, count]) => ({ a, n, count, lower: nsName(n).toLowerCase() }))));

// deps.json refs ({"i": [j, ...]}) reversed: who references each assembly.
export function dependents(refs: Record<string, number[]>): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  for (const [i, list] of Object.entries(refs)) for (const j of list) (out[j] ??= []).push(Number(i));
  return out;
}

const hex = (n: bigint) => '0x' + n.toString(16).toUpperCase();
export interface Converted { va: string; off: string; dec: string; rg: string }
export function convert(text: string): Converted | null {
  const s = text.trim();
  if (!/^(0x[0-9a-f]+|\d+)$/i.test(s)) return null;
  const rva = BigInt(s);
  return { va: hex(rva + 0x180000000n), off: rva >= 0x1000n ? hex(rva - 0x1000n) : '—', dec: rva.toString(), rg: `rg -n -A1 "RVA: ${hex(rva)} " dump.cs` };
}
console.assert(convert('0x390DC50')?.va === '0x18390DC50' && convert('0x390DC50')?.off === '0x390CC50' && convert('59825232')?.dec === '59825232' && convert('59825232')?.va === '0x18390DC50' && convert('zz') === null, 'convert self-check');

// Cached JSON fetch of data/<path>. A failed fetch is not cached so it can be retried.
const cache = new Map<string, Promise<unknown>>();
export function load<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    p = fetch('data/' + path).then(r => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json();
    }).catch(e => { cache.delete(path); throw e; });
    cache.set(path, p);
  }
  return p as Promise<T>;
}
