import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Webhook, WebhookDelivery, WebhookEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronRight, Copy, Trash2, Webhook as WebhookIcon } from 'lucide-react';

const ALL_EVENTS: WebhookEvent[] = [
  'document.generated',
  'document.failed',
  'member.invited',
  'member.joined',
];

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failed:  'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export default function WebhooksPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks]   = useState<Webhook[]>([]);
  const [url, setUrl]             = useState('');
  const [events, setEvents]       = useState<WebhookEvent[]>(['document.generated']);
  const [creating, setCreating]   = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});

  const load = () => api.listWebhooks().then(setWebhooks).catch(() => {});

  useEffect(() => { load(); }, []);

  const toggleEvent = (e: WebhookEvent) =>
    setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const handleCreate = async () => {
    if (!url.trim() || events.length === 0) return;
    try {
      setCreating(true);
      await api.createWebhook(url.trim(), events);
      setUrl('');
      setEvents(['document.generated']);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteWebhook(id);
      toast({ title: 'Webhook removed' });
      await load();
    } catch {
      toast({ title: 'Failed to remove webhook', variant: 'destructive' });
    }
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!deliveries[id]) {
      const d = await api.listWebhookDeliveries(id).catch(() => []);
      setDeliveries(prev => ({ ...prev, [id]: d }));
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied' });
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-muted-foreground">Get notified when events happen in your organization.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Register Endpoint</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="https://your-server.com/webhook"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Events</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map(e => (
                <label key={e} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={events.includes(e)}
                    onCheckedChange={() => toggleEvent(e)}
                  />
                  <span className="text-sm font-mono">{e}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating || !url.trim() || events.length === 0}>
            <WebhookIcon className="h-4 w-4 mr-2" />
            {creating ? 'Registering…' : 'Register'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {webhooks.length === 0 && (
          <p className="text-sm text-muted-foreground">No webhooks registered.</p>
        )}
        {webhooks.map(w => (
          <Card key={w.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate">{w.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.events.map(e => (
                      <Badge key={e} variant="outline" className="text-xs font-mono">{e}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => copy(w.secret)} title="Copy signing secret">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleExpand(w.id)}>
                    {expanded === w.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expanded === w.id && (
              <CardContent className="pt-0 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Deliveries</p>
                {(deliveries[w.id] ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No deliveries yet.</p>
                ) : (
                  <div className="space-y-1">
                    {(deliveries[w.id] ?? []).map(d => (
                      <div key={d.id} className="flex items-center gap-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>
                          {d.status}
                        </span>
                        <span className="font-mono text-muted-foreground">{d.event}</span>
                        <span className="text-muted-foreground">{d.response_code ?? '—'}</span>
                        <span className="text-muted-foreground ml-auto">
                          {new Date(d.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
