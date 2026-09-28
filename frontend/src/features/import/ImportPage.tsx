import { useState } from 'react'
import { useNavigate } from 'react-router'

import {
  useCreateImportProfile,
  useImportBatches,
} from '@/api/queries/import'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { BatchList } from './BatchList'
import { ProfileForm } from './ProfileForm'
import { UploadForm } from './UploadForm'

export function ImportPage() {
  const navigate = useNavigate()
  const { data: batches = [] } = useImportBatches()
  const createProfile = useCreateImportProfile()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Upload a bank CSV, review rows, then confirm into your ledger.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setProfileOpen(true)}>
          New mapping profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadForm
            onUploaded={(batchId) => navigate(`/import/${batchId}`)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending batches</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchList batches={batches} />
        </CardContent>
      </Card>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mapping profile</DialogTitle>
          </DialogHeader>
          <ProfileForm
            onSubmit={async (body) => {
              await createProfile.mutateAsync(body)
              setProfileOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
