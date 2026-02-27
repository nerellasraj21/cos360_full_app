import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, UserPlus, Trash2, Loader2, Shield, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useMarkPermissions,
  useGrantMarkPermission,
  useRevokeMarkPermission,
  useExamDetail,
} from '@/api/hooks/exam/useExam'

export default function MarkPermissions() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()

  const [newUserId, setNewUserId] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<{ permId: string; name: string } | null>(null)

  const { data: exam } = useExamDetail(id)
  const { data: permissions = [], isLoading } = useMarkPermissions(id)
  const grantMutation = useGrantMarkPermission(id)
  const revokeMutation = useRevokeMarkPermission(id)

  const handleGrant = () => {
    if (!newUserId.trim()) return
    grantMutation.mutate(newUserId.trim(), { onSuccess: () => setNewUserId('') })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: `/exam/exams/${id}` as any })} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Shield className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Mark Entry Permissions</h1>
          {exam && <p className="text-sm text-muted-foreground">{exam.exam_name}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Teachers can always enter marks for their assigned subjects. This panel is for granting access to Clerk/CA staff only.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {permissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No additional permissions granted yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Granted By</th>
                    <th className="px-4 py-3 text-left font-medium">Granted At</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm.id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {perm.user_display_name ?? perm.user_id}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{perm.granted_by}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(perm.granted_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={perm.is_active ? 'default' : 'secondary'}>
                          {perm.is_active ? 'Active' : 'Revoked'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevokeTarget({ permId: perm.id, name: perm.user_display_name ?? perm.user_id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Grant access */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-medium">Grant Access to User</h3>
            <div className="flex gap-2">
              <Input
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="Enter User ID"
                className="max-w-72"
                onKeyDown={(e) => e.key === 'Enter' && handleGrant()}
              />
              <Button
                onClick={handleGrant}
                disabled={grantMutation.isPending || !newUserId.trim()}
                className="gap-2"
              >
                {grantMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Grant Access
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Revoke Confirmation */}
      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Access?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will prevent <strong>{revokeTarget?.name}</strong> from entering marks for this exam.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={revokeMutation.isPending}
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.permId, { onSuccess: () => setRevokeTarget(null) })}
            >
              {revokeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
