
import React, { useState, useEffect } from 'react';
import { Template, Section } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { Search, Loader2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ImportSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTemplate: Template;
  onImportComplete: () => void;
}

const ImportSectionModal: React.FC<ImportSectionModalProps> = ({
  isOpen,
  onClose,
  targetTemplate,
  onImportComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && user) loadTemplates();
  }, [isOpen, user]);

  const loadTemplates = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await api.getTemplates(1, 100);
      setTemplates(response.templates.filter(c => c.id !== targetTemplate.id));
    } catch {
      toast({ title: t('common.error'), description: t('importSection.loadTemplatesError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (templateId: string) => {
    try {
      setSectionsLoading(true);
      setSections(await api.getSections(templateId));
    } catch {
      toast({ title: t('common.error'), description: t('importSection.loadSectionsError'), variant: 'destructive' });
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleTemplateSelect = async (template: Template) => {
    setSelectedTemplate(template);
    await loadSections(template.id);
  };

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleImport = async () => {
    if (!selectedTemplate) {
      toast({ title: t('common.error'), description: t('importSection.attentionNoTemplate') });
      return;
    }
    if (selectedSections.length === 0) {
      toast({ title: t('common.error'), description: t('importSection.attentionNoSections') });
      return;
    }
    try {
      setLoading(true);
      await api.importSections(targetTemplate.id, selectedSections);
      toast({ title: t('importSection.importSuccess') });
      onImportComplete();
      onClose();
    } catch {
      toast({ title: t('common.error'), description: t('importSection.importError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setSections([]);
    setSelectedSections([]);
    onClose();
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-strong border-gray-200 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('importSection.title')}</DialogTitle>
          <DialogDescription>
            {t('importSection.desc', { name: targetTemplate.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="search-templates">{t('importSection.searchTemplates')}</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                id="search-templates"
                placeholder={t('importSection.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              {t('importSection.loadingTemplates')}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.length === 0 ? (
                <p className="text-gray-500">{t('importSection.noTemplateFound')}</p>
              ) : (
                filteredTemplates.map(template => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className={`w-full justify-start border-gray-200 ${selectedTemplate?.id === template.id ? 'bg-gray-100 hover:bg-gray-200' : 'hover:bg-gray-50'}`}
                    onClick={() => handleTemplateSelect(template)}
                    disabled={loading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {template.name}
                  </Button>
                ))
              )}
            </div>
          )}

          {selectedTemplate && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('importSection.templateSections')}</h3>
              {sectionsLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  {t('importSection.loadingSections')}
                </div>
              ) : sections.length === 0 ? (
                <p className="text-gray-500">{t('importSection.noSectionsFound')}</p>
              ) : (
                sections.map(section => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`section-${section.id}`}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => handleSectionToggle(section.id)}
                      disabled={loading}
                    />
                    <Label htmlFor={`section-${section.id}`} className="text-sm">
                      {section.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={handleClose} className="border-gray-200">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            {t('importSection.importSections')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportSectionModal;
