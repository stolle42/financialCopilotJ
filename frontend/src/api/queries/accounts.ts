import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/api/client'

import { insightsKeys } from './insights'

export const accountKeys = {
  all: ['accounts'] as const,
}

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/accounts')
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      type: string
      opening_balance: string
    }) => {
      const { data, error } = await apiClient.POST('/api/accounts', { body })
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function usePatchAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: number
      body: { name?: string; type?: string; opening_balance?: string }
    }) => {
      const { data, error } = await apiClient.PATCH('/api/accounts/{account_id}', {
        params: { path: { account_id: id } },
        body,
      })
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useReconcileAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      actual_balance,
    }: {
      id: number
      actual_balance: string
    }) => {
      const { data, error } = await apiClient.POST(
        '/api/accounts/{account_id}/reconcile',
        {
          params: { path: { account_id: id } },
          body: { actual_balance },
        },
      )
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: insightsKeys.all })
    },
  })
}
