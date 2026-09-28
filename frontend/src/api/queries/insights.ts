import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/api/client'

export const insightsKeys = {
  all: ['insights'] as const,
  range: (from: string, to: string) => ['insights', from, to] as const,
}

export type InsightsRange = {
  from: string
  to: string
}

export function useInsights({ from, to }: InsightsRange) {
  return useQuery({
    queryKey: insightsKeys.range(from, to),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/insights', {
        params: { query: { from, to } },
      })
      if (error) {
        throw error
      }
      return data
    },
  })
}
