import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient, apiFetch } from '@/api/client'
import type { components } from '@/api/schema'

import { accountKeys } from './accounts'
import { transactionKeys } from './transactions'

export type MappingProfile = components['schemas']['MappingProfileOut']
export type MappingProfileIn = components['schemas']['MappingProfileIn']
export type PendingBatchSummary = components['schemas']['PendingBatchSummaryOut']
export type PendingBatchDetail = components['schemas']['PendingBatchDetailOut']
export type PendingRow = components['schemas']['PendingRowOut']
export type PendingRowPatch = components['schemas']['PendingRowPatchIn']

async function postImportMultipart(
  form: FormData,
): Promise<PendingBatchDetail> {
  const base = import.meta.env.VITEST ? 'http://localhost' : ''
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)
  const token = match ? decodeURIComponent(match[1]) : undefined
  const response = await apiFetch(`${base}/api/import/batches`, {
    method: 'POST',
    body: form,
    headers: token ? { 'X-CSRFToken': token } : undefined,
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json() as Promise<PendingBatchDetail>
}

export const importKeys = {
  profiles: ['import', 'profiles'] as const,
  batches: ['import', 'batches'] as const,
  batch: (id: number) => ['import', 'batches', id] as const,
}

export function useImportProfiles() {
  return useQuery({
    queryKey: importKeys.profiles,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/import/profiles')
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useCreateImportProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: MappingProfileIn) => {
      const { data, error } = await apiClient.POST('/api/import/profiles', {
        body,
      })
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.profiles })
    },
  })
}

export function useImportBatches() {
  return useQuery({
    queryKey: importKeys.batches,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/import/batches')
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useImportBatch(batchId: number | undefined) {
  return useQuery({
    queryKey: importKeys.batch(batchId ?? 0),
    enabled: batchId !== undefined && batchId > 0,
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/api/import/batches/{batch_id}',
        { params: { path: { batch_id: batchId! } } },
      )
      if (error) {
        throw error
      }
      return data
    },
  })
}

export function useUploadImportBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      accountId,
      profileId,
      file,
    }: {
      accountId: number
      profileId: number
      file: File
    }) => {
      const form = new FormData()
      form.append('account_id', String(accountId))
      form.append('profile_id', String(profileId))
      form.append('file', file)
      return postImportMultipart(form)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: importKeys.batches })
      if (data?.id) {
        queryClient.setQueryData(importKeys.batch(data.id), data)
      }
    },
  })
}

export function usePatchImportRows(batchId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patches: PendingRowPatch[]) => {
      const { data, error } = await apiClient.PATCH(
        '/api/import/batches/{batch_id}/rows',
        {
          params: { path: { batch_id: batchId } },
          body: patches,
        },
      )
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(importKeys.batch(batchId), data)
    },
  })
}

export function useConfirmImportBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (batchId: number) => {
      const { data, error } = await apiClient.POST(
        '/api/import/batches/{batch_id}/confirm',
        { params: { path: { batch_id: batchId } } },
      )
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.batches })
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
    },
  })
}

export function useDiscardImportBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (batchId: number) => {
      const { error } = await apiClient.DELETE(
        '/api/import/batches/{batch_id}',
        { params: { path: { batch_id: batchId } } },
      )
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.batches })
    },
  })
}
