import { useEffect, useState } from 'react'

import { useAccounts } from '@/api/queries/accounts'
import { useImportProfiles, useUploadImportBatch } from '@/api/queries/import'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type UploadFormProps = {
  onUploaded: (batchId: number) => void
}

export function UploadForm({ onUploaded }: UploadFormProps) {
  const { data: accounts = [] } = useAccounts()
  const { data: profiles = [] } = useImportProfiles()
  const upload = useUploadImportBatch()

  const [accountId, setAccountId] = useState<string>('')
  const [profileId, setProfileId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (accounts.length === 1 && accountId === '') {
      setAccountId(String(accounts[0].id))
    }
  }, [accounts, accountId])

  useEffect(() => {
    if (profiles.length === 1 && profileId === '') {
      setProfileId(String(profiles[0].id))
    }
  }, [profiles, profileId])

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        if (!file || !accountId || !profileId) {
          setError('Choose an account, profile, and CSV file.')
          return
        }
        try {
          const batch = await upload.mutateAsync({
            accountId: Number(accountId),
            profileId: Number(profileId),
            file,
          })
          if (batch?.id) {
            onUploaded(batch.id)
          }
        } catch {
          setError('Upload failed. Check the file and mapping profile.')
        }
      }}
    >
      <div>
        <Label htmlFor="upload-account">Account</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger id="upload-account" className="w-full" aria-label="Account">
            <SelectValue placeholder="Select account">
              {accounts.find((a) => String(a.id) === accountId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={String(account.id)}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="upload-profile">Mapping profile</Label>
        <Select value={profileId} onValueChange={setProfileId}>
          <SelectTrigger id="upload-profile" className="w-full" aria-label="Mapping profile">
            <SelectValue placeholder="Select profile">
              {profiles.find((p) => String(p.id) === profileId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={String(profile.id)}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="upload-file">CSV file</Label>
        <Input
          id="upload-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null)
          }}
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm md:col-span-2">{error}</p>
      ) : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={upload.isPending}>
          {upload.isPending ? 'Uploading…' : 'Upload and review'}
        </Button>
      </div>
    </form>
  )
}
