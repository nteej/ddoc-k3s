import { useEffect, useState } from 'react';
import api from '@/services/api';
import { ApiKey, Role } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, KeyRound, Trash2 } from 'lucide-react';

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys]       = useState<ApiKey[]>([]);
  const [name, setName]       = useState('');
  const [role, setRole]       = useState<Role>('editor');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey]   = useState<string | null>(null);

  const load = () => api.listApiKeys().then(setKeys).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setCreating(true);
      const result = await api.createApiKey(name.trim(), role);
      setNewKey(result.key);
      setName('');
      await load();
    } catch (e: unknown) {
      toast({ title: 'Failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.revokeApiKey(id);
      toast({ title: 'API key revoked' });
      await load();
    } catch {
      toast({ title: 'Failed to revoke key', variant: 'destructive' });
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-muted-foreground">Programmatic access to your organization.</p>
      </div>

      {newKey && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300 text-sm">
              Key created — copy it now, it won't be shown again
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <code className="flex-1 bg-white dark:bg-black rounded px-3 py-2 text-sm font-mono break-all border">
              {newKey}
            </code>
            <Button size="icon" variant="outline" onClick={() => copy(newKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create Key</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Input
            placeholder="Key name (e.g. CI Pipeline)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 min-w-48"
          />
          <Select value={role} onValueChange={v => setRole(v as Role)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['viewer', 'editor', 'admin'] as Role[]).map(r => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            <KeyRound className="h-4 w-4 mr-2" />
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
          <CardDescription>Use <code className="text-xs">Authorization: Bearer &lt;key&gt;</code> in API requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {keys.length === 0 && (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          )}
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3">
              <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground">
                  {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}
                  {k.expires_at && ` · Expires ${new Date(k.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">{k.role}</Badge>
              <Button variant="ghost" size="icon" onClick={() => handleRevoke(k.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
