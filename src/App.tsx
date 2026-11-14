import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { BookOpen, Cpu, FileJson, Layers, Moon, Network, Sun, Zap } from 'lucide-react';
import { parseRoute } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import SearchDialog, { SearchIconButton, SearchTrigger } from '@/components/Search';
import { NavSidebar, TreeProvider, useTreeState, type Guide } from '@/components/NavTree';
import Outline from '@/components/Outline';
import { H1, P } from '@/components/common';
import { Architecture, Files, NetworkGuide, Overview, Pcg32, QuickReference } from '@/pages/Guides';
import AssemblyPage from '@/pages/AssemblyPage';
import TypePage from '@/pages/TypePage';

const GUIDES: Guide[] = [
  ['/', 'Overview', BookOpen],
  ['/guide/files', 'File formats', FileJson],
  ['/guide/architecture', 'Architecture', Layers],
  ['/guide/network', 'Network and connections', Network],
  ['/guide/pcg32', 'PCG32', Cpu],
  ['/guide/reference', 'Quick reference', Zap],
];
const GUIDE_PAGES: Record<string, ComponentType> = {
  '/': Overview, '/guide/files': Files, '/guide/architecture': Architecture, '/guide/network': NetworkGuide, '/guide/pcg32': Pcg32, '/guide/reference': QuickReference,
};

// There is no assembly list page: #/assembly goes home.
const readRoute = () => {
  if (location.hash === '#/assembly') history.replaceState(null, '', '#/');
  return location.hash.replace(/^#/, '') || '/';
};

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => { setRoute(readRoute()); window.scrollTo({ top: 0, behavior: 'instant' }); };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

function Route({ route }: { route: string }) {
  const r = parseRoute(route);
  if (r.kind === 'assembly') return <AssemblyPage i={r.id} />;
  if (r.kind === 'type') return <TypePage idx={r.id} />;
  const Guide = GUIDE_PAGES[r.path];
  if (Guide) return <Guide />;
  return (
    <div className="flex flex-col gap-4">
      <H1>Page not found</H1>
      <P className="text-muted-foreground">This address does not match any page. <a href="#/" className="underline underline-offset-4">Back to the overview.</a></P>
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    document.documentElement.classList.toggle('dark', !dark);
    try { localStorage.setItem('theme', dark ? 'light' : 'dark'); } catch { /* storage may be blocked */ }
    setDark(!dark);
  };
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>{dark ? <Sun /> : <Moon />}</Button>;
}

const REPO = 'https://github.com/InsideExploit/rob-run-sdk';

// GitHub mark (lucide-react has no brand icons).
const GitHubIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

function RepoLink() {
  return (
    <Button variant="ghost" size="icon" asChild>
      <a href={REPO} target="_blank" rel="noreferrer" aria-label="rob-run-sdk on GitHub" title="rob-run-sdk on GitHub"><GitHubIcon /></a>
    </Button>
  );
}

export default function App() {
  const route = useRoute();
  const tree = useTreeState(route);
  return (
    <TooltipProvider>
      <TreeProvider value={tree}>
        <SidebarProvider className="flex-col" style={{ '--sidebar-width': '300px' } as CSSProperties}>
          {/* Three equal-sided columns keep the search centred on the viewport. */}
          <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b bg-background/75 px-3 backdrop-blur-md md:grid md:grid-cols-[1fr_minmax(0,480px)_1fr] md:px-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <SidebarTrigger />
              <SearchIconButton className="md:hidden" />
              <a href="#/" className="ml-1 flex min-w-0 items-center gap-2 font-semibold tracking-tight">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">R</span>
                <span className="truncate">rob-run-sdk</span>
                <Badge variant="secondary" className="hidden sm:inline-flex">Reference</Badge>
              </a>
            </div>
            <SearchTrigger className="hidden w-full md:flex" />
            <div className="ml-auto flex justify-end gap-1 md:ml-0"><RepoLink /><ThemeToggle /></div>
          </header>
          <div className="flex flex-1">
            <NavSidebar guides={GUIDES} className="top-14 h-[calc(100svh-3.5rem)]!" />
            <SidebarInset className="min-w-0">
              <div className="mx-auto flex w-full max-w-[1120px] justify-center gap-12 px-4 pt-10 pb-24 md:px-8">
                <div id="content" className="min-w-0 max-w-[820px] flex-1 text-[15px]">
                  <Route key={route} route={route} />
                  <footer className="mt-20 flex items-center gap-2 border-t pt-6 text-sm text-muted-foreground">
                    <span className="size-4 shrink-0"><GitHubIcon /></span>
                    <span>Credit: <a href={REPO} target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">InsideExploit/rob-run-sdk</a></span>
                  </footer>
                </div>
                <Outline route={route} />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </TreeProvider>
      <SearchDialog />
    </TooltipProvider>
  );
}
