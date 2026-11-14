import { useState, type ReactNode } from 'react';
import { ArrowRight, Boxes, FileJson, Info, Network } from 'lucide-react';
import { category, convert, dependents, fmt, typeCount } from '@/lib/data';
import type { DepsJson, IndexJson } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AsmBadge, C, Copy, DepsWarning, H2, H3, JsonTree, jsonNodes, KindBar, P, Page, Section, Status, Title, TypeLink, useData, type TreeNode,
} from '@/components/common';

// Static table: rows of cells; the first row is the header. `num` lists right-aligned column indexes.
function SimpleTable({ rows, num = [] }: { rows: ReactNode[][]; num?: number[] }) {
  const [head, ...body] = rows;
  const al = (j: number) => (num.includes(j) ? 'text-right tabular-nums' : '');
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader><TableRow>{head.map((h, j) => <TableHead key={j} className={`text-xs text-muted-foreground ${al(j)}`}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {body.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className={`whitespace-normal align-top ${al(j)}`}>{c}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </div>
  );
}

const Note = ({ children }: { children: ReactNode }) => (
  <Alert className="max-w-[78ch]"><Info /><AlertDescription><p>{children}</p></AlertDescription></Alert>
);

const Chips = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5">{items.map(x => <Badge key={x} variant="outline" className="font-mono">{x}</Badge>)}</div>
);

// Code sample whose alignment matters: scrolls sideways instead of wrapping.
const CodeSample = ({ children }: { children: string }) => (
  <ScrollArea className="rounded-xl border bg-muted/40">
    <pre className="p-4 font-mono text-[13px] leading-relaxed">{children}</pre>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);

const Muted = ({ children }: { children: ReactNode }) => <span className="font-normal text-muted-foreground">{children}</span>;

const StatCards = ({ items }: { items: [number, string][] }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {items.map(([v, l]) => (
      <Card key={l} size="sm"><CardContent><b className="block text-2xl font-semibold tracking-tight tabular-nums">{fmt(v)}</b><span className="text-sm text-muted-foreground">{l}</span></CardContent></Card>
    ))}
  </div>
);

const START: [href: string, icon: typeof FileJson, title: string, text: string][] = [
  ['#/guide/files', FileJson, 'File formats', 'Structure of script.json, stringliteral.json and dump.cs.'],
  ['#/guide/network', Network, 'Network and connections', 'Room connections, the ConnectUpdater flow and connection constants.'],
  ['#/assembly/0', Boxes, 'Models.dll', 'The assembly with the model shared by client and server.'],
];

export function Overview() {
  const idx = useData<IndexJson>('index.json');
  const s = idx.data?.stats;
  const sum = (k: 'c' | 's' | 'e' | 'f') => (idx.data?.assemblies ?? []).reduce((x, a) => x + a[k], 0);
  const models = idx.data?.assemblies[0];
  return (
    <Page>
      <Section className="gap-6">
        <Title title="rob-run-sdk reference" lead="A reference generated from the Il2CppDumper output: every type's declaration, field offsets and method addresses." />
        <div className="grid gap-3 sm:grid-cols-3">
          {START.map(([href, Icon, title, text]) => (
            <a key={href} href={href} className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <Icon className="size-5 text-muted-foreground" />
              <span className="flex items-center gap-1 font-medium">{title}<ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></span>
              <span className="text-sm text-muted-foreground">{href === '#/assembly/0' && models ? `${fmt(typeCount(models))} types, ${fmt(models.ns.length)} namespaces. ` : ''}{text}</span>
            </a>
          ))}
        </div>
      </Section>
      <Section>
        <H2 id="numbers">The dump in numbers</H2>
        {s ? <StatCards items={[[s.assemblies, 'assemblies'], [s.types, 'types'], [s.methods, 'methods'], [s.fields, 'fields']]} /> : <Status s={idx} />}
        {idx.data && <KindBar counts={{ c: sum('c'), s: sum('s'), e: sum('e'), f: sum('f') }} />}
      </Section>
    </Page>
  );
}

const SCRIPT_TREE: TreeNode[] = [
  { k: 'script.json', t: 'object', open: true, c: [
    { k: 'ScriptMethod', t: 'array', n: 568593, d: 'one record per method', open: true, c: [
      { k: 'Address', t: 'int', d: 'RVA of the method, decimal' },
      { k: 'Name', t: 'string', d: 'in "Type$$Method" form' },
      { k: 'Signature', t: 'string', d: 'C prototype' },
      { k: 'TypeSignature', t: 'string', d: 'call signature shorthand, e.g. "viii"' },
    ] },
    { k: 'ScriptString', t: 'array', n: 31224, d: 'string literals', c: [{ k: 'Address', t: 'int' }, { k: 'Value', t: 'string' }] },
    { k: 'ScriptMetadata', t: 'array', n: 38519, d: 'type info pointers', c: [
      { k: 'Address', t: 'int' }, { k: 'Name', t: 'string', d: 'ends with "..._TypeInfo"' }, { k: 'Signature', t: 'string', d: 'C type name' },
    ] },
    { k: 'ScriptMetadataMethod', t: 'array', n: 69118, d: 'method pointers', c: [
      { k: 'Address', t: 'int', d: 'RVA of the pointer' }, { k: 'Name', t: 'string', d: '"Method$Type.Method()"' }, { k: 'MethodAddress', t: 'int', d: 'RVA of the target method' },
    ] },
    { k: 'Addresses', t: 'int[]', n: 267100, d: 'function start addresses' },
  ] },
  { k: 'stringliteral.json', t: 'array', n: 31224, c: [{ k: 'value', t: 'string' }, { k: 'address', t: 'string', d: 'hex, e.g. "0x8102548"' }] },
];

const SCRIPT_METHOD = {
  Address: 9263696,
  Name: 'System.Runtime.CompilerServices.NullableContextAttribute$$.ctor',
  Signature: 'void System_Runtime_CompilerServices_NullableContextAttribute___ctor (System_Runtime_CompilerServices_NullableContextAttribute_o* __this, uint8_t , const MethodInfo* method);',
  TypeSignature: 'viii',
};

const DUMP_PATTERN = `// Namespace: Network                                   <- namespace
public class ClientHost : IUpdater // TypeDefIndex: 35585  <- global type index
{
	// Fields
	private readonly IHost _host; // 0x10                  <- offset within the object

	// Methods
	// RVA: 0x4DBEE40 Offset: 0x4DBDE40 VA: 0x184DBEE40
	public bool Start(AddressFamily addressFamily) { }    <- body is always empty
}`;

export function Files() {
  return (
    <Page>
      <Title title="File formats" lead="Structure of script.json, stringliteral.json and dump.cs, and how a type looks in the dump." />
      <Section>
        <H2 id="json">script.json and stringliteral.json</H2>
        <P><C>script.json</C> is a single object holding five arrays, 974,554 records in total. Every <C>Address</C> value is an RVA written in decimal. You can expand and collapse the branches.</P>
        <Card className="py-3"><CardContent><JsonTree nodes={SCRIPT_TREE} /></CardContent></Card>
      </Section>
      <Section>
        <H2 id="example-record">Example ScriptMethod record</H2>
        <Card className="py-3"><CardContent><JsonTree nodes={[{ k: 'ScriptMethod[n]', t: 'object', open: true, c: jsonNodes(SCRIPT_METHOD) }]} /></CardContent></Card>
      </Section>
      <Section>
        <H2 id="dump-cs">A type in dump.cs</H2>
        <CodeSample>{DUMP_PATTERN}</CodeSample>
        <P>Reference page for the type in this example: <TypeLink i={35585}>ClientHost</TypeLink>.</P>
        <P>The first 216 lines of the file are the assembly index: <C>// Image N: Name.dll - firstTypeDefIndex</C>. To find which DLL a type belongs to, compare its <C>TypeDefIndex</C> with these ranges.</P>
      </Section>
    </Page>
  );
}

const LAYERS: [name: string, sub: string, chips: string[]][] = [
  ['Gameplay', 'screens and rules', ['Battle', 'Global', 'Realm', 'MainMenu', 'UI', 'UiState']],
  ['Client core', 'startup, session, connection', ['Game', 'Client', 'Network', 'Auth', 'Steam', 'Bootstrap', 'Core']],
  ['Data model', 'messages, reference data', ['Models', 'SharedType', 'Content']],
  ['Kefir Framework', 'RPC, replication, ECS', ['Rpc', 'Replication', 'Ecs', 'Network.Client', 'Http', 'MessagePack', 'Value', 'Async', 'Core']],
  ['Transport and services', 'third party', ['ENetCS (UDP)', 'ZstdNet', 'Steamworks.NET', 'Epic Online Services', 'Wwise', 'Sentry', 'DevToDev']],
];

// Game and Kefir assemblies with their in-group references, most-used first. Hidden until deps.json loads.
function DepsSection() {
  const idx = useData<IndexJson>('index.json');
  const deps = useData<DepsJson>('deps.json');
  if (!idx.data || !deps.data) return null;
  const A = idx.data.assemblies;
  const refsOf = deps.data.refs;
  const used = dependents(refsOf);
  const core = new Set(A.filter(a => category(a.n) === 'Game' || category(a.n) === 'Kefir').map(a => a.i));
  const byName = (x: { n: string }, y: { n: string }) => x.n.localeCompare(y.n);
  const rows = [...core]
    .map(i => ({ a: A[i], refs: (refsOf[i] ?? []).filter(j => core.has(j)).map(j => A[j]).sort(byName), u: (used[i] ?? []).length }))
    .sort((x, y) => y.u - x.u || byName(x.a, y.a));
  return (
    <Section>
      <H2 id="dependencies">Assembly dependencies</H2>
      <P>Only the {rows.length} assemblies in the Game and Kefir categories are shown. The second column lists their references within that group; the third counts how many assemblies (of every category) reference this one.</P>
      <DepsWarning />
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow className="[&>th]:text-xs [&>th]:text-muted-foreground">
            <TableHead>Assembly</TableHead><TableHead>Game/Kefir assemblies it depends on</TableHead><TableHead className="text-right">Used by</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(({ a, refs, u }) => (
              <TableRow key={a.i}>
                <TableCell className="align-top"><a href={'#/assembly/' + a.i} className="font-mono text-[13px] hover:underline">{a.n}</a></TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap gap-2">{refs.length ? refs.map(r => <AsmBadge key={r.i} name={r.n} i={r.i} />) : <span className="text-muted-foreground">—</span>}</div>
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">{fmt(u)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}

export function Architecture() {
  return (
    <Page>
      <Title title="Architecture" lead="The layers of the code, what the game assemblies cover, and the assembly dependencies." />
      <Section>
        <H2 id="layers">Layers</H2>
        <P>The code splits into five layers: gameplay at the top, UDP transport at the bottom. The layer grouping is inferred from assembly and namespace names.</P>
        <div className="flex flex-col gap-2">
          {LAYERS.map(([name, sub, chips]) => (
            <Card key={name} size="sm">
              <CardContent className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center">
                <div><b className="font-semibold">{name}</b><small className="block text-muted-foreground">{sub}</small></div>
                <Chips items={chips} />
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
      <Section>
        <H2 id="game-assemblies">Game assemblies</H2>
        <SimpleTable rows={[
          ['Assembly', 'Main namespaces', 'What it covers'],
          [<C>Models.dll</C>, 'Models.Systems, Models.Messages, Models.References.*, Models.Replication.*', 'The model shared by client and server: 203 message types, inventory, character, clan, weapon references'],
          [<C>Battle.dll</C>, 'Game.Battle.*', 'In-battle gameplay: inventory, map, vehicles, targeting, settlement building, HUD'],
          [<C>Global.dll</C>, 'Game.Global.*', 'Out-of-battle systems: chat, clan, battle pass, skin hub, reputation, settings'],
          [<C>Realm.dll</C>, 'Game.Realm.*', 'Sector map, region conquest, settlement purchase'],
          [<C>Client.dll</C>, 'ClientCore.*', 'System loop, time, applying replication, incoming battle packets'],
          [<C>Game.dll</C>, 'Game.Start, Game.Network', 'Updaters that drive the startup flow and the network state'],
          [<C>Network.dll</C>, 'Network, Network.Connection, Network.Config, GameStates', 'Connection state, room connections, configuration'],
        ]} />
      </Section>
      <DepsSection />
    </Page>
  );
}

const ROOM_FIELDS: [offset: string, field: string, type: string][] = [
  ['0x10', 'AddressFamily', 'AddressFamily'], ['0x14', 'IsNetworkHostStarted', 'bool'], ['0x15', 'NeedWaitStopped', 'bool'],
  ['0x18', 'DefaultRtt', 'int'], ['0x20', 'Id', 'string'], ['0x28', 'HasActualConnectData', 'bool'], ['0x30', 'Host', 'string'],
  ['0x38', 'Port', 'int'], ['0x40', 'Token', 'string'], ['0x48', 'Destination', 'string'], ['0x50', 'AuthorizedDestination', 'string'],
  ['0x58', 'Peer', 'string'], ['0x60', 'IsConnected', 'bool'], ['0x61', 'IsAuthorized', 'bool'],
];

const STEPS: [badge: string, name: string, text: ReactNode][] = [
  ['1 · 0x20', 'UserConnectionInfo', <>Set up by <TypeLink i={35584}>UserConnectUpdater</TypeLink>. Account-level session.</>],
  ['2 · 0x28', 'RegionUserConnectionInfo', <>Set up by <TypeLink i={35583}>RegionConnectUpdater</TypeLink>. Region server.</>],
  ['3 · 0x30', 'BattleConnectionInfo', <>Set up by <C>BattleConnectUpdater</C>. Battle room.</>],
];

export function NetworkGuide() {
  return (
    <Page>
      <Title title="Network and connections" lead="The client's three room connections, the connection flow, and the server response constants." />
      <Section>
        <H2 id="room-connections">Room connections</H2>
        <P>The client holds three separate room connections at the same time: user, region and battle. Each is represented by a <TypeLink i={35568}>RoomConnectionInfo</TypeLink> inside <TypeLink i={35567}>GameStates.ConnectionState</TypeLink> and is set up by its own <TypeLink i={35582}>ConnectUpdater</TypeLink> subclass.</P>
        <div className="grid gap-3 md:grid-cols-3">
          {STEPS.map(([badge, name, text]) => (
            <Card key={name} size="sm"><CardContent className="flex flex-col items-start gap-1">
              <Badge variant="outline">{badge}</Badge><b className="font-semibold">{name}</b><small className="text-muted-foreground">{text}</small>
            </CardContent></Card>
          ))}
        </div>
        <P>The <C>ConnectUpdater</C> method names suggest this order: DNS resolution with <C>GetAddresses</C>, <C>StartHost</C>, <C>ConnectInternal(host, address, port, destination, peer, token, isProxyAddress)</C>, then <C>AuthorizeSucceeded</C> or <C>AuthorizeFailed</C>. Direct and proxy addresses are tracked separately; direct servers that drop quickly are put into the <C>_unstableDirectHosts</C> set. The transport layer is the <C>EnetHost</C> and <C>EnetPeer</C> classes.</P>
      </Section>
      <Section>
        <H2 id="constants">Connection constants</H2>
        <H3 id="disconnect-reasons" data-toc="DisconnectReasons"><TypeLink i={7}>DisconnectReasons</TypeLink> <Muted>· Models.Utils · TypeDefIndex 7</Muted></H3>
        <SimpleTable num={[0]} rows={[
          ['Code', 'Constant', 'Meaning from the name'],
          ['400', <C>BattlePlayerLeft</C>, 'The player left the battle'],
          ['401', <C>BattleReplicationNoAckBufferLimit</C>, 'Unacknowledged replication buffer limit exceeded'],
          ['402', <C>Banned</C>, 'The account is banned'],
          ['403', <C>SecurityViolation</C>, 'A security violation was detected'],
        ]} />
        <H3 id="server-responses" data-toc="ServerResponses"><TypeLink i={8}>ServerResponses</TypeLink> <Muted>· Models.Utils · TypeDefIndex 8</Muted></H3>
        <SimpleTable rows={[
          ['Constant', 'Value on the wire', 'Meaning from the name'],
          [<C>Ok</C>, <C>"ok"</C>, 'Request succeeded'],
          [<C>Validation</C>, <C>"validation"</C>, 'Request failed validation'],
          [<C>ServiceError</C>, <C>"service_error"</C>, 'Server-side error'],
          [<C>Down</C>, <C>"down"</C>, 'Service is down'],
          [<C>Timeout</C>, <C>"timeout"</C>, 'Timed out'],
          [<C>RoomNotFound</C>, <C>"room_not_found"</C>, 'The target room does not exist'],
        ]} />
        <Note>Both classes hold constants only; these names appear in no other signature in the dump. Because constants are inlined at their call sites at compile time, finding where they are used means searching <C>GameAssembly.dll</C> for the values 400–403 and for the string addresses.</Note>
      </Section>
      <Section>
        <H2 id="structures">Connection structures</H2>
        <H3 id="room-connection-info" data-toc="RoomConnectionInfo fields"><TypeLink i={35568}>RoomConnectionInfo</TypeLink> fields</H3>
        <SimpleTable num={[0]} rows={[['Offset', 'Field', 'Type'], ...ROOM_FIELDS.map(([o, f, t]) => [<span className="font-mono">{o}</span>, f, <C>{t}</C>])]} />
        <H3 id="game-config" data-toc="GameConfig fields">GameConfig fields <Muted>· Network.Config</Muted></H3>
        <Chips items={['ServerUrls', 'RegionUrls', 'IsMaintenance', 'MinBuildNumber', 'PrivacyPolicyUrl', 'GameSupportUrl', 'SteamOpsUrls', 'ReferencesUrls', 'ReferencesHash', 'PerformanceMonitoring', 'EosConfig', 'ProxyConfigUrls', 'DevMode']} />
        <H3 id="updaters">Game.Network updaters</H3>
        <Chips items={['NetworkUpdater', 'NetworkStateUpdater', 'NetworkStateSendMessageUpdater', 'NetworkCommandUpdater', 'NetworkAnalyticsUpdater', 'ConnectionLostUpdater', 'ProxyAddressesRefreshUpdater', 'ReadyForBattleUpdater', 'RegionUserConnectionInfoUpdater', 'RegionUserPartyModelUpdater', 'RegionUserRequestReceiverUpdater', 'UserRequestReceiverUpdater', 'UserInitUpdater', 'UserTimeModelUpdater', 'UserBanCheckUpdater', 'SecurityViolationCheckUpdater', 'SendPlatformUpdater']} />
      </Section>
    </Page>
  );
}

const PCG_METHODS: [name: string, modifier: string, signature: string, rva: string][] = [
  ['GenerateState', '', 'ulong (ulong seed)', '0x390DC50'],
  ['Step', 'private', 'ulong (ulong state, ulong inc)', '0x390DE70'],
  ['Next', 'private', 'uint (ulong state, out ulong nextState)', '0x390DD90'],
  ['GetNextUInt', '', 'uint (ulong state, out ulong nextState)', '0x390DD90'],
  ['GetNextInt', '', 'int (ulong state, out ulong nextState)', '0x390DD90'],
  ['GetNextULong', '', 'ulong (ulong state, out ulong nextState)', '0x390DDE0'],
  ['GetNextLong', '', 'long (ulong state, out ulong nextState)', '0x390DDE0'],
  ['GetNextFloat', '', 'float (ulong state, out ulong nextState)', '0x390DD30'],
  ['GetNextDouble', '', 'double (ulong state, out ulong nextState)', '0x390DC70'],
];

export function Pcg32() {
  return (
    <Page>
      <Title title="PCG32" lead="A stateless random number generator in Models.dll: its constants and method addresses." />
      <Section>
        <H2 id="overview">Overview</H2>
        <P><TypeLink i={4}>PCG32</TypeLink> is a stateless random number generator: every call takes the 64-bit state as a parameter and returns the new state through <C>out nextState</C>. It lives in the global namespace in <C>Models.dll</C>, as <a href="#/type/4" className="underline underline-offset-4">TypeDefIndex 4</a>.</P>
      </Section>
      <Section>
        <H2 id="constants">Constants</H2>
        <SimpleTable rows={[
          ['Constant', 'Value', 'Note'],
          [<C>_mult</C>, <span className="font-mono">6364136223846793005</span>, 'LCG multiplier of the PCG reference implementation'],
          [<C>_inc</C>, <span className="font-mono">1442695040888963407</span>, 'Default increment of the PCG reference implementation'],
        ]} />
      </Section>
      <Section>
        <H2 id="methods">Methods</H2>
        <SimpleTable num={[2]} rows={[
          ['Method', 'Signature', 'RVA'],
          ...PCG_METHODS.map(([n, mod, sig, rva]) => [<><C>{n}</C>{mod && <Muted> {mod}</Muted>}</>, <span className="font-mono">{sig}</span>, <span className="font-mono">{rva}</span>]),
        ]} />
        <P>The three 32-bit methods share one address and the two 64-bit methods share another; the compiler merged identical bodies. So the signed and unsigned versions return the same bits.</P>
        <Note>The output function is not visible in the dump. The constants match standard PCG, but whether the bit-mixing step is standard XSH-RR has to be verified by reading the code at <C>0x18390DD90</C>.</Note>
      </Section>
    </Page>
  );
}

const RECIPES: [label: string, cmd: string][] = [
  ['Find a type', 'rg -n "class RoomConnection\\b" dump.cs'],
  ['Types in a namespace', 'rg -n -A1 "^// Namespace: Game.Network$" dump.cs'],
  ['From address to method', 'rg -n -A1 "RVA: 0x390DC50 " dump.cs'],
  ['From text to address', 'rg -n -A1 "room_not_found" stringliteral.json'],
  ['C signature of a method', 'rg -n -B1 -A2 "PCG32\\$\\$GenerateState" script.json'],
];

function RvaConverter() {
  const [v, setV] = useState('0x390DC50');
  const r = convert(v);
  const out: [string, string | undefined][] = [['VA (IDA / Ghidra)', r ? r.va : 'Enter a valid hex (0x…) or decimal number.'], ['File offset', r?.off], ['script.json Address', r?.dec], ['dump.cs search', r?.rg]];
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <label htmlFor="rva" className="text-sm text-muted-foreground">RVA</label>
        <Input id="rva" value={v} onChange={e => setV(e.target.value)} spellCheck={false} aria-describedby="rvahelp" className="w-56 max-w-full font-mono" />
        <span id="rvahelp" className="text-sm text-muted-foreground">hex (0x…) or decimal</span>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 p-4 text-sm" aria-live="polite">
        {out.map(([k, val]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-mono wrap-anywhere">{val}</dd></div>)}
      </dl>
    </Card>
  );
}

export function QuickReference() {
  return (
    <Page>
      <Title title="Quick reference" lead="An address converter, ready-made search commands, and things to watch for when reading the dump." />
      <Section>
        <H2 id="converter">Address converter</H2>
        <P>For the methods in this dump, VA = <C>0x180000000 + RVA</C> and file offset = <C>RVA − 0x1000</C>. <C>script.json</C> writes the same RVA in decimal.</P>
        <RvaConverter />
      </Section>
      <Section>
        <H2 id="recipes">Search recipes</H2>
        <Card className="gap-0 py-0">
          {RECIPES.map(([label, cmd]) => (
            <div key={label} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 last:border-0 sm:flex-nowrap">
              <span className="basis-full text-sm text-muted-foreground sm:shrink-0 sm:basis-48">{label}</span>
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-[13px] whitespace-nowrap">{cmd}</code>
              <Copy text={cmd} />
            </div>
          ))}
        </Card>
      </Section>
      <Section>
        <H2 id="watch-for">Things to watch for</H2>
        <SimpleTable rows={[
          ['Situation', 'What it means'],
          [<C>RVA: -1 Offset: -1</C>, <>Abstract or generic method. It has no address of its own; if it is generic, look at the concrete addresses in the <C>GenericInstMethod</C> block below it.</>],
          ['Many methods at the same RVA', <>Identical bodies were folded into a single copy. For example, most empty <C>.ctor</C>s are at <C>0x7A9710</C>; a breakpoint at that address fires for all of them.</>],
          [<C>{'<Name>k__BackingField'}</C>, 'The field behind an auto-property. The offset belongs to this field; the property itself is only its get/set methods.'],
          [<><C>const</C> fields</>, 'Take no space in memory and have no offset. The value is inlined at the call site.'],
          ['The meaning columns on these pages', 'Inferred from class, field and method names. Verifying behaviour requires reading the machine code at the relevant address.'],
        ]} />
      </Section>
    </Page>
  );
}
