import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from '@/components/layout/AppShell'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { BudgetsPage } from '@/features/budgets/BudgetsPage'
import { CategoriesPage } from '@/features/categories/CategoriesPage'
import { ImportPage } from '@/features/import/ImportPage'
import { ImportReviewPage } from '@/features/import/ImportReviewPage'
import { InsightsPage } from '@/features/insights/InsightsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'

const queryClient = new QueryClient()

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TransactionsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="import/:batchId" element={<ImportReviewPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
