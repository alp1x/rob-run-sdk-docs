import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { asmForIndex, convert, fmt, nsName } from '@/lib/data';
import type { AsmJson, GenericInst, IndexJson } from '@/lib/types';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Attrs, Copy, DataError, H1, H2, KindBadge, Loading, P, Page, Section, Sig, Status, useCap, useData,
} from '@/components/common';

// Shown on row hover or keyboard focus; always on touch screens.
const HOVER = 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100';
const HEAD = 'text-xs font-medium text-muted-foreground';

const Rva = ({ rva }: { rva: string | null }) => (rva
  ? <span className="inline-flex items-center justify-end gap-1"><Copy text={rva} label="Copy RVA" className={HOVER} />{rva}</span>
  : <span className="text-muted-foreground">—</span>);

function Generics({ g }: { g: GenericInst[] }) {
  return (
    <Collapsible className="mt-1.5">
      <CollapsibleTrigger className="group inline-flex items-center gap-1 rounded-sm font-sans text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />{fmt(g.length)} generic {g.length === 1 ? 'instance' : 'instances'}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1.5 divide-y rounded-lg border bg-muted/30">
          {g.map(([rva, name], j) => (
            <li key={j} className="group/row flex flex-wrap items-center gap-x-3 px-2.5 py-1">
              <span className="min-w-0 flex-1 wrap-anywhere">{name}</span>
              <Rva rva={rva} />
              {rva && <span className="text-muted-foreground tabular-nums">VA {convert(rva)?.va}</span>}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function TypePage({ idx }: { idx: number }) {
  const index = useData<IndexJson>('index.json');
  const asm = index.data ? asmForIndex(index.data.assemblies, idx) : null;
  const file = useData<AsmJson>(asm ? `asm/${asm.i}.json` : null); // only this page fetches the large per-assembly files
  const type = useMemo(() => file.data?.types.find(t => t.i === idx), [file.data, idx]);
  const [q, setQ] = useState('');
  const methods = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !type ? [] : s ? type.methods.filter(m => m.s.toLowerCase().includes(s)) : type.methods;
  }, [type, q]);
  const [fields, moreFields] = useCap(type?.fields ?? []);
  const [props, moreProps] = useCap(type?.props ?? []);
  const [shownMethods, moreMethods] = useCap(methods);

  if (!index.data) return <Status s={index} />;
  const last = index.data.stats.types - 1;
  const pager = (
    <nav className="flex justify-between gap-2" aria-label="Neighbouring types">
      {idx > 0 ? <Button variant="ghost" size="sm" asChild><a href={`#/type/${idx - 1}`}><ChevronLeft />Previous · #{idx - 1}</a></Button> : <span />}
      {idx < last && <Button variant="ghost" size="sm" asChild><a href={`#/type/${idx + 1}`}>Next · #{idx + 1}<ChevronRight /></a></Button>}
    </nav>
  );
  const notFound = <Page><H1>Type not found</H1><P className="text-muted-foreground">TypeDefIndex {idx} is not in this dump.</P>{pager}</Page>;
  if (!asm || idx > last) return notFound;
  if (file.error) return <DataError />;
  if (!file.data) return <Loading>Loading {asm.n} data…</Loading>;
  if (!type) return notFound;

  return (
    <Page>
      <header className="flex flex-col gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href={'#/assembly/' + asm.i}>{asm.n}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="font-mono">{nsName(type.ns)}</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage className="font-mono wrap-anywhere">{type.name}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-center gap-3">
          <KindBadge k={type.k} />
          <H1 className="font-mono text-[26px] tracking-tight">{type.name}</H1>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>Namespace <span className="font-mono text-foreground">{nsName(type.ns)}</span></span>
          <span aria-hidden="true">·</span>
          <span>Assembly <a href={'#/assembly/' + asm.i} className="font-mono text-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground">{asm.n}</a></span>
          <span aria-hidden="true">·</span>
          <span>TypeDefIndex <span className="font-mono text-foreground tabular-nums">{idx}</span></span>
        </p>
      </header>

      <Section>
        <H2 id="declaration">Declaration</H2>
        <div className="group/row relative rounded-xl border bg-muted/40">
          <div className="absolute top-2.5 right-2.5"><Copy text={[...type.attrs, type.decl].join('\n')} label="Copy declaration" /></div>
          <div className="p-4 pr-12 font-mono text-[13px] leading-6 whitespace-pre-wrap wrap-anywhere">
            <Attrs a={type.attrs} /><div><Sig text={type.decl} /></div>
          </div>
        </div>
      </Section>

      {type.fields.length > 0 && (
        <Section>
          <H2 id="fields">Fields ({fmt(type.fields.length)})</H2>
          <div className="rounded-xl border">
            <Table className="font-mono text-[13px] leading-6">
              <TableHeader><TableRow><TableHead className={`w-20 text-right ${HEAD}`}>Offset</TableHead><TableHead className={HEAD}>Declaration</TableHead></TableRow></TableHeader>
              <TableBody>
                {fields.map((f, j) => (
                  <TableRow key={j}>
                    <TableCell className="text-right align-top text-muted-foreground tabular-nums">{f.o ?? '—'}</TableCell>
                    <TableCell className="whitespace-normal"><Attrs a={f.a} /><div className="wrap-anywhere"><Sig text={f.t} /></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {moreFields}
        </Section>
      )}

      {type.props.length > 0 && (
        <Section>
          <H2 id="properties">Properties ({fmt(type.props.length)})</H2>
          <ul className="divide-y rounded-xl border font-mono text-[13px] leading-6">
            {props.map((p, j) => <li key={j} className="px-3 py-2 wrap-anywhere hover:bg-muted/50"><Sig text={p} /></li>)}
          </ul>
          {moreProps}
        </Section>
      )}

      {type.methods.length > 0 && (
        <Section>
          <H2 id="methods">Methods ({q.trim() ? `${fmt(methods.length)} / ` : ''}{fmt(type.methods.length)})</H2>
          {type.methods.length > 30 && (
            <Input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Filter methods…" aria-label="Filter methods" className="w-72 max-w-full" />
          )}
          <div className="rounded-xl border">
            <Table className="font-mono text-[13px] leading-6">
              <TableHeader><TableRow>
                <TableHead className={HEAD}>Signature</TableHead><TableHead className={`text-right ${HEAD}`}>RVA</TableHead>
                <TableHead className={`text-right ${HEAD}`}>VA</TableHead><TableHead className={`text-right ${HEAD}`}>Slot</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {shownMethods.map((m, j) => (
                  <TableRow key={j} className="group/row">
                    <TableCell className="min-w-64 whitespace-normal"><Attrs a={m.a} /><div className="wrap-anywhere"><Sig text={m.s} /></div>{m.g && <Generics g={m.g} />}</TableCell>
                    <TableCell className="text-right align-top tabular-nums"><Rva rva={m.rva} /></TableCell>
                    <TableCell className="text-right align-top text-muted-foreground tabular-nums">{m.rva ? convert(m.rva)?.va : '—'}</TableCell>
                    <TableCell className="text-right align-top tabular-nums">{m.slot ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {!methods.length && <TableRow><TableCell colSpan={4} className="font-sans text-muted-foreground">No matching methods.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {moreMethods}
        </Section>
      )}
      {pager}
    </Page>
  );
}
