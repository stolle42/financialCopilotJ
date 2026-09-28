import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/api/client'

import { budgetKeys } from './budgets'
import { insightsKeys } from './insights'

export const categoryKeys = {
  all: ['categories'] as const,
}

function invalidateCategoryDependents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: categoryKeys.all })
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
  queryClient.invalidateQueries({ queryKey: budgetKeys.all })
  queryClient.invalidateQueries({ queryKey: insightsKeys.all })
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/categories')
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      colour: string
      side: 'expense' | 'income'
    }) => {
      const { data, error } = await apiClient.POST('/api/categories', { body })
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      invalidateCategoryDependents(queryClient)
    },
  })
}

export function usePatchCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: number
      body: { name?: string; colour?: string }
    }) => {
      const { data, error } = await apiClient.PATCH('/api/categories/{category_id}', {
        params: { path: { category_id: id } },
        body,
      })
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      invalidateCategoryDependents(queryClient)
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await apiClient.DELETE('/api/categories/{category_id}', {
        params: { path: { category_id: id } },
      })
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      invalidateCategoryDependents(queryClient)
    },
  })
}
