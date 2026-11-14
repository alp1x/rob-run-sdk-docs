import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  asmByCat, asmForIndex, category, CATS, fmt, lowerNames, nsEntries, nsName, parseRoute, rank, typeCount, typeIndex,
} from '@/lib/data';
import type { AssemblyInfo, IndexJson, TypeRow, TypesJson } from '@/lib/types';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from '@/components/ui/sidebar';
import { KindLetter, useData } from '@/components/common';

const STEP = 200; // rows per open list before "show more"
const atStep = (pos: number) => Math.ceil((Math.max(pos, 0) + 1) / STEP) * STEP; // smallest cap that shows row `pos`

// Keys: c:<category>, a:<asm i>, n:<asm i>:<namespace>, t:<TypeDefIndex>
export type TreeState = ReturnType<typeof useTreeState>;
const TreeContext = createContext<TreeState | null>(null);
export const TreeProvider = TreeContext.Provider;
export function useTree(): TreeState {
  const tree = useContext(TreeContext);
  if (!tree) throw new Error('useTree needs a TreeProvider');
  return tree;
}

// Sidebar tree state. It lives in App so it survives the mobile Sheet unmounting the tree.
export function useTreeState(route: string) {
  const [open, setOpen] = useState(() => new Set(['c:Game', 'c:Kefir']));
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [wantTypes, setWantTypes] = useState(false);
  const idx = useData<IndexJson>('index.json');
  const types = useData<TypesJson>(wantTypes ? 'types.json' : null).data;
  const index = idx.data;
  const parsed = parseRoute(route);
  // types.json (~2 MB) loads the first time an assembly opens, a type page shows, or the filter needs it.
  if (!wantTypes && (parsed.kind === 'type' || filter.trim().length >= 2 || [...open].some(k => k.startsWith('a:')))) setWantTypes(true);

  const toggle = (key: string) => setOpen(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const more = (key: string) => setLimits(l => ({ ...l, [key]: (l[key] ?? STEP) + STEP }));

  // Opens the path to an assembly (ns undefined), a namespace, or a type, and scrolls `target` into view.
  const revealPath = (a: AssemblyInfo, ns: string | undefined, t: TypeRow | null, target: string) => {
    if (!index) return;
    const cat = category(a.n);
    const keys = ['c:' + cat];
    const lim: Record<string, number> = { ['c:' + cat]: atStep(asmByCat(index).get(cat)?.indexOf(a) ?? 0) };
    if (ns !== undefined) { keys.push('a:' + a.i); lim['a:' + a.i] = atStep(a.ns.findIndex(x => x[0] === ns)); }
    if (ns !== undefined && t && types) {
      keys.push(`n:${a.i}:${ns}`);
      lim[`n:${a.i}:${ns}`] = atStep(typeIndex(types).get(a.i)?.get(ns)?.indexOf(t) ?? 0);
    }
    setOpen(s => new Set([...s, ...keys]));
    setLimits(l => { const n = { ...l }; for (const [k, v] of Object.entries(lim)) n[k] = Math.max(n[k] ?? STEP, v); return n; });
    setScrollTo(target);
  };

  // Reveal the current assembly or type once per route.
  const revealed = useRef<string | null>(null);
  useEffect(() => {
    if (!index || parsed.kind === 'page' || revealed.current === route) return;
    if (parsed.kind === 'assembly') {
      const a = index.assemblies[parsed.id];
      if (a) revealPath(a, undefined, null, 'a:' + a.i);
    } else {
      if (!types) return; // wait for types.json
      const t = types.t[parsed.id];
      const a = asmForIndex(index.assemblies, parsed.id);
      if (t && a) revealPath(a, types.ns[t[3]], t, 't:' + parsed.id);
    }
    revealed.current = route;
  }, [route, index, types]);

  return { route, index, indexError: idx.error, types, open, toggle, limits, more, revealPath, scrollTo, setScrollTo, filter, setFilter };
}

const Chevron = ({ open }: { open: boolean }) => <ChevronRight className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />;
const Count = ({ n }: { n: number }) => <span className="ml-auto shrink-0 pl-2 text-[11px] text-muted-foreground tabular-nums">{fmt(n)}</span>;
const SUB = 'mr-0 ml-3 pr-0 pl-1.5'; // tighter nesting than the default sub-menu indent

function MoreRow({ rest, onClick }: { rest: number; onClick: () => void }) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild size="sm">
        <button type="button" className="w-full text-muted-foreground" onClick={onClick}>show more (+{fmt(Math.min(rest, STEP))})</button>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function TypeRows({ a, ns, close }: { a: AssemblyInfo; ns: string; close: () => void }) {
  const { types, limits, more, route } = useTree();
  const key = `n:${a.i}:${ns}`;
  if (!types) return <p className="py-1 pl-6 text-xs text-muted-foreground">Loading…</p>;
  const list = typeIndex(types).get(a.i)?.get(ns) ?? [];
  const n = limits[key] ?? STEP;
  return (
    <SidebarMenuSub className={SUB}>
      {list.slice(0, n).map(t => (
        <SidebarMenuSubItem key={t[0]}>
          <SidebarMenuSubButton size="sm" href={'#/type/' + t[0]} isActive={route === '/type/' + t[0]} data-tree-key={'t:' + t[0]} onClick={close} title={t[4]}>
            <KindLetter k={t[2]} /><span className="truncate font-mono">{t[4]}</span>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
      {list.length > n && <MoreRow rest={list.length - n} onClick={() => more(key)} />}
    </SidebarMenuSub>
  );
}

function NsNode({ a, ns, count, close }: { a: AssemblyInfo; ns: string; count: number; close: () => void }) {
  const { open, toggle } = useTree();
  const key = `n:${a.i}:${ns}`;
  const isOpen = open.has(key);
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild size="sm">
        <button type="button" className="w-full" aria-expanded={isOpen} data-tree-key={key} onClick={() => toggle(key)} title={nsName(ns)}>
          <Chevron open={isOpen} /><span className="truncate font-mono">{nsName(ns)}</span><Count n={count} />
        </button>
      </SidebarMenuSubButton>
      {isOpen && <TypeRows a={a} ns={ns} close={close} />}
    </SidebarMenuSubItem>
  );
}

function AsmNode({ a, close }: { a: AssemblyInfo; close: () => void }) {
  const { open, toggle, limits, more, route } = useTree();
  const key = 'a:' + a.i;
  const isOpen = open.has(key);
  const n = limits[key] ?? STEP;
  return (
    <SidebarMenuSubItem>
      <div className="flex items-center">
        <button type="button" className="flex size-7 shrink-0 items-center justify-center rounded-md outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-expanded={isOpen} aria-label={`Expand or collapse ${a.n}`} onClick={() => toggle(key)}>
          <Chevron open={isOpen} />
        </button>
        {/* The label navigates to the assembly page and opens the node; only the chevron collapses it. */}
        <SidebarMenuSubButton href={'#/assembly/' + a.i} isActive={route === '/assembly/' + a.i} data-tree-key={key} className="min-w-0 flex-1 pl-1" onClick={() => { if (!isOpen) toggle(key); }} title={a.n}>
          <span className="truncate">{a.n.replace(/\.dll$/, '')}</span><Count n={typeCount(a)} />
        </SidebarMenuSubButton>
      </div>
      {isOpen && (
        <SidebarMenuSub className={SUB}>
          {a.ns.slice(0, n).map(([ns, count]) => <NsNode key={ns} a={a} ns={ns} count={count} close={close} />)}
          {a.ns.length > n && <MoreRow rest={a.ns.length - n} onClick={() => more(key)} />}
        </SidebarMenuSub>
      )}
    </SidebarMenuSubItem>
  );
}

function Tree({ close }: { close: () => void }) {
  const { index, indexError, open, toggle, limits, more } = useTree();
  if (!index) return <p className="px-2 text-xs text-muted-foreground">{indexError ? 'Data not found.' : 'Loading…'}</p>;
  const cats = asmByCat(index);
  return (
    <SidebarMenu>
      {CATS.map(cat => {
        const list = cats.get(cat) ?? [], key = 'c:' + cat, isOpen = open.has(key), n = limits[key] ?? STEP;
        return (
          <SidebarMenuItem key={cat}>
            <SidebarMenuButton aria-expanded={isOpen} onClick={() => toggle(key)}>
              <Chevron open={isOpen} /><span className="truncate font-medium">{cat}</span><Count n={list.length} />
            </SidebarMenuButton>
            {isOpen && (
              <SidebarMenuSub className="mr-0 pr-0">
                {list.slice(0, n).map(a => <AsmNode key={a.i} a={a} close={close} />)}
                {list.length > n && <MoreRow rest={list.length - n} onClick={() => more(key)} />}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

const LIMIT = 100;

// Flat results for the filter box: assemblies, then namespaces, then types; 100 rows at most.
function Results({ q, close }: { q: string; close: () => void }) {
  const { index, types, revealPath, setFilter, route } = useTree();
  if (!index) return null;
  const asms = rank(index.assemblies.map(a => a.n.toLowerCase()), q, LIMIT).map(j => index.assemblies[j]);
  const entries = nsEntries(index);
  const nss = rank(entries.map(e => e.lower), q, LIMIT - asms.length).map(j => entries[j]);
  const typ = types ? rank(lowerNames(types), q, LIMIT - asms.length - nss.length).map(j => types.t[j]) : [];
  const row = (key: string, href: string, active: boolean, icon: ReactNode, name: string, ctx: string, onClick: () => void) => (
    <SidebarMenuItem key={key}>
      <SidebarMenuButton asChild size="lg" isActive={active}>
        <a href={href} onClick={onClick}>
          {icon}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate font-mono text-[13px]">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{ctx}</div>
          </div>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
  const group = (label: string, rows: ReactNode[]) => rows.length > 0 && (
    <SidebarGroup className="py-1"><SidebarGroupLabel>{label} ({rows.length})</SidebarGroupLabel><SidebarMenu>{rows}</SidebarMenu></SidebarGroup>
  );
  return (
    <>
      {group('Assemblies', asms.map(a => row('a' + a.i, '#/assembly/' + a.i, route === '/assembly/' + a.i, null, a.n, `${category(a.n)} · ${fmt(typeCount(a))} types`, close)))}
      {/* A namespace has no page: open it in the tree and show its assembly. */}
      {group('Namespaces', nss.map(e => row(`n${e.a.i}:${e.n}`, '#/assembly/' + e.a.i, false, null, nsName(e.n), `${e.a.n} · ${fmt(e.count)} types`,
        () => { setFilter(''); revealPath(e.a, e.n, null, `n:${e.a.i}:${e.n}`); })))}
      {types && group('Types', typ.map(t => row('t' + t[0], '#/type/' + t[0], route === '/type/' + t[0], <KindLetter k={t[2]} />, t[4], `${nsName(types.ns[t[3]])} · ${index.assemblies[t[1]].n}`, close)))}
      {!types && <p className="px-4 py-2 text-xs text-muted-foreground">Loading types…</p>}
      {types && !asms.length && !nss.length && !typ.length && <p className="px-4 py-2 text-sm text-muted-foreground">No matches.</p>}
    </>
  );
}

export type Guide = [path: string, label: string, icon: LucideIcon];

export function NavSidebar({ guides, className }: { guides: Guide[]; className?: string }) {
  const tree = useTree();
  const { setOpenMobile } = useSidebar();
  const close = () => setOpenMobile(false);
  const q = tree.filter.trim().toLowerCase();

  // Scroll a revealed row into view once; the row may only exist after the tree (or the mobile Sheet) renders.
  useEffect(() => {
    if (!tree.scrollTo || q.length >= 2) return;
    const el = document.querySelector(`[data-tree-key="${CSS.escape(tree.scrollTo)}"]`);
    if (el) { el.scrollIntoView({ block: 'nearest' }); tree.setScrollTo(null); }
  });

  return (
    <Sidebar className={className}>
      <SidebarHeader className="border-b p-3">
        <SidebarInput type="search" value={tree.filter} onChange={e => tree.setFilter(e.target.value)} placeholder="Type, namespace or assembly…" aria-label="Filter types, namespaces and assemblies" />
      </SidebarHeader>
      <SidebarContent className="pb-6">
        {q.length >= 2 ? <Results q={q} close={close} /> : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Guides</SidebarGroupLabel>
              <SidebarMenu>
                {guides.map(([path, label, Icon]) => (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton asChild isActive={tree.route === path}>
                      <a href={'#' + path} aria-current={tree.route === path ? 'page' : undefined} onClick={close}><Icon />{label}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>API reference</SidebarGroupLabel>
              <Tree close={close} />
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
