import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/api/client'

export const categoryKeys = {
  all: ['categories'] as const,
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
