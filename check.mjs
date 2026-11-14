// Checks the lookups, the sidebar tree index, the C# tokenizer and deps.json (when present) against public/data. Run: bun run check
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { asmByCat, asmForIndex, dependents, lowerNames, parseRoute, rank, typeIndex } from './src/lib/data.ts';
import { tokenize } from './src/lib/syntax.ts';

const path = p => new URL('./public/data/' + p, import.meta.url);
const read = p => JSON.parse(readFileSync(path(p), 'utf8'));
const index = read('index.json');
const types = read('types.json');
const A = index.assemblies;

A.forEach((a, k) => assert.equal(a.i, k, 'index.json assemblies must be sorted by i'));
assert.equal(types.t.length, index.stats.types);
types.t.forEach((t, k) => assert.equal(t[0], k, 'types.json row k must be TypeDefIndex k (the tree reads types.t[idx])'));

// Tree index: every type is in exactly one (assembly, namespace) list; namespace counts match index.json.
const tree = typeIndex(types);
let listed = 0;
for (const a of A) for (const [ns, count] of a.ns) { const n = tree.get(a.i)?.get(ns)?.length ?? 0; assert.equal(n, count, `${a.n} / ${ns || '(global)'}`); listed += n; }
assert.equal(listed, types.t.length);
assert.equal([...asmByCat(index).values()].reduce((x, l) => x + l.length, 0), A.length);
assert.equal(types.t[rank(lowerNames(types), 'clienthost', 5)[0]][0], 35585, 'exact match ranks first');

// Every type: the lookup agrees with the assembly types.json records for it.
for (const [i, asmI] of types.t) assert.equal(asmForIndex(A, i).i, asmI, `TypeDefIndex ${i}`);

const last = types.t.at(-1)[0];
const expected = { 4: 'PCG32', 7: 'DisconnectReasons', 35585: 'ClientHost', [last]: types.t.at(-1)[4] };
for (const [i, name] of Object.entries(expected)) {
  const a = asmForIndex(A, +i);
  const t = read(`asm/${a.i}.json`).types.find(x => x.i === +i);
  assert.equal(t?.name, name, `TypeDefIndex ${i}`);
  console.log(`#${i} -> ${a.n} (asm/${a.i}.json): ${t.ns || '(global)'}.${t.name}`);
}
console.log(`lookup and tree index ok for all ${types.t.length} types`);

// Tokenizer: never throws and gives back the input for every declaration, field, property and signature.
let sigs = 0;
const rt = s => { assert.equal(tokenize(s).map(t => t[1]).join(''), s); sigs++; };
for (const a of A) for (const t of read(`asm/${a.i}.json`).types) {
  rt(t.decl); t.fields.forEach(f => rt(f.t)); t.props.forEach(rt); t.methods.forEach(m => rt(m.s));
}
assert.deepEqual(tokenize('public static ulong GenerateState(ulong seed)').filter(t => t[0] === 'name'), [['name', 'GenerateState']]);
assert.deepEqual(tokenize('public sealed class Foo<T> : Bar').filter(t => t[0] === 'name'), [['name', 'Foo']]);
console.log(`tokenizer ok on ${sigs} declarations`);

assert.deepEqual(parseRoute('/type/35585'), { kind: 'type', id: 35585 });
assert.deepEqual(parseRoute('/assembly/0'), { kind: 'assembly', id: 0 });
assert.deepEqual(parseRoute('/guide/files'), { kind: 'page', path: '/guide/files' });
assert.deepEqual(parseRoute('/type/x'), { kind: 'page', path: '/type/x' });

if (existsSync(path('deps.json'))) {
  const deps = read('deps.json');
  const names = i => (deps.refs[i] || []).map(j => A[j].n);
  const net = A.find(a => a.n === 'Network.dll').i;
  for (const n of ['Core.dll', 'Analytics.dll', 'Kefir.Framework.Network.Client.dll']) assert.ok(names(net).includes(n), `Network.dll -> ${n}`);
  const used = dependents(deps.refs);
  const top = Object.entries(used).sort((x, y) => y[1].length - x[1].length).slice(0, 3).map(([i, l]) => `${A[i].n} ${l.length}`);
  console.log(`deps ok: Network.dll -> ${names(net).join(', ')} | most used: ${top.join(', ')}`);
} else {
  console.log('deps.json not found, skipped');
}
