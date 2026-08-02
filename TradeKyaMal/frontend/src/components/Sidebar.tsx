'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Bot,
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  Target,
  ClipboardCheck,
} from 'lucide-react';
import clsx from 'clsx';

const navGroups = [
  {
    label: 'Platform',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/data-collection', label: 'Data Collection', icon: Database },
    ],
  },
  {
    label: 'Agents',
    items: [
      { href: '/agents/almanac', label: 'Almanac', icon: Calendar },
      { href: '/agents/macro', label: 'Macro', icon: BarChart3 },
      { href: '/agents/technical', label: 'Technical', icon: TrendingUp },
      { href: '/agents/llm', label: 'LLM', icon: Sparkles },
      { href: '/agents/final', label: 'Final', icon: Target },
    ],
  },
  {
    label: 'Team',
    items: [{ href: '/review', label: 'Review', icon: ClipboardCheck }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col border-r border-border-subtle bg-surface-raised/95 backdrop-blur-md">
      <div className="border-b border-border-subtle px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 ring-1 ring-accent/20">
            <Bot className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">TradeKyaMal</h1>
            <p className="text-[11px] text-text-muted">Market Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-accent/10 font-medium text-accent'
                        : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border-subtle px-5 py-4">
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Pipeline v1</p>
      </div>
    </aside>
  );
}
