import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Loader2, Plus, Trash2, Zap, CheckCircle, ArrowRight, Eye,
  Tag as TagIcon, FolderOpen, Folder, Edit, X, Type, Hash, Calendar, List, Mail, AlignLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { Tag, TagType, Context, CreateTagData, CreateContextData, Section } from '@/types';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentRecord {
  name: string;
  payload: Record<string, string>;
}

const emptyRecord = (): DocumentRecord => ({ name: '', payload: {} });

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
  { value: '2', label: t('settings.typeNumber'), description: t('settings.typeNumberDesc'), icon: <Hash className="w-4 h-4" />, color: 'bg-green-500/20 text-green-700', hasOptions: false },
  { value: '3', label: t('settings.typeDate'), description: t('settings.typeDateDesc'), icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-600/20 text-blue-800', hasOptions: false },
  { value: '4', label: t('settings.typeSelect'), description: t('settings.typeSelectDesc'), icon: <List className="w-4 h-4" />, color: 'bg-orange-500/20 text-orange-700', hasOptions: true },
  { value: '5', label: t('settings.typeEmail'), description: t('settings.typeEmailDesc'), icon: <Mail className="w-4 h-4" />, color: 'bg-cyan-500/20 text-cyan-700', hasOptions: false },
  { value: '6', label: t('settings.typeLongText'), description: t('settings.typeLongTextDesc'), icon: <AlignLeft className="w-4 h-4" />, color: 'bg-sky-500/20 text-sky-700', hasOptions: false },
];

// ─── OptionsManager ───────────────────────────────────────────────────────────

const OptionsManager: React.FC<{ options: string[]; onChange: (opts: string[]) => void }> = ({ options, onChange }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v || options.includes(v)) return;
    onChange([...options, v]);
    setInput('');
  };

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
              <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400">
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

// ─── TypeSelector ─────────────────────────────────────────────────────────────

const TypeSelector: React.FC<{ value: TagType; onChange: (t: TagType) => void }> = ({ value, onChange }) => {
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

// ─── TagFormFields ────────────────────────────────────────────────────────────

const TagFormFields: React.FC<{ data: CreateTagData; contexts: Context[]; onChange: (p: Partial<CreateTagData>) => void }> = ({ data, contexts, onChange }) => {
  const { t } = useTranslation();
  const tagTypes = useMemo(() => makeTagTypes(t), [t]);
  const cfg = tagTypes.find(tg => tg.value === data.type) ?? tagTypes[0];
  return (
    <div className="space-y-4">
      <div>
        <Label>{t('settings.contextLabel')}</Label>
        <Select value={data.contextId} onValueChange={v => onChange({ contextId: v })}>
          <SelectTrigger className="glass bg-gray-50 border-gray-200"><SelectValue placeholder={t('settings.selectContext')} /></SelectTrigger>
          <SelectContent className="glass-strong border-gray-200">
            {contexts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>{t('settings.tagName')}</Label>
        <Input placeholder={t('settings.tagNamePlaceholder')} value={data.name} onChange={e => onChange({ name: e.target.value })} className="glass bg-gray-50 border-gray-200" />
        <p className="text-xs text-gray-500 mt-1">{t('settings.tagNameHint')} <code className="text-blue-800">#TAG_NAME#</code> {t('settings.tagNameInTemplates')}</p>
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
        <Textarea placeholder={t('documents.descriptionPlaceholder')} value={data.description} onChange={e => onChange({ description: e.target.value })} className="glass bg-gray-50 border-gray-200" rows={2} />
      </div>
    </div>
  );
};

// ─── LivePreview ──────────────────────────────────────────────────────────────

const buildPreviewHtml = (sections: Section[], payload: Record<string, string>): string => {
  const body = [...sections]
    .sort((a, b) => a.sectionOrder - b.sectionOrder)
    .map(s => s.htmlContent)
    .join('\n');

  let rendered = body;
  for (const [key, val] of Object.entries(payload)) {
    if (val) rendered = rendered.split(`#${key}#`).join(val);
  }
  rendered = rendered.replace(
    /#([A-Z0-9_]+)#/g,
    '<mark style="background:#fef3c7;color:#92400e;border-radius:3px;padding:0 3px;font-size:0.85em">$&</mark>',
  );
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
body{font-family:Arial,Helvetica,sans-serif;margin:32px;font-size:13px;line-height:1.6;color:#111;background:#fff}
*{box-sizing:border-box}table{border-collapse:collapse;width:100%}td,th{padding:6px 8px}
</style></head><body>${rendered}</body></html>`;
};

const LivePreview: React.FC<{ sections: Section[]; record: DocumentRecord; loading?: boolean }> = ({ sections, record, loading }) => {
  const srcDoc = useMemo(() => buildPreviewHtml(sections, record.payload), [sections, record.payload]);
  return (
    <div className="relative w-full h-full bg-white rounded-lg overflow-hidden border border-gray-100">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      {!loading && sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
          <Eye className="w-10 h-10 opacity-30" />
          <p className="text-sm">Preview will appear here</p>
        </div>
      ) : (
        <iframe srcDoc={srcDoc} className="w-full h-full border-0" title="PDF Preview" sandbox="allow-same-origin" />
      )}
    </div>
  );
};

// ─── FieldsTab ────────────────────────────────────────────────────────────────

const emptyTagData = (): CreateTagData => ({ name: '', type: '1', description: '', contextId: '', options: [] });

interface FieldsTabProps {
  tags: Tag[];
  contexts: Context[];
  isAdminOrOwner: boolean;
  onInvalidateTags: () => void;
  onInvalidateContexts: () => void;
}

const FieldsTab: React.FC<FieldsTabProps> = ({ tags, contexts, isAdminOrOwner, onInvalidateTags, onInvalidateContexts }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const tagTypes = useMemo(() => makeTagTypes(t), [t]);
  const getTypeConfig = (type: string) => tagTypes.find(tg => tg.value === type) ?? tagTypes[0];
  const [saving, setSaving] = useState(false);

  const [showNewTag, setShowNewTag] = useState(false);
  const [showEditTag, setShowEditTag] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagForm, setTagForm] = useState<CreateTagData>(emptyTagData());

  const [showNewCtx, setShowNewCtx] = useState(false);
  const [showEditCtx, setShowEditCtx] = useState(false);
  const [editingCtx, setEditingCtx] = useState<Context | null>(null);
  const [ctxForm, setCtxForm] = useState<CreateContextData>({ name: '', description: '' });

  const isTagFormValid = (d: CreateTagData) => {
    if (!d.name.trim() || !d.contextId || !d.description.trim()) return false;
    if (getTypeConfig(d.type).hasOptions && (!d.options || d.options.length === 0)) return false;
    return true;
  };

  const SaveFooter = ({ onCancel, onConfirm, label, disabled }: { onCancel: () => void; onConfirm: () => void; label: string; disabled?: boolean }) => (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="outline" onClick={onCancel} disabled={saving} className="border-gray-200">{t('common.cancel')}</Button>
      <Button onClick={onConfirm} disabled={disabled || saving} className="bg-blue-900 hover:bg-blue-800 text-white">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.saving')}</> : label}
      </Button>
    </div>
  );

  const handleCreateTag = async () => {
    if (!tagForm.name.trim() || !tagForm.contextId) return;
    const cfg = getTypeConfig(tagForm.type);
    if (cfg.hasOptions && (!tagForm.options || tagForm.options.length === 0)) {
      toast({ title: t('settings.optionsRequired'), description: t('settings.optionsRequiredDesc'), variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      await api.createTag({ ...tagForm, name: tagForm.name.toUpperCase().replace(/\s+/g, '_') });
      onInvalidateTags();
      setTagForm(emptyTagData());
      setShowNewTag(false);
      toast({ title: t('settings.tagCreated') });
    } catch { toast({ title: t('common.error'), description: t('settings.errorCreatingTag'), variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;
    try {
      setSaving(true);
      await api.updateTag(editingTag.id, tagForm);
      onInvalidateTags();
      setShowEditTag(false);
      setEditingTag(null);
      toast({ title: t('settings.tagUpdated') });
    } catch { toast({ title: t('common.error'), description: t('settings.errorUpdatingTag'), variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await api.deleteTag(id);
      onInvalidateTags();
      toast({ title: t('settings.tagDeleted') });
    } catch { toast({ title: t('common.error'), description: t('settings.errorDeletingTag'), variant: 'destructive' }); }
  };

  const handleCreateCtx = async () => {
    if (!ctxForm.name.trim()) return;
    try {
      setSaving(true);
      await api.createContext(ctxForm);
      onInvalidateContexts();
      setCtxForm({ name: '', description: '' });
      setShowNewCtx(false);
      toast({ title: t('settings.contextCreated') });
    } catch { toast({ title: t('common.error'), description: t('settings.errorCreatingContext'), variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleUpdateCtx = async () => {
    if (!editingCtx) return;
    try {
      setSaving(true);
      await api.updateContext(editingCtx.id, ctxForm);
      onInvalidateContexts();
      setShowEditCtx(false);
      setEditingCtx(null);
      toast({ title: t('settings.contextUpdated') });
    } catch { toast({ title: t('common.error'), description: t('settings.errorUpdatingContext'), variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDeleteCtx = async (id: string) => {
    try {
      await api.deleteContext(id);
      onInvalidateContexts();
      onInvalidateTags();
      toast({ title: t('settings.contextDeleted') });
    } catch { toast({ title: t('common.error'), description: t('settings.errorDeletingContext'), variant: 'destructive' }); }
  };

  const tagsByContext = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    const key = tag.context?.name ?? t('settings.noContext');
    if (!acc[key]) acc[key] = [];
    acc[key].push(tag);
    return acc;
  }, {});

  return (
    <div className="space-y-10">

      {/* ── Tags ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-700">{t('settings.dynamicTags')}</h2>
            <p className="text-gray-500 text-sm">{t('settings.dynamicTagsDesc')}</p>
          </div>
          {isAdminOrOwner && (
            <Dialog open={showNewTag} onOpenChange={o => { setShowNewTag(o); if (!o) setTagForm(emptyTagData()); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white"><Plus className="w-4 h-4 mr-2" />{t('settings.newTag')}</Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-gray-200 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('settings.createTagTitle')}</DialogTitle>
                  <DialogDescription>{t('settings.createTagDesc')}</DialogDescription>
                </DialogHeader>
                <TagFormFields data={tagForm} contexts={contexts} onChange={p => setTagForm(prev => ({ ...prev, ...p }))} />
                <SaveFooter onCancel={() => { setShowNewTag(false); setTagForm(emptyTagData()); }} onConfirm={handleCreateTag} label={t('settings.createTag')} disabled={!isTagFormValid(tagForm)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {tags.length === 0 ? (
          <Card className="glass-card border-gray-200 text-center py-10">
            <CardHeader>
              <TagIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <CardTitle className="text-base">{t('settings.noTags')}</CardTitle>
              <CardDescription>{t('settings.noTagsDesc')}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-5">
            {Object.entries(tagsByContext).map(([ctxName, ctxTags]) => (
              <div key={ctxName}>
                <h3 className="text-sm font-semibold text-gray-600 border-b border-gray-200 pb-1 mb-3">{ctxName}</h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {ctxTags.map(tag => {
                    const cfg = getTypeConfig(tag.type);
                    return (
                      <Card key={tag.id} className="glass-card border-gray-200">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge className={`${cfg.color} border-0 flex items-center gap-1 text-xs`}>{cfg.icon}{cfg.label}</Badge>
                            {isAdminOrOwner && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingTag(tag); setTagForm({ name: tag.name, type: tag.type, description: tag.description, contextId: tag.contextId, options: tag.options ?? [] }); setShowEditTag(true); }} className="h-6 w-6 p-0"><Edit className="w-3 h-3" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></Button>
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
                            )}
                          </div>
                          <CardTitle className="text-sm font-mono">#{tag.name}#</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-gray-500">{tag.description}</p>
                          {tag.options && tag.options.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tag.options.slice(0, 3).map((o, i) => <Badge key={i} variant="outline" className="text-xs border-gray-200">{o}</Badge>)}
                              {tag.options.length > 3 && <Badge variant="outline" className="text-xs border-gray-200">+{tag.options.length - 3}</Badge>}
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

        <Dialog open={showEditTag} onOpenChange={o => { setShowEditTag(o); if (!o) setEditingTag(null); }}>
          <DialogContent className="glass-strong border-gray-200 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('settings.editTag')}</DialogTitle>
              <DialogDescription>{t('settings.editTagDesc', { name: editingTag?.name ?? '' })}</DialogDescription>
            </DialogHeader>
            <TagFormFields data={tagForm} contexts={contexts} onChange={p => setTagForm(prev => ({ ...prev, ...p }))} />
            <SaveFooter onCancel={() => { setShowEditTag(false); setEditingTag(null); }} onConfirm={handleUpdateTag} label={t('common.save')} disabled={!isTagFormValid(tagForm)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Contexts ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-700">{t('settings.contexts')}</h2>
            <p className="text-gray-500 text-sm">{t('settings.contextsDesc')}</p>
          </div>
          {isAdminOrOwner && (
            <Dialog open={showNewCtx} onOpenChange={o => { setShowNewCtx(o); if (!o) setCtxForm({ name: '', description: '' }); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white"><Plus className="w-4 h-4 mr-2" />{t('settings.newContext')}</Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-gray-200">
                <DialogHeader>
                  <DialogTitle>{t('settings.createContextTitle')}</DialogTitle>
                  <DialogDescription>{t('settings.createContextDesc')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label>{t('settings.contextName')}</Label><Input placeholder={t('settings.contextNamePlaceholder')} value={ctxForm.name} onChange={e => setCtxForm(p => ({ ...p, name: e.target.value }))} className="glass bg-gray-50 border-gray-200" /></div>
                  <div><Label>{t('documents.description')}</Label><Textarea placeholder={t('settings.contextDescPlaceholder')} value={ctxForm.description} onChange={e => setCtxForm(p => ({ ...p, description: e.target.value }))} className="glass bg-gray-50 border-gray-200" rows={2} /></div>
                </div>
                <SaveFooter onCancel={() => { setShowNewCtx(false); setCtxForm({ name: '', description: '' }); }} onConfirm={handleCreateCtx} label={t('settings.createContext')} disabled={!ctxForm.name.trim()} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {contexts.length === 0 ? (
          <Card className="glass-card border-gray-200 text-center py-10">
            <CardHeader>
              <Folder className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <CardTitle className="text-base">{t('settings.noContexts')}</CardTitle>
              <CardDescription>{t('settings.noContextsDesc')}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contexts.map(ctx => {
              const count = tags.filter(tg => tg.contextId === ctx.id).length;
              return (
                <Card key={ctx.id} className="glass-card border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-blue-700" />
                        <CardTitle className="text-base">{ctx.name}</CardTitle>
                      </div>
                      {isAdminOrOwner && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingCtx(ctx); setCtxForm({ name: ctx.name, description: ctx.description ?? '' }); setShowEditCtx(true); }} className="h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-strong border-gray-200">
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('settings.deleteContext')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('settings.deleteContextDesc', { name: ctx.name })}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-200">{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCtx(ctx.id)} className="bg-red-600 hover:bg-red-700">{t('common.delete')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                    <CardDescription>{ctx.description || t('common.noDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className="border-gray-200">{t(`settings.tagCount_${count === 1 ? 'one' : 'other'}`, { count })}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={showEditCtx} onOpenChange={o => { setShowEditCtx(o); if (!o) setEditingCtx(null); }}>
          <DialogContent className="glass-strong border-gray-200">
            <DialogHeader>
              <DialogTitle>{t('settings.editContext')}</DialogTitle>
              <DialogDescription>{t('settings.editContextDesc', { name: editingCtx?.name ?? '' })}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('settings.contextName')}</Label><Input value={ctxForm.name} onChange={e => setCtxForm(p => ({ ...p, name: e.target.value }))} className="glass bg-gray-50 border-gray-200" /></div>
              <div><Label>{t('documents.description')}</Label><Textarea value={ctxForm.description} onChange={e => setCtxForm(p => ({ ...p, description: e.target.value }))} className="glass bg-gray-50 border-gray-200" rows={2} /></div>
            </div>
            <SaveFooter onCancel={() => { setShowEditCtx(false); setEditingCtx(null); }} onConfirm={handleUpdateCtx} label={t('common.save')} disabled={!ctxForm.name.trim()} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// ─── GeneratePage ─────────────────────────────────────────────────────────────

const GeneratePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [records, setRecords] = useState<DocumentRecord[]>([emptyRecord()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [previewIdx, setPreviewIdx] = useState(0);

  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates-list'],
    queryFn: () => api.getTemplates(1, 100),
  });

  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.getTags(),
    enabled: !!user,
  });

  const { data: contexts = [] } = useQuery({
    queryKey: ['contexts'],
    queryFn: () => api.getContexts(),
    enabled: !!user,
  });

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['sections', selectedTemplateId],
    queryFn: () => api.getSections(selectedTemplateId),
    enabled: !!selectedTemplateId,
    staleTime: 5 * 60 * 1000,
  });

  const templates = templatesData?.templates ?? [];
  const selectedTemplate = templates.find(tpl => tpl.id === selectedTemplateId);
  const safePreviewIdx = Math.min(previewIdx, Math.max(0, records.length - 1));

  const handleNameChange = (idx: number, value: string) =>
    setRecords(prev => prev.map((r, i) => i === idx ? { ...r, name: value } : r));

  const handleFieldChange = (idx: number, tagName: string, value: string) =>
    setRecords(prev => prev.map((r, i) => i === idx ? { ...r, payload: { ...r.payload, [tagName]: value } } : r));

  const addRecord = () => {
    setRecords(prev => [...prev, emptyRecord()]);
    setPreviewIdx(records.length);
  };

  const removeRecord = (index: number) => {
    setRecords(prev => prev.filter((_, i) => i !== index));
    setPreviewIdx(prev => Math.min(prev, records.length - 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      toast({ title: t('generate.selectTemplateFirst'), description: t('generate.selectTemplateFirstDesc'), variant: 'destructive' });
      return;
    }
    const missing = records.findIndex(r => !r.name.trim());
    if (missing !== -1) {
      toast({ title: t('generate.documentNameRequired'), description: t('generate.documentNameRequiredDesc', { num: missing + 1 }), variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    let succeeded = 0;
    for (const record of records) {
      const payload: Record<string, string> = {};
      Object.entries(record.payload).forEach(([key, value]) => { payload[`#${key}#`] = value; });
      try {
        await api.asyncGenerate(selectedTemplateId, record.name.trim(), payload);
        succeeded++;
      } catch (error) {
        toast({ title: t('generate.failed', { name: record.name }), description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
      }
    }
    setIsSubmitting(false);
    if (succeeded > 0) setGeneratedCount(succeeded);
  };

  const handleReset = () => {
    setGeneratedCount(0);
    setRecords([emptyRecord()]);
    setSelectedTemplateId('');
    setPreviewIdx(0);
  };

  const renderTagInput = (tag: Tag, recordIndex: number) => {
    const value = records[recordIndex]?.payload?.[tag.name] ?? '';
    const onChange = (val: string) => handleFieldChange(recordIndex, tag.name, val);
    const placeholder = tag.description || `${tag.name}...`;
    const baseClass = 'glass bg-gray-50 border-gray-200 focus:border-blue-400';

    if (tag.type === '2') return <Input type="number" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={baseClass} />;
    if (tag.type === '3') return <Input type="date" value={value} onChange={e => onChange(e.target.value)} className={baseClass} />;
    if (tag.type === '4' && tag.options?.length) {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={`${baseClass} focus:ring-0`}><SelectValue placeholder={`${tag.name}...`} /></SelectTrigger>
          <SelectContent className="glass-strong border-gray-200">
            {tag.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (tag.type === '5') return <Input type="email" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={baseClass} />;
    if (tag.type === '6') return <textarea placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} rows={3} className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${baseClass} bg-gray-50`} />;
    return <Input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={baseClass} />;
  };

  if (generatedCount > 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass-card border-gray-200 max-w-md w-full text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <CardTitle className="text-2xl gradient-text">{t('generate.generationQueued')}</CardTitle>
            <CardDescription className="text-gray-700">
              {t(`generate.generationQueuedDesc_${generatedCount === 1 ? 'one' : 'other'}`, { count: generatedCount })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full bg-blue-900 text-white">
              <Link to="/files">{t('generate.viewGeneratedFiles')}<ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-full border-gray-200">{t('generate.generateMore')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center space-x-3">
        <Zap className="w-8 h-8 text-blue-700" />
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t('generate.title')}</h1>
          <p className="text-gray-700 mt-1">{t('generate.subtitle')}</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="glass-card border border-gray-200 grid grid-cols-2 w-fit">
          <TabsTrigger value="generate" className="data-[state=active]:bg-gray-200 px-6">
            <Zap className="w-4 h-4 mr-2" />Generate
          </TabsTrigger>
          <TabsTrigger value="fields" className="data-[state=active]:bg-gray-200 px-6">
            <TagIcon className="w-4 h-4 mr-2" />Fields
          </TabsTrigger>
        </TabsList>

        {/* ── Generate tab ──────────────────────────────────────────── */}
        <TabsContent value="generate" className="mt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template selector */}
            <Card className="glass-card border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <FileText className="w-5 h-5 text-blue-700" />
                  <span>{t('generate.selectTemplate')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /><span>{t('generate.loadingTemplates')}</span>
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {t('generate.noTemplates')}{' '}
                    <Link to="/documents" className="text-blue-700 hover:text-blue-800">{t('generate.createFirst')}</Link>
                  </p>
                ) : (
                  <Select
                    value={selectedTemplateId}
                    onValueChange={v => { setSelectedTemplateId(v); setRecords([emptyRecord()]); setPreviewIdx(0); }}
                  >
                    <SelectTrigger className="glass bg-gray-50 border-gray-200 focus:border-blue-400 max-w-sm">
                      <SelectValue placeholder={t('generate.chooseTemplate')} />
                    </SelectTrigger>
                    <SelectContent className="glass-strong border-gray-200">
                      {templates.map(tpl => <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Form + Preview two-column */}
            {selectedTemplateId && (
              loadingTags ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />{t('generate.loadingFields')}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                  {/* Left: records form */}
                  <div className="lg:col-span-2 space-y-4">
                    {records.map((record, ri) => (
                      <Card key={ri} className="glass-card border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base text-blue-800">
                              {records.length > 1 ? t('generate.documentNumber', { num: ri + 1 }) : t('generate.documentLabel')}
                            </CardTitle>
                            {records.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeRecord(ri)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-sm text-gray-700">
                                {t('generate.documentName')} <span className="text-red-400">*</span>
                                <span className="ml-1 text-gray-500 font-normal text-xs">— {t('generate.documentNameHint')}</span>
                              </Label>
                              <Input
                                type="text"
                                placeholder={t('generate.documentNamePlaceholder', { template: selectedTemplate?.name ?? 'Document', num: ri + 1 })}
                                value={record.name}
                                onChange={e => handleNameChange(ri, e.target.value)}
                                onFocus={() => setPreviewIdx(ri)}
                                className="glass bg-gray-50 border-gray-200 focus:border-blue-400"
                              />
                            </div>
                            {tags.length === 0 ? (
                              <p className="text-gray-500 text-sm">{t('generate.noTags')}</p>
                            ) : (
                              tags.map(tag => (
                                <div key={tag.id} className="space-y-1" onFocus={() => setPreviewIdx(ri)}>
                                  <Label className="text-sm text-gray-700">
                                    {tag.name}
                                    {tag.description && <span className="ml-1 text-gray-500 font-normal text-xs">— {tag.description}</span>}
                                  </Label>
                                  {renderTagInput(tag, ri)}
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button type="button" variant="outline" onClick={addRecord} className="w-full border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-700">
                      <Plus className="w-4 h-4 mr-2" />{t('generate.addAnotherDocument')}
                    </Button>

                    <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-900 hover:bg-blue-800 text-white transition-all duration-200">
                      {isSubmitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('generate.queuingGeneration')}</>
                        : <><Zap className="w-4 h-4 mr-2" />{records.length > 1 ? t('generate.generateMany', { count: records.length }) : t('generate.generateOne')}</>
                      }
                    </Button>
                  </div>

                  {/* Right: live preview */}
                  <div className="lg:col-span-3 lg:sticky lg:top-6">
                    <Card className="glass-card border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Eye className="w-4 h-4 text-blue-700" />
                            Live Preview
                            {selectedTemplate && (
                              <span className="text-xs font-normal text-gray-400">
                                — {selectedTemplate.paperFormat} {selectedTemplate.paperOrientation}
                              </span>
                            )}
                          </CardTitle>
                          {records.length > 1 && (
                            <Select value={String(safePreviewIdx)} onValueChange={v => setPreviewIdx(Number(v))}>
                              <SelectTrigger className="h-7 text-xs w-36 border-gray-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {records.map((r, i) => (
                                  <SelectItem key={i} value={String(i)}>{r.name || `Document ${i + 1}`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">Updates in real-time. Unfilled fields are highlighted in yellow.</p>
                      </CardHeader>
                      <CardContent className="p-2">
                        <div style={{ height: '560px' }}>
                          <LivePreview sections={sections} record={records[safePreviewIdx] ?? emptyRecord()} loading={loadingSections} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )
            )}
          </form>
        </TabsContent>

        {/* ── Fields tab ────────────────────────────────────────────── */}
        <TabsContent value="fields" className="mt-4">
          <FieldsTab
            tags={tags}
            contexts={contexts}
            isAdminOrOwner={isAdminOrOwner}
            onInvalidateTags={() => queryClient.invalidateQueries({ queryKey: ['tags'] })}
            onInvalidateContexts={() => {
              queryClient.invalidateQueries({ queryKey: ['contexts'] });
              queryClient.invalidateQueries({ queryKey: ['tags'] });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneratePage;
