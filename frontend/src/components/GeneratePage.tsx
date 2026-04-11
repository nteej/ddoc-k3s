import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, Plus, Trash2, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Tag } from '@/types';
import api from '@/services/api';

interface DocumentRecord {
  name: string;
  payload: Record<string, string>;
}

const emptyRecord = (): DocumentRecord => ({ name: '', payload: {} });

const GeneratePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [records, setRecords] = useState<DocumentRecord[]>([emptyRecord()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates-list'],
    queryFn: () => api.getTemplates(1, 100),
  });

  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.getTags(),
    enabled: !!user,
  });

  const templates = templatesData?.templates ?? [];
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleNameChange = (recordIndex: number, value: string) => {
    setRecords(prev => {
      const updated = [...prev];
      updated[recordIndex] = { ...updated[recordIndex], name: value };
      return updated;
    });
  };

  const handleFieldChange = (recordIndex: number, tagName: string, value: string) => {
    setRecords(prev => {
      const updated = [...prev];
      updated[recordIndex] = {
        ...updated[recordIndex],
        payload: { ...updated[recordIndex].payload, [tagName]: value },
      };
      return updated;
    });
  };

  const addRecord = () => setRecords(prev => [...prev, emptyRecord()]);

  const removeRecord = (index: number) => setRecords(prev => prev.filter((_, i) => i !== index));

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
      Object.entries(record.payload).forEach(([key, value]) => {
        payload[`#${key}#`] = value;
      });

      try {
        await api.asyncGenerate(selectedTemplateId, record.name.trim(), payload);
        succeeded++;
      } catch (error) {
        toast({
          title: t('generate.failed', { name: record.name }),
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    }

    setIsSubmitting(false);

    if (succeeded > 0) {
      setGeneratedCount(succeeded);
    }
  };

  const handleReset = () => {
    setGeneratedCount(0);
    setRecords([emptyRecord()]);
    setSelectedTemplateId('');
  };

  const renderTagInput = (tag: Tag, recordIndex: number) => {
    const value = records[recordIndex]?.payload?.[tag.name] ?? '';
    const onChange = (val: string) => handleFieldChange(recordIndex, tag.name, val);
    const placeholder = tag.description || `${tag.name}...`;
    const baseClass = 'glass bg-gray-50 border-gray-200 focus:border-blue-400';

    if (tag.type === '2') {
      return <Input type="number" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={baseClass} />;
    }
    if (tag.type === '3') {
      return <Input type="date" value={value} onChange={e => onChange(e.target.value)} className={baseClass} />;
    }
    if (tag.type === '4' && tag.options && tag.options.length > 0) {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={`${baseClass} focus:ring-0`}>
            <SelectValue placeholder={`${tag.name}...`} />
          </SelectTrigger>
          <SelectContent className="glass-strong border-gray-200">
            {tag.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (tag.type === '5') {
      return <Input type="email" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={baseClass} />;
    }
    if (tag.type === '6') {
      return (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${baseClass} bg-gray-50`}
        />
      );
    }
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
              <Link to="/files">
                {t('generate.viewGeneratedFiles')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-full border-gray-200">
              {t('generate.generateMore')}
            </Button>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selection */}
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
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('generate.loadingTemplates')}</span>
              </div>
            ) : templates.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {t('generate.noTemplates')}{' '}
                <Link to="/documents" className="text-blue-700 hover:text-blue-800">
                  {t('generate.createFirst')}
                </Link>
              </p>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="glass bg-gray-50 border-gray-200 focus:border-blue-400 max-w-sm">
                  <SelectValue placeholder={t('generate.chooseTemplate')} />
                </SelectTrigger>
                <SelectContent className="glass-strong border-gray-200">
                  {templates.map(tpl => (
                    <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Records */}
        {selectedTemplateId && (
          <>
            {loadingTags ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                {t('generate.loadingFields')}
              </div>
            ) : (
              <>
                {records.map((record, recordIndex) => (
                  <Card key={recordIndex} className="glass-card border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-blue-800">
                          {records.length > 1 ? t('generate.documentNumber', { num: recordIndex + 1 }) : t('generate.documentLabel')}
                        </CardTitle>
                        {records.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRecord(recordIndex)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-sm text-gray-700">
                            {t('generate.documentName')} <span className="text-red-400">*</span>
                            <span className="ml-1 text-gray-500 font-normal text-xs">— {t('generate.documentNameHint')}</span>
                          </Label>
                          <Input
                            type="text"
                            placeholder={t('generate.documentNamePlaceholder', { template: selectedTemplate?.name ?? 'Document', num: recordIndex + 1 })}
                            value={record.name}
                            onChange={(e) => handleNameChange(recordIndex, e.target.value)}
                            className="glass bg-gray-50 border-gray-200 focus:border-blue-400 max-w-sm"
                          />
                        </div>

                        {tags.length === 0 ? (
                          <p className="text-gray-500 text-sm md:col-span-2">{t('generate.noTags')}</p>
                        ) : (
                          tags.map(tag => (
                            <div key={tag.id} className="space-y-1">
                              <Label className="text-sm text-gray-700">
                                {tag.name}
                                {tag.description && (
                                  <span className="ml-1 text-gray-500 font-normal text-xs">— {tag.description}</span>
                                )}
                              </Label>
                              {renderTagInput(tag, recordIndex)}
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addRecord}
                  className="w-full border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('generate.addAnotherDocument')}
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white transition-all duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('generate.queuingGeneration')}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      {records.length > 1 ? t('generate.generateMany', { count: records.length }) : t('generate.generateOne')}
                    </>
                  )}
                </Button>
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
};

export default GeneratePage;
