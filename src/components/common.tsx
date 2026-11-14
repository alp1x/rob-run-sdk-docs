import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Check, ChevronRight, CircleAlert, Copy as CopyIcon, FileBox, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmt, KIND, KINDS, load, pct } from '@/lib/data';
import { tokenize, type TokenKind } from '@/lib/syntax';
import type { Kind } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface Loaded<T> { data?: T; error?: unknown }

// { data } once data/<path> has loaded, { error } if it failed, {} while loading or when path is null.
export function useData<T>(path: string | null): Loaded<T> {
  const [s, set] = useState<Loaded<T> & { path?: string }>({});
  useEffect(() => {
    if (!path) return;
    let live = true;
    load<T>(path).then(data => live && set({ path, data }), (error: unknown) => live && set({ path, error }));
    return () => { live = false; };
  }, [path]);
  return s.path === path ? s : {};
}

export const Loading = ({ children = 'Loading…' }: { children?: ReactNode }) => <p className="text-sm text-muted-foreground" role="status">{children}</p>;

// An assembly name as a DLL chip; links to its page when `i` is given (unresolved names have none).
export const AsmBadge = ({ name, i }: { name: string; i?: number }) => {
  const body = <><FileBox className="text-muted-foreground" />{name}</>;
  const cls = 'h-7 gap-1.5 px-3 text-[13px] [&>svg]:size-3.5!';
  return i === undefined
    ? <Badge variant="outline" className={cn(cls, 'text-muted-foreground')} title="No matching assembly">{body}</Badge>
    : <Badge variant="outline" className={cls} asChild><a href={'#/assembly/' + i}>{body}</a></Badge>;
};

// Shown wherever assembly references are listed.
export const DepsWarning = () => (
  <Alert variant="warning" className="max-w-[78ch]">
    <TriangleAlert />
    <AlertDescription>
      <p>The dumper adds references of its own, so cycles and mscorlib's references to game assemblies are artefacts; a listed reference is an upper bound, not proof of a real dependency.</p>
    </AlertDescription>
  </Alert>
);

export function DataError() {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Data not found.</AlertTitle>
      <AlertDescription>
        <p>The files under <C>public/data</C> are missing. They were generated from the original dump, which is no longer in this folder, so restore them from a backup.</p>
      </AlertDescription>
    </Alert>
  );
}

// Loading or error placeholder for a useData() result that has no data yet.
export const Status = ({ s }: { s: Loaded<unknown> }) => (s.error ? <DataError /> : <Loading />);

// Typography. H2/H3 with an id are listed in the "On this page" outline (label: data-toc, else the text).
export const H1 = ({ className, ...p }: ComponentProps<'h1'>) => <h1 className={cn('text-[30px] leading-tight font-semibold tracking-[-0.025em] text-balance wrap-anywhere', className)} {...p} />;
export const H2 = ({ className, ...p }: ComponentProps<'h2'>) => <h2 className={cn('scroll-mt-20 text-xl font-semibold tracking-[-0.015em]', className)} {...p} />;
export const H3 = ({ className, ...p }: ComponentProps<'h3'>) => <h3 className={cn('scroll-mt-20 text-base font-semibold tracking-[-0.01em]', className)} {...p} />;
export const P = ({ className, ...p }: ComponentProps<'p'>) => <p className={cn('max-w-[68ch] leading-7', className)} {...p} />;
export const Lead = ({ className, ...p }: ComponentProps<'p'>) => <p className={cn('max-w-[68ch] text-[17px] leading-7 text-muted-foreground', className)} {...p} />;
export const C = ({ className, ...p }: ComponentProps<'code'>) => <code className={cn('rounded-md bg-muted px-[0.3rem] py-[0.1rem] font-mono text-[13px]', className)} {...p} />;
export const Section = ({ className, ...p }: ComponentProps<'section'>) => <section className={cn('flex min-w-0 flex-col gap-4', className)} {...p} />;
export const Page = ({ className, ...p }: ComponentProps<'div'>) => <div className={cn('flex min-w-0 flex-col gap-12', className)} {...p} />;

// Page title with the muted lead under it.
export const Title = ({ title, lead, children }: { title: ReactNode; lead?: ReactNode; children?: ReactNode }) => (
  <header className="flex flex-col gap-3">{children}<H1>{title}</H1>{lead && <Lead>{lead}</Lead>}</header>
);

// Link to a type page, for type names mentioned in prose.
export const TypeLink = ({ i, children }: { i: number; children: ReactNode }) => (
  <a href={'#/type/' + i} className="underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"><C>{children}</C></a>
);

const KIND_TEXT: Record<Kind, string> = { c: 'text-blue-600 dark:text-blue-400', s: 'text-teal-600 dark:text-teal-400', e: 'text-amber-600 dark:text-amber-400', f: 'text-purple-600 dark:text-purple-400' };
const KIND_BG: Record<Kind, string> = { c: 'bg-blue-600 dark:bg-blue-400', s: 'bg-teal-600 dark:bg-teal-400', e: 'bg-amber-600 dark:bg-amber-400', f: 'bg-purple-600 dark:bg-purple-400' };

export const KindBadge = ({ k }: { k: Kind }) => <Badge variant="outline" className={cn('w-18 font-mono', KIND_TEXT[k])}>{KIND[k]}</Badge>;

// Single-letter kind marker for dense lists: C, S, E, I.
export const KindLetter = ({ k }: { k: Kind }) => (
  <span title={KIND[k]} className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] font-mono text-[10px] font-semibold ring-1 ring-current/25 ring-inset', KIND_TEXT[k])}>
    {k === 'f' ? 'I' : k.toUpperCase()}
  </span>
);

// GitHub light/dark default colours, as Shiki renders them.
const SYNTAX: Record<Exclude<TokenKind, ''>, string> = {
  kw: 'text-[#cf222e] dark:text-[#ff7b72]',
  type: 'text-[#953800] dark:text-[#ffa657]',
  name: 'font-semibold text-[#8250df] dark:text-[#d2a8ff]',
  num: 'text-[#0550ae] dark:text-[#79c0ff]',
  str: 'text-[#0a3069] dark:text-[#a5d6ff]',
  com: 'font-normal italic text-[#6e7781] dark:text-[#8b949e]',
};
// A C# declaration or signature with Shiki-style colouring, as React text.
export const Sig = ({ text }: { text: string }) => (
  <span className="font-medium">{tokenize(text).map(([k, t], j) => (k ? <span key={j} className={SYNTAX[k]}>{t}</span> : t))}</span>
);

// counts: c/s/e/f type counts (an index.json assembly, or their sum).
export function KindBar({ counts }: { counts: Record<Kind, number> }) {
  const total = KINDS.reduce((x, k) => x + counts[k], 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label="Type kind distribution">
        {KINDS.map(k => <i key={k} className={KIND_BG[k]} style={{ width: counts[k] / total * 100 + '%' }} />)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {KINDS.map(k => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <i className={cn('size-2.5 rounded-sm', KIND_BG[k])} />{KIND[k]} <b className="font-medium text-foreground tabular-nums">{fmt(counts[k])}</b> · {pct(counts[k], total)}
          </span>
        ))}
      </div>
    </div>
  );
}

// className lets tables hide the button until the row is hovered or focused.
export function Copy({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<'ok' | 'fail' | null>(null);
  const copy = () => Promise.resolve()
    .then(() => navigator.clipboard.writeText(text))
    .then(() => 'ok' as const, () => 'fail' as const)
    .then(r => { setState(r); setTimeout(() => setState(null), 1500); });
  return (
    <Tooltip>
      <TooltipTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon-xs' }), 'text-muted-foreground', className)} onClick={copy} aria-label={`${label}: ${text}`}>
        {state === 'ok' ? <Check /> : <CopyIcon />}
      </TooltipTrigger>
      <TooltipContent>{state === 'ok' ? 'Copied' : state === 'fail' ? 'Copy failed' : label}</TooltipContent>
    </Tooltip>
  );
}

// Shows the first `step` items and a button that reveals `step` more.
export function useCap<T>(items: T[], step = 500): [T[], ReactNode] {
  const [n, setN] = useState(step);
  const more = items.length > n && (
    <Button variant="outline" size="sm" className="self-start" onClick={() => setN(n + step)}>
      Show more ({fmt(items.length - n)} left)
    </Button>
  );
  return [items.slice(0, n), more];
}

// Attribute lines shown muted above a member; they can contain real newlines.
export const Attrs = ({ a }: { a: string[] }) => <>{a.map((x, j) => <div key={j} className="whitespace-pre-wrap text-muted-foreground wrap-anywhere">{x}</div>)}</>;

// A node with children `c` is collapsible.
export interface TreeNode { k: string; t?: string; n?: number; d?: string; v?: string; c?: TreeNode[]; open?: boolean }

export function JsonTree({ nodes }: { nodes: TreeNode[] }) {
  return <div className="font-mono text-[13px] leading-6">{nodes.map((n, i) => <JsonNode key={i} {...n} />)}</div>;
}

function JsonNode({ k, t, n, d, v, c, open }: TreeNode) {
  const row = (
    <>
      <span className="font-medium">{k}</span>
      {t && <span className="text-blue-600 dark:text-blue-400">{t}</span>}
      {n != null && <span className="text-amber-700 dark:text-amber-300">{fmt(n)}</span>}
      {v != null && <span className="text-teal-700 wrap-anywhere dark:text-teal-300">{v}</span>}
      {d && <span className="font-sans text-[13px] text-muted-foreground">{d}</span>}
    </>
  );
  if (!c) return <div className="flex flex-wrap items-baseline gap-x-2 pl-[22px]">{row}</div>;
  return (
    <Collapsible defaultOpen={open}>
      <CollapsibleTrigger className="group flex w-full flex-wrap items-baseline gap-x-2 rounded-sm text-left outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <ChevronRight className="size-3.5 shrink-0 self-center text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        {row}
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-[6px] border-l pl-3">
        {c.map((x, i) => <JsonNode key={i} {...x} />)}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Turns a plain JSON object into JsonTree nodes.
export const jsonNodes = (obj: object): TreeNode[] => Object.entries(obj).map(([k, v]: [string, unknown]): TreeNode => (v && typeof v === 'object'
  ? { k, t: Array.isArray(v) ? 'array' : 'object', c: jsonNodes(v), open: true }
  : { k, v: JSON.stringify(v) }));
