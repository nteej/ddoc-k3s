import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Organization, OrgMember, Role } from '@/types';
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus } from 'lucide-react';

const ROLE_COLORS: Record<Role, string> = {
  owner:  'bg-purple-100 text-purple-800',
  admin:  'bg-blue-100 text-blue-800',
  editor: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
};

export default function OrganizationPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('viewer');
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  const loadData = async () => {
    const [orgData, memberData] = await Promise.all([api.getOrganization(), api.listMembers()]);
    setOrg(orgData);
    setName(orgData.name);
    setMembers(memberData);
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveOrg = async () => {
    try {
      setSaving(true);
      await api.updateOrganization({ name });
      toast({ title: 'Organization updated' });
      await loadData();
    } catch (e: unknown) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    try {
      setInviting(true);
      const { token } = await api.inviteMember(inviteEmail, inviteRole);
      toast({
        title: 'Invitation sent',
        description: `Token: ${token}`,
      });
      setInviteEmail('');
    } catch (e: unknown) {
      toast({ title: 'Invite failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: Role) => {
    try {
      await api.updateMemberRole(memberId, role);
      await loadData();
    } catch (e: unknown) {
      toast({ title: 'Role update failed', variant: 'destructive' });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await api.removeMember(memberId);
      await loadData();
      toast({ title: 'Member removed' });
    } catch (e: unknown) {
      toast({ title: 'Remove failed', variant: 'destructive' });
    }
  };

  if (!org) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Organization</h1>
        <p className="text-muted-foreground">{org.slug}</p>
      </div>

      {/* Org settings — admin+ */}
      <RoleGuard minRole="admin">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Update your organization name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <Button onClick={handleSaveOrg} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      </RoleGuard>

      {/* Member list */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members.length} / {org.max_members ?? '∞'} seats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              <RoleGuard minRole="owner"
                fallback={
                  <Badge className={`capitalize ${ROLE_COLORS[m.role]}`}>{m.role}</Badge>
                }
              >
                {m.id === user?.id ? (
                  <Badge className={`capitalize ${ROLE_COLORS[m.role]}`}>{m.role}</Badge>
                ) : (
                  <Select value={m.role} onValueChange={v => handleRoleChange(m.id, v as Role)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['viewer', 'editor', 'admin'] as Role[]).map(r => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </RoleGuard>
              <RoleGuard minRole="admin">
                {m.id !== user?.id && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </RoleGuard>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite — admin+ */}
      <RoleGuard minRole="admin">
        <Card>
          <CardHeader>
            <CardTitle>Invite Member</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            <Input
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 min-w-48"
            />
            <Select value={inviteRole} onValueChange={v => setInviteRole(v as Role)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['viewer', 'editor', 'admin'] as Role[]).map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
              <UserPlus className="h-4 w-4 mr-2" />
              {inviting ? 'Inviting…' : 'Invite'}
            </Button>
          </CardContent>
        </Card>
      </RoleGuard>
    </div>
  );
}
