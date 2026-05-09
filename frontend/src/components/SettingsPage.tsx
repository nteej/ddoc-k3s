import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Tag as TagIcon, Edit, Trash2, Loader2, FolderOpen, Folder,
  Type, Hash, Calendar, List, Mail, AlignLeft, X, Settings, CheckCircle2,
  XCircle, Package,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Tag, TagType, Context, CreateTagData, CreateContextData, Package as PackageType, PackageUpgradeRequest } from '@/types';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

// ─── Tag type metadata ────────────────────────────────────────────────────────

interface TagTypeConfig {
  value: TagType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hasOptions: boolean;
}

const makeTagTypes = (t: TFunction): TagTypeConfig[] => [
  { value: '1', label: t('settings.typeText'), description: t('settings.typeTextDesc'), icon: <Type className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-800', hasOptions: false },
  { value: '2', label: t('settings.typeNumber'), description: t('settings.typeNumberDesc'), icon: <Hash className="w-4 h-4" />, color: 'bg-green-500/20 text-green-300', hasOptions: false },
  { value: '3', label: t('settings.typeDate'), description: t('settings.typeDateDesc'), icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-600/20 text-blue-800', hasOptions: false },
  { value: '4', label: t('settings.typeSelect'), description: t('settings.typeSelectDesc'), icon: <List className="w-4 h-4" />, color: 'bg-orange-500/20 text-orange-300', hasOptions: true },
  { value: '5', label: t('settings.typeEmail'), description: t('settings.typeEmailDesc'), icon: <Mail className="w-4 h-4" />, color: 'bg-cyan-500/20 text-cyan-300', hasOptions: false },
  { value: '6', label: t('settings.typeLongText'), description: t('settings.typeLongTextDesc'), icon: <AlignLeft className="w-4 h-4" />, color: 'bg-sky-500/20 text-sky-300', hasOptions: false },
];

// ─── Options manager ──────────────────────────────────────────────────────────

const OptionsManager: React.FC<{ options: string[]; onChange: (options: string[]) => void }> = ({ options, onChange }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onChange([...options, trimmed]);
    setInput('');
  };

  const remove = (index: number) => onChange(options.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={t('settings.addOptionPlaceholder')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className="glass bg-gray-50 border-gray-200 focus:border-blue-400"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="border-gray-200 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-gray-200 bg-gray-50 min-h-[36px]">
          {options.map((opt, i) => (
            <span key={i} className="flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2.5 py-1">
              {opt}
              <button type="button" onClick={() => remove(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500">{t('settings.optionsHint')}</p>
    </div>
  );
};

// ─── Type selector ────────────────────────────────────────────────────────────

const TypeSelector: React.FC<{ value: TagType; onChange: (type: TagType) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const tagTypes = useMemo(() => makeTagTypes(t), [t]);

  return (
    <div className="grid grid-cols-2 gap-2">
      {tagTypes.map(tg => (
        <button
          key={tg.value}
          type="button"
          onClick={() => onChange(tg.value)}
          className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition-all ${
            value === tg.value ? 'border-blue-500 bg-blue-500/10' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
          }`}
        >
          <span className={`mt-0.5 rounded p-1 ${tg.color}`}>{tg.icon}</span>
          <div>
            <p className="text-sm font-medium leading-none">{tg.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{tg.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

// ─── Tag form fields ──────────────────────────────────────────────────────────

const TagFormFields: React.FC<{
  data: CreateTagData;
  contexts: Context[];
  onChange: (patch: Partial<CreateTagData>) => void;
  isEdit?: boolean;
}> = ({ data, contexts, onChange }) => {
  const { t } = useTranslation();
  const tagTypes = useMemo(() => makeTagTypes(t), [t]);
  const cfg = tagTypes.find(tg => tg.value === data.type) ?? tagTypes[0];

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('settings.contextLabel')}</Label>
        <Select value={data.contextId} onValueChange={value => onChange({ contextId: value })}>
          <SelectTrigger className="glass bg-gray-50 border-gray-200">
            <SelectValue placeholder={t('settings.selectContext')} />
          </SelectTrigger>
          <SelectContent className="glass-strong border-gray-200">
            {contexts.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t('settings.tagName')}</Label>
        <Input
          placeholder={t('settings.tagNamePlaceholder')}
          value={data.name}
          onChange={e => onChange({ name: e.target.value })}
          className="glass bg-gray-50 border-gray-200"
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('settings.tagNameHint')} <code className="text-blue-800">#TAG_NAME#</code> {t('settings.tagNameInTemplates')}
        </p>
      </div>

      <div>
        <Label>{t('settings.fieldType')}</Label>
        <TypeSelector value={data.type} onChange={type => onChange({ type, options: [] })} />
      </div>

      {cfg.hasOptions && (
        <div>
          <Label>{t('settings.optionsLabel')} <span className="text-red-400">*</span></Label>
          <OptionsManager options={data.options ?? []} onChange={options => onChange({ options })} />
        </div>
      )}

      <div>
        <Label>{t('documents.description')}</Label>
        <Textarea
          placeholder={t('documents.descriptionPlaceholder')}
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          className="glass bg-gray-50 border-gray-200"
          rows={2}
        />
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const emptyTagData = (): CreateTagData => ({ name: '', type: '1', description: '', contextId: '', options: [] });

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';
  const isOwner = user?.role === 'owner';
  const tagTypes = useMemo(() => makeTagTypes(t), [t]);
  const getTypeConfig = (type: string) => tagTypes.find(tg => tg.value === type) ?? tagTypes[0];

  const [tags, setTags] = useState<Tag[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showNewTagModal, setShowNewTagModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const [showNewContextModal, setShowNewContextModal] = useState(false);
  const [showEditContextModal, setShowEditContextModal] = useState(false);
  const [editingContext, setEditingContext] = useState<Context | null>(null);

  const [tagFormData, setTagFormData] = useState<CreateTagData>(emptyTagData());
  const [contextFormData, setContextFormData] = useState<CreateContextData>({ name: '', description: '' });

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tagsData, contextsData] = await Promise.all([api.getTags(), api.getContexts()]);
      setTags(tagsData);
      setContexts(contextsData);
    } catch {
      toast({ title: t('settings.errorLoadingData'), description: t('settings.errorLoadingDataDesc'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!tagFormData.name.trim() || !tagFormData.contextId) return;
    const cfg = getTypeConfig(tagFormData.type);
    if (cfg.hasOptions && (!tagFormData.options || tagFormData.options.length === 0)) {
      toast({ title: t('settings.optionsRequired'), description: t('settings.optionsRequiredDesc'), variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      await api.createTag({ ...tagFormData, name: tagFormData.name.toUpperCase().replace(/\s+/g, '_') });
      setTags(await api.getTags());
      setTagFormData(emptyTagData());
      setShowNewTagModal(false);
      toast({ title: t('settings.tagCreated') });
    } catch {
      toast({ title: t('common.error'), description: t('settings.errorCreatingTag'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagFormData({ name: tag.name, type: tag.type, description: tag.description, contextId: tag.contextId, options: tag.options ?? [] });
    setShowEditTagModal(true);
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;
    try {
      setSaving(true);
      await api.updateTag(editingTag.id, tagFormData);
      setTags(await api.getTags());
      setEditingTag(null);
      setShowEditTagModal(false);
      toast({ title: t('settings.tagUpdated') });
    } catch {
      toast({ title: t('common.error'), description: t('settings.errorUpdatingTag'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await api.deleteTag(tagId);
      setTags(prev => prev.filter(tg => tg.id !== tagId));
      toast({ title: t('settings.tagDeleted') });
    } catch {
      toast({ title: t('common.error'), description: t('settings.errorDeletingTag'), variant: 'destructive' });
    }
  };

  const handleCreateContext = async () => {
    if (!contextFormData.name.trim()) return;
    try {
      setSaving(true);
      await api.createContext(contextFormData);
      setContexts(await api.getContexts());
      setContextFormData({ name: '', description: '' });
      setShowNewContextModal(false);
      toast({ title: t('settings.contextCreated') });
    } catch {
      toast({ title: t('common.error'), description: t('settings.errorCreatingContext'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditContext = (context: Context) => {
    setEditingContext(context);
    setContextFormData({ name: context.name, description: context.description ?? '' });
    setShowEditContextModal(true);
  };

  const handleUpdateContext = async () => {
    if (!editingContext) return;
    try {
      setSaving(true);
      const updated = await api.updateContext(editingContext.id, contextFormData);
      setContexts(prev => prev.map(c => c.id === editingContext.id ? updated : c));
      setEditingContext(null);
      setShowEditContextModal(false);
      toast({ title: t('settings.contextUpdated') });
    } catch {
      toast({ title: t('common.error'), description: t('settings.errorUpdatingContext'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContext = async (contextId: string) => {
    try {
      await api.deleteContext(contextId);
      setContexts(prev => prev.filter(c => c.id !== contextId));
      setTags(prev => prev.filter(tg => tg.contextId !== contextId));
      toast({ title: t('settings.contextDeleted') });
    } catch {
      toast({ title: t('common.error'), description: t('settings.errorDeletingContext'), variant: 'destructive' });
    }
  };

  const tagsByContext: Record<string, Tag[]> = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    const key = tag.context?.name ?? t('settings.noContext');
    if (!acc[key]) acc[key] = [];
    acc[key].push(tag);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-700">{t('settings.loadingSettings')}</p>
        </div>
      </div>
    );
  }

  const ModalFooter = ({ onCancel, onConfirm, confirmLabel, disabled }: {
    onCancel: () => void; onConfirm: () => void; confirmLabel: string; disabled?: boolean;
  }) => (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="outline" onClick={onCancel} disabled={saving} className="border-gray-200">{t('common.cancel')}</Button>
      <Button onClick={onConfirm} disabled={disabled || saving} className="bg-blue-900 hover:bg-blue-800 text-white">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('common.saving')}</> : confirmLabel}
      </Button>
    </div>
  );

  const isTagFormValid = (d: CreateTagData) => {
    if (!d.name.trim() || !d.contextId || !d.description.trim()) return false;
    if (getTypeConfig(d.type).hasOptions && (!d.options || d.options.length === 0)) return false;
    return true;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">{t('settings.title')}</h1>
        <p className="text-gray-700 mt-2">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="tags" className="w-full">
        <TabsList className={`grid w-full glass-card border-gray-200 ${isOwner ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="tags" className="data-[state=active]:bg-gray-200">
            <TagIcon className="w-4 h-4 mr-2" />
            {t('settings.manageTags')}
          </TabsTrigger>
          <TabsTrigger value="contexts" className="data-[state=active]:bg-gray-200">
            <FolderOpen className="w-4 h-4 mr-2" />
            {t('settings.manageContexts')}
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="global" className="data-[state=active]:bg-gray-200">
              <Settings className="w-4 h-4 mr-2" />
              Global Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tags tab */}
        <TabsContent value="tags" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-700">{t('settings.dynamicTags')}</h2>
              <p className="text-gray-500">{t('settings.dynamicTagsDesc')}</p>
            </div>

            {isAdminOrOwner && <Dialog open={showNewTagModal} onOpenChange={open => { setShowNewTagModal(open); if (!open) setTagFormData(emptyTagData()); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('settings.newTag')}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-gray-200 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('settings.createTagTitle')}</DialogTitle>
                  <DialogDescription>{t('settings.createTagDesc')}</DialogDescription>
                </DialogHeader>
                <TagFormFields data={tagFormData} contexts={contexts} onChange={patch => setTagFormData(prev => ({ ...prev, ...patch }))} />
                <ModalFooter
                  onCancel={() => { setShowNewTagModal(false); setTagFormData(emptyTagData()); }}
                  onConfirm={handleCreateTag}
                  confirmLabel={t('settings.createTag')}
                  disabled={!isTagFormValid(tagFormData)}
                />
              </DialogContent>
            </Dialog>}
          </div>

          {tags.length === 0 ? (
            <Card className="glass-card border-gray-200 text-center py-12">
              <CardHeader>
                <TagIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                <CardTitle>{t('settings.noTags')}</CardTitle>
                <CardDescription>{t('settings.noTagsDesc')}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(tagsByContext).map(([contextName, contextTags]) => (
                <div key={contextName} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">{contextName}</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {contextTags.map(tag => {
                      const cfg = getTypeConfig(tag.type);
                      return (
                        <Card key={tag.id} className="glass-card border-gray-200">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <Badge className={`${cfg.color} border-0 flex items-center gap-1`}>
                                {cfg.icon}
                                {cfg.label}
                              </Badge>
                              {isAdminOrOwner && <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEditTag(tag)} className="h-6 w-6 p-0">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="glass-strong border-gray-200">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('settings.deleteTag')}</AlertDialogTitle>
                                      <AlertDialogDescription>{t('settings.deleteTagDesc', { name: tag.name })}</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-gray-200">{t('common.cancel')}</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteTag(tag.id)} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>}
                            </div>
                            <CardTitle className="text-sm font-mono">#{tag.name}#</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-xs text-gray-700 mb-2">{tag.description}</p>
                            {tag.options && tag.options.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tag.options.slice(0, 3).map((opt, i) => (
                                  <Badge key={i} variant="outline" className="text-xs border-gray-200">{opt}</Badge>
                                ))}
                                {tag.options.length > 3 && (
                                  <Badge variant="outline" className="text-xs border-gray-200">+{tag.options.length - 3}</Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={showEditTagModal} onOpenChange={open => { setShowEditTagModal(open); if (!open) setEditingTag(null); }}>
            <DialogContent className="glass-strong border-gray-200 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('settings.editTag')}</DialogTitle>
                <DialogDescription>{t('settings.editTagDesc', { name: editingTag?.name ?? '' })}</DialogDescription>
              </DialogHeader>
              <TagFormFields data={tagFormData} contexts={contexts} onChange={patch => setTagFormData(prev => ({ ...prev, ...patch }))} isEdit />
              <ModalFooter
                onCancel={() => { setShowEditTagModal(false); setEditingTag(null); }}
                onConfirm={handleUpdateTag}
                confirmLabel={t('common.save')}
                disabled={!isTagFormValid(tagFormData)}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Contexts tab */}
        <TabsContent value="contexts" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-700">{t('settings.contexts')}</h2>
              <p className="text-gray-500">{t('settings.contextsDesc')}</p>
            </div>

            {isAdminOrOwner && <Dialog open={showNewContextModal} onOpenChange={open => { setShowNewContextModal(open); if (!open) setContextFormData({ name: '', description: '' }); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('settings.newContext')}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-gray-200">
                <DialogHeader>
                  <DialogTitle>{t('settings.createContextTitle')}</DialogTitle>
                  <DialogDescription>{t('settings.createContextDesc')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t('settings.contextName')}</Label>
                    <Input placeholder={t('settings.contextNamePlaceholder')} value={contextFormData.name} onChange={e => setContextFormData(p => ({ ...p, name: e.target.value }))} className="glass bg-gray-50 border-gray-200" />
                  </div>
                  <div>
                    <Label>{t('documents.description')}</Label>
                    <Textarea placeholder={t('settings.contextDescPlaceholder')} value={contextFormData.description} onChange={e => setContextFormData(p => ({ ...p, description: e.target.value }))} className="glass bg-gray-50 border-gray-200" rows={2} />
                  </div>
                </div>
                <ModalFooter
                  onCancel={() => { setShowNewContextModal(false); setContextFormData({ name: '', description: '' }); }}
                  onConfirm={handleCreateContext}
                  confirmLabel={t('settings.createContext')}
                  disabled={!contextFormData.name.trim()}
                />
              </DialogContent>
            </Dialog>}
          </div>

          {contexts.length === 0 ? (
            <Card className="glass-card border-gray-200 text-center py-12">
              <CardHeader>
                <Folder className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                <CardTitle>{t('settings.noContexts')}</CardTitle>
                <CardDescription>{t('settings.noContextsDesc')}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contexts.map(context => {
                const count = tags.filter(tg => tg.contextId === context.id).length;
                return (
                  <Card key={context.id} className="glass-card border-gray-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-blue-700" />
                          <CardTitle className="text-lg">{context.name}</CardTitle>
                        </div>
                        {isAdminOrOwner && <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditContext(context)} className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-strong border-gray-200">
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('settings.deleteContext')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('settings.deleteContextDesc', { name: context.name })}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-200">{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteContext(context.id)} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>}
                      </div>
                      <CardDescription className="text-gray-700">{context.description || t('common.noDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="border-gray-200">{t(`settings.tagCount_${count === 1 ? 'one' : 'other'}`, { count })}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Dialog open={showEditContextModal} onOpenChange={open => { setShowEditContextModal(open); if (!open) setEditingContext(null); }}>
            <DialogContent className="glass-strong border-gray-200">
              <DialogHeader>
                <DialogTitle>{t('settings.editContext')}</DialogTitle>
                <DialogDescription>{t('settings.editContextDesc', { name: editingContext?.name ?? '' })}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('settings.contextName')}</Label>
                  <Input value={contextFormData.name} onChange={e => setContextFormData(p => ({ ...p, name: e.target.value }))} className="glass bg-gray-50 border-gray-200" />
                </div>
                <div>
                  <Label>{t('documents.description')}</Label>
                  <Textarea value={contextFormData.description} onChange={e => setContextFormData(p => ({ ...p, description: e.target.value }))} className="glass bg-gray-50 border-gray-200" rows={2} />
                </div>
              </div>
              <ModalFooter
                onCancel={() => { setShowEditContextModal(false); setEditingContext(null); }}
                onConfirm={handleUpdateContext}
                confirmLabel={t('common.save')}
                disabled={!contextFormData.name.trim()}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Global Settings Tab (owner only) */}
        {isOwner && (
          <TabsContent value="global" className="space-y-8">
            <GlobalSettingsTab />
          </TabsContent>
        )}
      </Tabs>
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

  const [showPkgDialog, setShowPkgDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageType | null>(null);
  const [pkgForm, setPkgForm] = useState(emptyPkgForm());
  const [pkgSaving, setPkgSaving] = useState(false);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [pkgs, requests] = await Promise.all([
        api.getAdminPackages(),
        api.getUpgradeRequests(),
      ]);
      setPackages(pkgs);
      setUpgradeRequests(requests);
    } catch {
      toast({ title: 'Failed to load global settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
