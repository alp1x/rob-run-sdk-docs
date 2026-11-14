import { useState } from 'react';
import { category, dependents, fmt, nsName, typeCount } from '@/lib/data';
import type { AssemblyInfo, DepsJson, IndexJson } from '@/lib/types';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSidebar } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTree } from '@/components/NavTree';
import { AsmBadge, DepsWarning, H1, H2, KindBar, P, Page, Section, Status, Title, useCap, useData } from '@/components/common';

// DLL chips linking to other assemblies (plus unresolved names as plain chips); long lists collapse after 24.
function AsmList({ ids, asms, extra = [] }: { ids: number[]; asms: AssemblyInfo[]; extra?: string[] }) {
  const [all, setAll] = useState(false);
  const list = ids.map(j => asms[j]).sort((x, y) => x.n.localeCompare(y.n));
  if (!list.length && !extra.length) return <p className="text-sm text-muted-foreground">None.</p>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(all ? list : list.slice(0, 24)).map(a => <AsmBadge key={a.i} name={a.n} i={a.i} />)}
      {extra.map(n => <AsmBadge key={n} name={n} />)}
      {list.length > 24 && (
        <Button variant="ghost" size="xs" onClick={() => setAll(!all)}>{all ? 'show less' : `show all (${list.length})`}</Button>
      )}
    </div>
  );
}

export default function AssemblyPage({ i }: { i: number }) {
  const idx = useData<IndexJson>('index.json');
  const deps = useData<DepsJson>('deps.json');
  const tree = useTree();
  const { isMobile, setOpenMobile } = useSidebar();
  const [q, setQ] = useState('');
  const a = idx.data?.assemblies[i];
  const nsList = (a?.ns ?? []).filter(([n]) => nsName(n).toLowerCase().includes(q.trim().toLowerCase()));
  const [shown, more] = useCap(nsList, 200);

  if (!idx.data) return <Status s={idx} />;
  if (!a) return <Page><H1>Assembly not found</H1><P className="text-muted-foreground">There is no assembly #{i}.</P></Page>;

  const cat = category(a.n);
  const used = deps.data ? dependents(deps.data.refs) : {};
  const refs = deps.data?.refs[i] ?? [];
  const unresolved = deps.data?.unresolved[i] ?? [];
  const showInTree = (ns: string) => { tree.revealPath(a, ns, null, `n:${a.i}:${ns}`); if (isMobile) setOpenMobile(true); };

  return (
    <Page>
      <Title title={<span className="font-mono">{a.n}</span>} lead={`An assembly in the ${cat} category with ${fmt(typeCount(a))} types and ${fmt(a.m)} methods. Its types are in the tree on the left.`}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>API reference</BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem>{cat}</BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage className="font-mono">{a.n}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Title>

      <Section>
        <H2 id="summary">Summary</H2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {([[typeCount(a), 'types'], [a.m, 'methods'], [a.ns.length, 'namespaces'], [a.start, 'first TypeDefIndex']] as const).map(([v, l]) => (
            <Card key={l} size="sm"><CardContent><b className="block text-2xl font-semibold tracking-tight tabular-nums">{fmt(v)}</b><span className="text-sm text-muted-foreground">{l}</span></CardContent></Card>
          ))}
        </div>
        <KindBar counts={a} />
      </Section>

      {deps.data && (
        <Section>
          <H2 id="dependencies">Dependencies ({refs.length + unresolved.length})</H2>
          <AsmList ids={refs} asms={idx.data.assemblies} extra={unresolved} />
          <H2 id="used-by" className="mt-4">Used by ({(used[i] ?? []).length})</H2>
          <AsmList ids={used[i] ?? []} asms={idx.data.assemblies} />
          <DepsWarning />
        </Section>
      )}

      <Section>
        <H2 id="namespaces">Namespaces ({fmt(a.ns.length)})</H2>
        <Input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Filter namespaces…" aria-label="Filter namespaces" className="w-72 max-w-full" />
        <div className="rounded-xl border">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs text-muted-foreground">Namespace</TableHead><TableHead className="text-right text-xs text-muted-foreground">Types</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {shown.map(([n, count]) => (
                <TableRow key={n}>
                  <TableCell className="whitespace-normal">
                    <button type="button" onClick={() => showInTree(n)} className="text-left font-mono text-[13px] wrap-anywhere hover:underline" title="Show in the tree on the left">{nsName(n)}</button>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums">{fmt(count)}</TableCell>
                </TableRow>
              ))}
              {!nsList.length && <TableRow><TableCell colSpan={2} className="text-muted-foreground">No matching namespaces.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        {more}
      </Section>
    </Page>
  );
}
