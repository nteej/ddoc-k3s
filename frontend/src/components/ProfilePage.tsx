import React, { useEffect, useRef, useState } from 'react';
import {
  User as UserIcon, Mail, Lock, Save, Loader2, Camera,
  KeyRound, Copy, Trash2, Package, ArrowUpCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiKey, KlarnaConfig, Role, Package as PackageType, PackageUsage, UpdateProfileData } from '@/types';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const EXPIRY_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'Unlimited', days: null },
] as const;

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateProfileData>({ email: '', password: '', companyId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) setFormData({ email: user.email, password: '', companyId: user.company?.id || '' });
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email?.trim()) newErrors.email = t('profile.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('profile.emailInvalid');
    if (formData.password && formData.password.length < 8) newErrors.password = t('profile.passwordMinLength');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: t('profile.invalidFile'), variant: 'destructive' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: t('profile.fileTooLarge'), variant: 'destructive' }); return; }
    setFormData(prev => ({ ...prev, avatar: file }));
    const reader = new FileReader();
    reader.onload = e => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSaving(true);
      const updatedUser = await api.updateProfile(formData);
      updateUser(updatedUser);
      setFormData(prev => ({ ...prev, password: '' }));
      setAvatarPreview(null);
      toast({ title: t('profile.profileUpdated'), description: t('profile.profileUpdatedDesc') });
    } catch {
      toast({ title: t('profile.errorSaving'), description: t('profile.errorSavingDesc'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Card className="glass-card border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserIcon className="w-6 h-6" />
          <span>{t('profile.personalInfo')}</span>
        </CardTitle>
        <CardDescription>{t('profile.personalInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarPreview || user?.avatar} />
                <AvatarFallback className="bg-blue-900 text-white text-2xl">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button" size="sm"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-blue-900 text-white"
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-gray-500">{t('profile.changePhotoHint')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center space-x-2">
              <Mail className="w-4 h-4" /><span>{t('login.emailLabel')}</span>
            </Label>
            <Input id="email" type="email" value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className="glass bg-gray-50 border-gray-200 focus:border-blue-400" />
            {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center space-x-2">
              <Lock className="w-4 h-4" /><span>{t('profile.newPassword')}</span>
            </Label>
            <Input id="password" type="password" placeholder={t('profile.newPasswordPlaceholder')}
              value={formData.password}
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
              className="glass bg-gray-50 border-gray-200 focus:border-blue-400" />
            {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
            <p className="text-xs text-gray-500">{t('profile.passwordHint')}</p>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" className="border-gray-200" disabled={saving}
              onClick={() => { if (user) setFormData({ email: user.email, password: '', companyId: user.company?.id || '' }); setAvatarPreview(null); }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-900 hover:bg-blue-800 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.saving')}</> : <><Save className="w-4 h-4 mr-2" />{t('common.save')}</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── My Package Tab ───────────────────────────────────────────────────────────

function MyPackageTab({ onUpgradeClick }: { onUpgradeClick: () => void }) {
  const [data, setData] = useState<{ package: PackageType; usage: PackageUsage } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    api.getCurrentPackage()
      .then(setData)
      .catch(() => toast({ title: 'Failed to load package info', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return null;

  const { package: pkg, usage } = data;

  const usageBar = (label: string, used: number, max: number) => {
    const unlimited = max === -1;
    const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium">{used} / {unlimited ? '∞' : max}</span>
        </div>
        {!unlimited && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-blue-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {pkg.name} Plan
            {pkg.price_monthly === 0 ? <Badge variant="secondary">Free</Badge> : <Badge className="bg-blue-900">€{pkg.price_monthly}/mo</Badge>}
          </CardTitle>
          <CardDescription>{pkg.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usageBar('API Keys', usage.api_keys, pkg.max_api_keys)}
          {usageBar('Team Members', usage.members, pkg.max_members)}
          {usageBar('Monthly Generations', usage.monthly_generations, pkg.max_monthly_generations)}

          {pkg.features && pkg.features.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium mb-2 text-gray-600">Included features</p>
              <ul className="space-y-1">
                {pkg.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pkg.slug !== 'enterprise' && (
            <div className="pt-4">
              <Button onClick={onUpgradeClick} className="bg-blue-900 hover:bg-blue-800 text-white gap-2">
                <ArrowUpCircle className="w-4 h-4" /> Upgrade Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [expiryPreset, setExpiryPreset] = useState<number | null>(30);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = () => api.listApiKeys().then(setKeys).catch(() => {});
  useEffect(() => { load(); }, []);

  const computeExpiresAt = (): string | undefined => {
    if (expiryPreset === null) return undefined;
    const d = new Date();
    d.setDate(d.getDate() + expiryPreset);
    return d.toISOString();
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setCreating(true);
      const result = await api.createApiKey(name.trim(), role, computeExpiresAt());
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
    <div className="space-y-6">
      {newKey && (
        <Card className="border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 text-sm">Key created — copy it now, it won't be shown again</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <code className="flex-1 bg-white rounded px-3 py-2 text-sm font-mono break-all border">{newKey}</code>
            <Button size="icon" variant="outline" onClick={() => copy(newKey)}><Copy className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card border-gray-200">
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
          <CardDescription>Generate a new API key with a name, role, and expiry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Key name (e.g. CI Pipeline)" value={name}
              onChange={e => setName(e.target.value)} className="flex-1 min-w-48" />
            <Select value={role} onValueChange={v => setRole(v as Role)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['viewer', 'editor', 'admin'] as Role[]).map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-gray-600 mb-2 block">Expiry</Label>
            <div className="flex gap-2 flex-wrap">
              {EXPIRY_PRESETS.map(p => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant={expiryPreset === p.days ? 'default' : 'outline'}
                  onClick={() => setExpiryPreset(p.days)}
                  className={expiryPreset === p.days ? 'bg-blue-900 text-white' : ''}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating || !name.trim()} className="bg-blue-900 hover:bg-blue-800 text-white gap-2">
            <KeyRound className="h-4 w-4" />
            {creating ? 'Creating…' : 'Create Key'}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-gray-200">
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
          <CardDescription>Use <code className="text-xs">Authorization: Bearer &lt;key&gt;</code> in API requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {keys.length === 0 && <p className="text-sm text-gray-500">No API keys yet.</p>}
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <KeyRound className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{k.name}</p>
                <p className="text-xs text-gray-500">
                  {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}
                  {k.expires_at && ` · Expires ${new Date(k.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">{k.role}</Badge>
              <Button variant="ghost" size="icon" onClick={() => handleRevoke(k.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Upgrade Plan Tab ─────────────────────────────────────────────────────────

function UpgradePlanTab() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [currentSlug, setCurrentSlug] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [klarnaConfig, setKlarnaConfig] = useState<KlarnaConfig | null>(null);

  const [selectedPkg, setSelectedPkg] = useState<PackageType | null>(null);
  const [billingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [klarnaStage, setKlarnaStage] = useState<'idle' | 'session' | 'widget' | 'authorizing'>('idle');
  const [paymentCategory, setPaymentCategory] = useState('pay_now');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const klarnaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.getPackages(), api.getCurrentPackage(), api.getKlarnaConfig()])
      .then(([pkgs, current, kConfig]) => {
        setPackages(pkgs);
        setCurrentSlug(current.package?.slug ?? 'free');
        setKlarnaConfig(kConfig);
      })
      .catch(() => toast({ title: 'Failed to load packages', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const loadKlarnaScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (window.Klarna) { resolve(); return; }
      const existing = document.getElementById('klarna-sdk');
      if (existing) { existing.addEventListener('load', () => resolve()); return; }
      const s = document.createElement('script');
      s.id = 'klarna-sdk';
      s.src = 'https://x.klarnacdn.net/kp/lib/v1/api.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Klarna SDK'));
      document.head.appendChild(s);
    });

  const openKlarnaDialog = async (pkg: PackageType) => {
    setSelectedPkg(pkg);

    if (pkg.price_monthly === 0) {
      // Free plan — no payment needed
      setKlarnaStage('idle');
      return;
    }

    setKlarnaStage('session');
    try {
      const session = await api.createKlarnaSession(pkg.id, billingPeriod);
      const category = session.payment_method_categories?.[0]?.identifier ?? 'pay_now';
      setPaymentCategory(category);

      await loadKlarnaScript();
      window.Klarna!.Payments.init({ client_token: session.client_token });

      setKlarnaStage('widget');
      // Give React a tick to mount the container div before calling load()
      setTimeout(() => {
        window.Klarna!.Payments.load(
          { container: '#klarna-payments-container', payment_method_category: category },
          {},
          (res) => { if (!res.show_form) toast({ title: 'Klarna widget unavailable', variant: 'destructive' }); },
        );
      }, 100);
    } catch (e: unknown) {
      toast({ title: 'Payment init failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
      setSelectedPkg(null);
      setKlarnaStage('idle');
    }
  };

  const handleKlarnaPay = () => {
    if (!selectedPkg) return;
    setKlarnaStage('authorizing');
    window.Klarna!.Payments.authorize({ payment_method_category: paymentCategory }, {}, async (res) => {
      if (res.approved && res.authorization_token) {
        try {
          setSubmitting(true);
          await api.completeKlarnaPayment(res.authorization_token, selectedPkg.id, billingPeriod);
          setSuccess(true);
          handleCloseDialog();
        } catch (e: unknown) {
          toast({ title: 'Payment failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
          setKlarnaStage('widget');
        } finally {
          setSubmitting(false);
        }
      } else {
        toast({ title: 'Payment not approved', variant: 'destructive' });
        setKlarnaStage('widget');
      }
    });
  };

  const handleFreeUpgrade = async () => {
    if (!selectedPkg) return;
    setSubmitting(true);
    try {
      await api.submitUpgradeRequest(selectedPkg.id);
      setSuccess(true);
      handleCloseDialog();
    } catch (e: unknown) {
      toast({ title: 'Upgrade failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedPkg(null);
    setKlarnaStage('idle');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {success && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <p className="font-semibold">Upgrade request submitted!</p>
                <p className="text-sm">An admin will review and approve your request shortly.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {packages.map(pkg => {
          const isCurrent = pkg.slug === currentSlug;
          const isFree = pkg.price_monthly === 0;
          const canSelect = !isCurrent && (isFree || klarnaConfig?.is_configured);
          return (
            <Card
              key={pkg.id}
              className={`glass-card border-2 transition-all ${canSelect ? 'cursor-pointer hover:border-blue-400' : 'opacity-60'} ${isCurrent ? 'border-blue-900 bg-blue-50/30' : 'border-gray-200'}`}
              onClick={() => canSelect && openKlarnaDialog(pkg)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  {isCurrent && <Badge className="bg-blue-900 text-white">Current</Badge>}
                </div>
                <CardDescription>
                  {isFree ? 'Free' : `€${pkg.price_monthly}/month`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 mb-4">
                  {(pkg.features ?? []).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button size="sm" className="w-full bg-blue-900 hover:bg-blue-800 text-white"
                    disabled={!canSelect}
                    onClick={e => { e.stopPropagation(); canSelect && openKlarnaDialog(pkg); }}>
                    {isFree ? 'Switch to Free' : (klarnaConfig?.is_configured ? 'Upgrade' : 'Payment not configured')}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!klarnaConfig?.is_configured && packages.some(p => p.price_monthly > 0) && (
        <p className="text-sm text-amber-600 text-center">
          Paid plan upgrades require payment gateway setup. Contact your administrator.
        </p>
      )}

      {/* Klarna Payment Dialog */}
      <Dialog open={!!selectedPkg} onOpenChange={open => { if (!open) handleCloseDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#FFB3C7] flex items-center justify-center text-xs font-bold text-black">K</div>
              {selectedPkg?.price_monthly === 0 ? `Switch to ${selectedPkg?.name}` : 'Pay with Klarna'}
            </DialogTitle>
            <DialogDescription>
              Upgrading to <strong>{selectedPkg?.name}</strong>
              {selectedPkg && selectedPkg.price_monthly > 0 && ` — €${selectedPkg.price_monthly}/month`}
              {klarnaConfig && <span className="ml-2 text-xs text-gray-400">({klarnaConfig.mode} mode)</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 min-h-[120px]">
            {/* Free plan — no payment */}
            {selectedPkg?.price_monthly === 0 && (
              <p className="text-sm text-gray-600">No payment required. Submit to request the plan change.</p>
            )}

            {/* Loading session */}
            {selectedPkg && selectedPkg.price_monthly > 0 && klarnaStage === 'session' && (
              <div className="flex items-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Klarna…</span>
              </div>
            )}

            {/* Klarna widget container */}
            {selectedPkg && selectedPkg.price_monthly > 0 && (klarnaStage === 'widget' || klarnaStage === 'authorizing') && (
              <div id="klarna-payments-container" ref={klarnaContainerRef} className="min-h-[100px]" />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={submitting || klarnaStage === 'authorizing'}>
              Cancel
            </Button>

            {selectedPkg?.price_monthly === 0 ? (
              <Button onClick={handleFreeUpgrade} disabled={submitting} className="bg-blue-900 hover:bg-blue-800 text-white">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : 'Confirm'}
              </Button>
            ) : (
              <Button
                onClick={handleKlarnaPay}
                disabled={klarnaStage !== 'widget' || submitting}
                className="bg-[#FFB3C7] hover:bg-[#ff9ab8] text-black font-semibold"
              >
                {klarnaStage === 'authorizing' || submitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
                  : 'Pay with Klarna'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">{t('profile.title')}</h1>
        <p className="text-gray-700 mt-2">{t('profile.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="package" className="flex items-center gap-2">
            <Package className="w-4 h-4" /> My Package
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="upgrade" className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4" /> Upgrade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="package">
          <MyPackageTab onUpgradeClick={() => setActiveTab('upgrade')} />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="upgrade">
          <UpgradePlanTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
