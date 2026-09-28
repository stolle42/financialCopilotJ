import { Link, Outlet } from 'react-router'

const navItems = [
  { to: '/', label: 'Transactions' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/categories', label: 'Categories' },
  { to: '/import', label: 'Import' },
  { to: '/budgets', label: 'Budgets' },
  { to: '/insights', label: 'Insights' },
] as const

export function AppShell() {
  return (
    <div className="flex min-h-svh">
      <nav
        aria-label="Main"
        className="flex w-52 flex-col gap-1 border-r border-border bg-muted/30 p-4"
      >
        <p className="mb-4 text-sm font-semibold tracking-tight">
          Financial Copilot
        </p>
        {navItems.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            {label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
