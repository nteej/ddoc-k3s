import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Tag as TagIcon, Edit, Trash2, Loader2, FolderOpen, Folder,
  Type, Hash, Calendar, List, Mail, AlignLeft, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Tag, TagType, Context, CreateTagData, CreateContextData } from '@/types';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
        <TabsList className="grid w-full grid-cols-2 glass-card border-gray-200">
          <TabsTrigger value="tags" className="data-[state=active]:bg-gray-200">
            <TagIcon className="w-4 h-4 mr-2" />
            {t('settings.manageTags')}
          </TabsTrigger>
          <TabsTrigger value="contexts" className="data-[state=active]:bg-gray-200">
            <FolderOpen className="w-4 h-4 mr-2" />
            {t('settings.manageContexts')}
          </TabsTrigger>
        </TabsList>

        {/* Tags tab */}
        <TabsContent value="tags" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-700">{t('settings.dynamicTags')}</h2>
              <p className="text-gray-500">{t('settings.dynamicTagsDesc')}</p>
            </div>

            <Dialog open={showNewTagModal} onOpenChange={open => { setShowNewTagModal(open); if (!open) setTagFormData(emptyTagData()); }}>
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
            </Dialog>
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
                              <div className="flex gap-1">
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
                              </div>
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

            <Dialog open={showNewContextModal} onOpenChange={open => { setShowNewContextModal(open); if (!open) setContextFormData({ name: '', description: '' }); }}>
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
            </Dialog>
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
                        <div className="flex gap-1">
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
                        </div>
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
      </Tabs>
    </div>
  );
};

export default SettingsPage;
