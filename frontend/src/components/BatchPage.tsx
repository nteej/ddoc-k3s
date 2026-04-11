
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';

const BatchPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates', user?.id],
    queryFn: () => user ? api.getTemplates(user.id) : Promise.resolve({ templates: [] }),
    enabled: !!user
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelection(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(Array.from(e.target.files || []));
  };

  const handleFileSelection = (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (file.size > maxSize) {
      toast({ title: t('batch.fileTooLarge'), description: t('batch.fileTooLargeDesc'), variant: 'destructive' });
      return;
    }

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast({ title: t('batch.invalidFormat'), description: t('batch.invalidFormatDesc'), variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    toast({
      title: t('batch.fileSelected'),
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
    });
  };

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplateIds(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleRemoveTemplate = (templateId: string) => {
    setSelectedTemplateIds(prev => prev.filter(id => id !== templateId));
  };

  const getSelectedTemplates = () => {
    if (!templatesData?.templates) return [];
    return templatesData.templates.filter(template =>
      selectedTemplateIds.includes(template.id)
    );
  };

  const handleSubmit = async () => {
    if (!selectedFile || selectedTemplateIds.length === 0) {
      toast({ title: t('batch.incompleteData'), description: t('batch.incompleteDataDesc'), variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      await api.processBatchTemplates(selectedTemplateIds, selectedFile);
      toast({ title: t('batch.processingStarted'), description: t('batch.processingStartedDesc') });
      setSelectedFile(null);
      setSelectedTemplateIds([]);
    } catch (error) {
      toast({ title: t('batch.processingError'), description: t('batch.processingErrorDesc'), variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('batch.title')}</h1>
          <p className="text-muted-foreground">{t('batch.subtitle')}</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5" />
                <span>{t('batch.uploadFile')}</span>
              </CardTitle>
              <CardDescription>{t('batch.uploadDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : selectedFile
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border hover:border-border/80'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-4">
                  {selectedFile ? (
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <CheckCircle className="w-8 h-8" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">{t('batch.dragDrop')}</p>
                        <p className="text-muted-foreground">{t('batch.clickToSelect')}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{t('batch.supportedFormats')}</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>{t('batch.templateModels')}</CardTitle>
              <CardDescription>{t('batch.templateModelsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">{t('batch.loadingTemplates')}</span>
                </div>
              ) : (
                <>
                  {selectedTemplateIds.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('batch.templatesSelected')}</p>
                      <div className="flex flex-wrap gap-2">
                        {getSelectedTemplates().map((template) => (
                          <Badge key={template.id} variant="secondary" className="flex items-center gap-1">
                            {template.name}
                            <X
                              className="w-3 h-3 cursor-pointer hover:text-destructive"
                              onClick={() => handleRemoveTemplate(template.id)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                      className="w-full justify-start"
                    >
                      {showTemplateSelector ? t('batch.hideTemplates') : t('batch.showTemplates')}
                    </Button>

                    {showTemplateSelector && (
                      <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                        {templatesData?.templates.map((template) => (
                          <div
                            key={template.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedTemplateIds.includes(template.id)
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted border-border'
                            }`}
                            onClick={() => handleTemplateToggle(template.id)}
                          >
                            <div className="flex items-center space-x-2">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                selectedTemplateIds.includes(template.id)
                                  ? 'bg-primary border-primary'
                                  : 'border-border'
                              }`}>
                                {selectedTemplateIds.includes(template.id) && (
                                  <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{template.name}</p>
                                <p className="text-sm text-muted-foreground">{template.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || selectedTemplateIds.length === 0 || isUploading}
              size="lg"
              className="px-8"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t('batch.processing')}
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {t('batch.generate')}
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">{t('batch.howItWorks')}</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>{t('batch.step1')}</li>
                    <li>{t('batch.step2')}</li>
                    <li>{t('batch.step3')}</li>
                    <li>{t('batch.step4')}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BatchPage;
