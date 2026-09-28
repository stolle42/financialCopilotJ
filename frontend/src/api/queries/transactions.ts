import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/api/client'

import { accountKeys } from './accounts'

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: Record<string, string | undefined>) =>
    ['transactions', filters] as const,
  defaults: ['transactions', 'defaults'] as const,
}

export type TransactionFilters = {
  account_id?: string
  kind?: string
  from?: string
  to?: string
  q?: string
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/transactions', {
        params: { query: filters },
      })
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useTransactionDefaults() {
  return useQuery({
    queryKey: transactionKeys.defaults,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/transactions/defaults')
      if (error) {
        throw error
      }
      return data
    },
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data, error } = await apiClient.POST('/api/transactions', {
        body: body as never,
      })
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      queryClient.invalidateQueries({ queryKey: transactionKeys.defaults })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: number
      body: Record<string, unknown>
    }) => {
      const { data, error } = await apiClient.PATCH(
        '/api/transactions/{transaction_id}',
        {
          params: { path: { transaction_id: id } },
          body: body as never,
        },
      )
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      queryClient.invalidateQueries({ queryKey: transactionKeys.defaults })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await apiClient.DELETE(
        '/api/transactions/{transaction_id}',
        { params: { path: { transaction_id: id } } },
      )
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
    },
  })
}
