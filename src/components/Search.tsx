import { useEffect, useMemo, useState } from 'react';
import { Command as CommandIcon, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lowerNames, nsName, rank } from '@/lib/data';
import type { IndexJson, TypesJson } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Command, CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DataError, KindBadge, Loading, useData } from '@/components/common';

const LIMIT = 50;
const OPEN = 'tpso:search'; // window event that opens the dialog
const openSearch = () => dispatchEvent(new Event(OPEN));
// Geist has no command-key glyph, so Mac gets the icon instead of a fallback font.
const MOD = /Mac|iPhone|iPad/.test(navigator.platform)
  ? <><CommandIcon className="inline size-3 align-[-1px]" /><span className="sr-only">Cmd </span></>
  : 'Ctrl ';

// Looks like an input; opens the search dialog.
export function SearchTrigger({ className }: { className?: string }) {
  return (
    <Button variant="outline" onClick={openSearch} aria-label="Search types" className={cn('h-9 justify-start gap-2 rounded-lg bg-muted/40 px-3 font-normal text-muted-foreground shadow-none', className)}>
      <SearchIcon />
      <span className="truncate">Search types…</span>
      <kbd className="ml-auto hidden items-center rounded border bg-background px-1.5 font-mono text-[11px] font-medium sm:inline-flex">{MOD}K</kbd>
    </Button>
  );
}

// Compact trigger for narrow headers.
export function SearchIconButton({ className }: { className?: string }) {
  return <Button variant="ghost" size="icon" onClick={openSearch} aria-label="Search types" title="Search types" className={className}><SearchIcon /></Button>;
}

export default function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false); // types.json (~2 MB) loads on first open only
  const [q, setQ] = useState('');
  const types = useData<TypesJson>(wanted ? 'types.json' : null);
  const index = useData<IndexJson>(wanted ? 'index.json' : null);

  const show = (v: boolean) => { setOpen(v); if (v) setWanted(true); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      const typing = !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setOpen(o => !o); setWanted(true); }
      else if (e.key === '/' && !typing) { e.preventDefault(); show(true); }
    };
    const onOpen = () => show(true);
    addEventListener('keydown', onKey);
    addEventListener(OPEN, onOpen);
    return () => { removeEventListener('keydown', onKey); removeEventListener(OPEN, onOpen); };
  }, []);

  // Substring match on the type name, exact and prefix matches first; one extra to know there are more.
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s && types.data ? rank(lowerNames(types.data), s, LIMIT + 1) : [];
  }, [q, types.data]);

  const go = (i: number) => { setOpen(false); location.hash = '#/type/' + i; };

  let body;
  if (types.error || index.error) body = <div className="p-2"><DataError /></div>;
  else if (!types.data || !index.data) body = <div className="px-3 py-6"><Loading /></div>;
  else if (!q.trim()) body = <p className="px-3 py-6 text-center text-sm text-muted-foreground">Type part of a type name.</p>;
  else if (!hits.length) body = <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching types.</p>;
  else {
    const { t, ns } = types.data;
    const asms = index.data.assemblies;
    body = (
      <CommandGroup heading={hits.length > LIMIT ? `First ${LIMIT} results` : `${hits.length} results`}>
        {hits.slice(0, LIMIT).map(j => {
          const [i, a, k, n, name] = t[j];
          return (
            <CommandItem key={i} value={String(i)} onSelect={() => go(i)}>
              <KindBadge k={k} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">{name}</div>
                <div className="truncate text-xs text-muted-foreground">{nsName(ns[n])} · {asms[a].n}</div>
              </div>
            </CommandItem>
          );
        })}
      </CommandGroup>
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={show} title="Search types" description="Search 38k types by name" className="sm:max-w-2xl">
      <Command shouldFilter={false}>
        <CommandInput value={q} onValueChange={setQ} placeholder="Type name, e.g. ClientHost" aria-label="Type name" />
        <CommandList className="max-h-[min(60vh,28rem)]">{body}</CommandList>
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">Enter: open · Esc: close · {MOD}K or / to open</p>
      </Command>
    </CommandDialog>
  );
}
