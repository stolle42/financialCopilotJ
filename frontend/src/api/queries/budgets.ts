import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/api/client'

import { insightsKeys } from './insights'

export const budgetKeys = {
  all: ['budgets'] as const,
  month: (month: string) => ['budgets', month] as const,
}

export function useBudgetProgress(month: string) {
  return useQuery({
    queryKey: budgetKeys.month(month),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/budgets', {
        params: { query: { month } },
      })
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useUpsertBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      categoryId,
      monthly_limit,
    }: {
      categoryId: number
      monthly_limit: string
    }) => {
      const { data, error } = await apiClient.PUT('/api/budgets/{category_id}', {
        params: { path: { category_id: categoryId } },
        body: { monthly_limit },
      })
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
      queryClient.invalidateQueries({ queryKey: insightsKeys.all })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (categoryId: number) => {
      const { error } = await apiClient.DELETE('/api/budgets/{category_id}', {
        params: { path: { category_id: categoryId } },
      })
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
      queryClient.invalidateQueries({ queryKey: insightsKeys.all })
    },
  })
}
