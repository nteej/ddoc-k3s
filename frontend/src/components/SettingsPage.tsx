import React, { useEffect, useState } from 'react';
import { Settings, CheckCircle2, XCircle, Package, Loader2, Plus, Edit, Trash2, CreditCard, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { KlarnaSettings, Package as PackageType, PackageUpgradeRequest } from '@/types';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// ─── SettingsPage ─────────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isSystemAdmin = user?.isSystemAdmin === true;

  if (!isSystemAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        </div>
        <Card className="glass-card border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-700" />
              Tags &amp; Contexts have moved
            </CardTitle>
            <CardDescription>
              Manage your dynamic fields directly from the{' '}
              <Link to="/generate" className="text-blue-700 hover:text-blue-800 font-medium">
                Generate page
              </Link>{' '}
              under the <strong>Fields</strong> tab.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-blue-700" />
        <div>
          <h1 className="text-3xl font-bold gradient-text">Settings</h1>
          <p className="text-gray-700 mt-1">Manage global platform settings.</p>
        </div>
      </div>
      <GlobalSettingsTab />
    </div>
  );
};

// ─── Global Settings Tab ─────────────────────────────────────────────────────

const emptyPkgForm = () => ({
  name: '', slug: '', description: '', price_monthly: 0, price_yearly: 0,
  max_api_keys: 1, max_members: 5, max_monthly_generations: 100,
  max_file_storage_mb: 500, features: '', is_active: true,
});

const GlobalSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<PackageUpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [klarnaSettings, setKlarnaSettings] = useState<KlarnaSettings | null>(null);
  const [klarnaForm, setKlarnaForm] = useState({
    mode: 'sandbox' as 'sandbox' | 'production',
    sandbox_username: '',
    sandbox_password: '',
    production_username: '',
    production_password: '',
  });
  const [showSandboxPwd, setShowSandboxPwd] = useState(false);
  const [showProdPwd, setShowProdPwd] = useState(false);
  const [klarnaSaving, setKlarnaSaving] = useState(false);

  const [showPkgDialog, setShowPkgDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageType | null>(null);
  const [pkgForm, setPkgForm] = useState(emptyPkgForm());
  const [pkgSaving, setPkgSaving] = useState(false);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [pkgs, requests, kSettings] = await Promise.all([
        api.getAdminPackages(),
        api.getUpgradeRequests(),
        api.getKlarnaSettings(),
      ]);
      setPackages(pkgs);
      setUpgradeRequests(requests);
      setKlarnaSettings(kSettings);
      setKlarnaForm(f => ({
        ...f,
        mode: kSettings.mode,
        sandbox_username: kSettings.sandbox_username ?? '',
        production_username: kSettings.production_username ?? '',
      }));
    } catch {
      toast({ title: 'Failed to load global settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveKlarna = async () => {
    setKlarnaSaving(true);
    try {
      await api.updateKlarnaSettings({
        mode: klarnaForm.mode,
        sandbox_username: klarnaForm.sandbox_username || undefined,
        sandbox_password: klarnaForm.sandbox_password || undefined,
        production_username: klarnaForm.production_username || undefined,
        production_password: klarnaForm.production_password || undefined,
      });
      toast({ title: 'Klarna settings saved' });
      await load();
    } catch (e: unknown) {
      toast({ title: 'Failed to save', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setKlarnaSaving(false);
    }
  };

  const openCreate = () => { setEditingPkg(null); setPkgForm(emptyPkgForm()); setShowPkgDialog(true); };
  const openEdit = (pkg: PackageType) => {
    setEditingPkg(pkg);
    setPkgForm({
      name: pkg.name, slug: pkg.slug, description: pkg.description ?? '',
      price_monthly: pkg.price_monthly, price_yearly: pkg.price_yearly,
      max_api_keys: pkg.max_api_keys, max_members: pkg.max_members,
      max_monthly_generations: pkg.max_monthly_generations,
      max_file_storage_mb: pkg.max_file_storage_mb,
      features: (pkg.features ?? []).join(', '),
      is_active: pkg.is_active,
    });
    setShowPkgDialog(true);
  };

  const handleSavePkg = async () => {
    try {
      setPkgSaving(true);
      const payload = {
        ...pkgForm,
        features: pkgForm.features ? pkgForm.features.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      if (editingPkg) {
        await api.updateAdminPackage(editingPkg.id, payload);
        toast({ title: 'Package updated' });
      } else {
        await api.createAdminPackage(payload);
        toast({ title: 'Package created' });
      }
      setShowPkgDialog(false);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setPkgSaving(false);
    }
  };

  const handleDeletePkg = async (id: string) => {
    try {
      await api.deleteAdminPackage(id);
      toast({ title: 'Package deleted' });
      await load();
    } catch {
      toast({ title: 'Failed to delete package', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.processUpgradeRequest(id, 'approve');
      toast({ title: 'Upgrade request approved' });
      await load();
    } catch (e: unknown) {
      toast({ title: 'Failed to approve', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try {
      await api.processUpgradeRequest(rejectingId, 'reject', rejectReason || undefined);
      toast({ title: 'Upgrade request rejected' });
      setRejectingId(null);
      setRejectReason('');
      await load();
    } catch (e: unknown) {
      toast({ title: 'Failed to reject', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      {/* Package Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
              <Package className="w-5 h-5" /> Package Management
            </h2>
            <p className="text-gray-500 text-sm">Create and manage subscription packages.</p>
          </div>
          <Button onClick={openCreate} className="gap-2 bg-blue-900 hover:bg-blue-800 text-white">
            <Plus className="w-4 h-4" /> New Package
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Slug</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Price/mo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">API Keys</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Members</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Generations</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Active</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => (
                <tr key={pkg.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium">{pkg.name}</td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">{pkg.slug}</td>
                  <td className="py-3 px-4">{pkg.price_monthly === 0 ? 'Free' : `€${pkg.price_monthly}`}</td>
                  <td className="py-3 px-4">{pkg.max_api_keys === -1 ? '∞' : pkg.max_api_keys}</td>
                  <td className="py-3 px-4">{pkg.max_members === -1 ? '∞' : pkg.max_members}</td>
                  <td className="py-3 px-4">{pkg.max_monthly_generations === -1 ? '∞' : pkg.max_monthly_generations}</td>
                  <td className="py-3 px-4">
                    <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePkg(pkg.id)}
                      className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">No packages yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Requests */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Upgrade Requests</h2>
          <p className="text-gray-500 text-sm">Review and approve or reject plan upgrade requests.</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Organization</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Current Plan</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Requested Plan</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Submitted</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {upgradeRequests.map(req => (
                <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium">{req.organization_name ?? req.organization_id}</td>
                  <td className="py-3 px-4 capitalize text-gray-500">{req.current_package_slug}</td>
                  <td className="py-3 px-4 font-medium">{req.requested_package_name ?? req.requested_package_slug}</td>
                  <td className="py-3 px-4">
                    <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {req.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right space-x-1">
                    {req.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(req.id)}
                          className="bg-green-600 hover:bg-green-700 text-white gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectingId(req.id); setRejectReason(''); }}
                          className="text-red-500 border-red-300 hover:bg-red-50 gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {upgradeRequests.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No upgrade requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Klarna Payment Gateway Config */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment Gateway (Klarna)
          </h2>
          <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
            Active mode:
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${klarnaSettings?.mode === 'production' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {klarnaSettings?.mode === 'production' ? 'Production' : 'Sandbox'}
            </span>
            {klarnaSettings?.is_configured
              ? <span className="text-green-600 text-xs">● Configured</span>
              : <span className="text-red-500 text-xs">● Not configured</span>}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-5 space-y-5 bg-white">
          {/* Mode toggle */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 w-20">Mode</span>
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-sm">
              {(['sandbox', 'production'] as const).map(m => (
                <button key={m} onClick={() => setKlarnaForm(f => ({ ...f, mode: m }))}
                  className={`px-4 py-1.5 capitalize transition-colors ${klarnaForm.mode === m ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Sandbox credentials */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-amber-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Sandbox
                {klarnaSettings?.sandbox_password_set && <span className="ml-auto text-xs text-gray-400 font-normal">password set</span>}
              </p>
              <div className="space-y-1">
                <Label className="text-xs">API Username</Label>
                <Input placeholder="PK12345_…" value={klarnaForm.sandbox_username}
                  onChange={e => setKlarnaForm(f => ({ ...f, sandbox_username: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">API Password</Label>
                <div className="relative">
                  <Input type={showSandboxPwd ? 'text' : 'password'}
                    placeholder={klarnaSettings?.sandbox_password_set ? 'Leave blank to keep existing' : 'Enter password'}
                    value={klarnaForm.sandbox_password}
                    onChange={e => setKlarnaForm(f => ({ ...f, sandbox_password: e.target.value }))}
                    className="pr-9" />
                  <button type="button" onClick={() => setShowSandboxPwd(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSandboxPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Production credentials */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-green-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Production
                {klarnaSettings?.production_password_set && <span className="ml-auto text-xs text-gray-400 font-normal">password set</span>}
              </p>
              <div className="space-y-1">
                <Label className="text-xs">API Username</Label>
                <Input placeholder="PK12345_…" value={klarnaForm.production_username}
                  onChange={e => setKlarnaForm(f => ({ ...f, production_username: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">API Password</Label>
                <div className="relative">
                  <Input type={showProdPwd ? 'text' : 'password'}
                    placeholder={klarnaSettings?.production_password_set ? 'Leave blank to keep existing' : 'Enter password'}
                    value={klarnaForm.production_password}
                    onChange={e => setKlarnaForm(f => ({ ...f, production_password: e.target.value }))}
                    className="pr-9" />
                  <button type="button" onClick={() => setShowProdPwd(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showProdPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={handleSaveKlarna} disabled={klarnaSaving} className="bg-blue-900 hover:bg-blue-800 text-white gap-2">
              {klarnaSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Klarna Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Package Create/Edit Dialog */}
      <Dialog open={showPkgDialog} onOpenChange={open => { if (!open) setShowPkgDialog(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPkg ? 'Edit Package' : 'New Package'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {(['name', 'slug', 'description'] as const).map(field => (
              <div key={field} className="space-y-1">
                <Label className="capitalize">{field}</Label>
                <Input value={(pkgForm as Record<string, string | number | boolean>)[field] as string}
                  onChange={e => setPkgForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={field} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {(['price_monthly', 'price_yearly', 'max_api_keys', 'max_members', 'max_monthly_generations', 'max_file_storage_mb'] as const).map(field => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs capitalize">{field.replace(/_/g, ' ')}</Label>
                  <Input type="number" value={(pkgForm as Record<string, number>)[field] as number}
                    onChange={e => setPkgForm(p => ({ ...p, [field]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Features (comma-separated)</Label>
              <Input value={pkgForm.features}
                onChange={e => setPkgForm(p => ({ ...p, features: e.target.value }))}
                placeholder="Feature 1, Feature 2, Feature 3" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pkg-active" checked={pkgForm.is_active}
                onChange={e => setPkgForm(p => ({ ...p, is_active: e.target.checked }))} />
              <Label htmlFor="pkg-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPkgDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePkg} disabled={pkgSaving || !pkgForm.name || !pkgForm.slug}
              className="bg-blue-900 hover:bg-blue-800 text-white">
              {pkgSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Save Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={open => { if (!open) setRejectingId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Upgrade Request</DialogTitle>
            <DialogDescription>Optionally provide a reason for the rejection.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input placeholder="Rejection reason (optional)" value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white">Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
