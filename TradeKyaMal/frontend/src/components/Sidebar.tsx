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
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/data-collection', label: 'Data Collection', icon: Database },
  { href: '/agents/almanac', label: 'Almanac Agent', icon: Calendar },
  { href: '/agents/macro', label: 'Macro Agent', icon: BarChart3 },
  { href: '/agents/technical', label: 'Technical Agent', icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-border-subtle bg-surface-raised">
      <div className="border-b border-border-subtle px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
            <Bot className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">TradeKyaMal</h1>
            <p className="text-[11px] text-text-muted">Design Thinking 3</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
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
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-subtle px-5 py-4">
        <p className="text-[11px] text-text-muted">Trading Intelligence Platform</p>
      </div>
    </aside>
  );
}
