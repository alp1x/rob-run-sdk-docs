import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Heading { id: string; label: string; sub: boolean }

// "On this page": the h2/h3 headings with an id inside #content, current one highlighted.
export default function Outline({ route }: { route: string }) {
  const [items, setItems] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  // Headings appear as page data loads (and counts change while filtering), so rescan on DOM changes.
  useEffect(() => {
    const root = document.getElementById('content');
    if (!root) return;
    let last = '';
    const scan = () => {
      const hs = [...root.querySelectorAll<HTMLElement>('h2[id], h3[id]')].map(h => ({ id: h.id, label: h.dataset.toc ?? h.textContent ?? '', sub: h.tagName === 'H3' }));
      const sig = JSON.stringify(hs);
      if (sig !== last) { last = sig; setItems(hs); }
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [route]);

  useEffect(() => {
    setActive(a => (items.some(i => i.id === a) ? a : items[0]?.id ?? null));
    const io = new IntersectionObserver(entries => {
      const hit = entries.find(e => e.isIntersecting);
      if (hit) setActive(hit.target.id);
    }, { rootMargin: '-72px 0px -65% 0px' });
    for (const i of items) { const el = document.getElementById(i.id); if (el) io.observe(el); }
    return () => io.disconnect();
  }, [items]);

  return (
    <aside className="hidden w-52 shrink-0 xl:block">
      {items.length > 0 && (
        <nav className="sticky top-24 flex max-h-[calc(100svh-8rem)] flex-col gap-0.5 overflow-y-auto text-[13px]" aria-label="On this page">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">On this page</p>
          {items.map(i => (
            <button
              key={i.id}
              type="button"
              onClick={() => document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-current={active === i.id ? 'location' : undefined}
              className={cn(
                'truncate rounded-sm border-l-2 border-transparent py-1 pl-3 text-left text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                i.sub && 'pl-6',
                active === i.id && 'border-foreground font-medium text-foreground',
              )}
            >
              {i.label}
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
}
