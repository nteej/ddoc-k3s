import React, { useEffect, useState, useCallback } from 'react';
import { Plus, FileText, ChevronDown, ChevronUp, Edit, Trash2, Upload, Loader2, Search, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Template, Section, Tag, CreateTemplateData, CreateSectionData, TemplatesResponse } from '@/types';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import Editor from '@/components/Editor';
import ImportSectionModal from '@/components/ImportSectionModal';
import DraggableSection from '@/components/DraggableSection';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [templatesData, setTemplatesData] = useState<TemplatesResponse>({
    templates: [],
    total: 0,
    page: 1,
    totalPages: 0
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form states
  const [newTemplateData, setNewTemplateData] = useState<CreateTemplateData>({
    name: '',
    description: ''
  });
  const [newSectionData, setNewSectionData] = useState<CreateSectionData>({
    name: '',
    description: '',
    htmlContent: '',
    templateId: ''
  });

  useEffect(() => {
    loadTemplates();
    loadTags();
  }, [user, currentPage, searchQuery]);

  const loadTemplates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let response: TemplatesResponse;

      if (searchQuery.trim()) {
        response = await api.filterTemplates(searchQuery, currentPage, 10);
      } else {
        response = await api.getTemplates(currentPage, 10);
      }

      setTemplatesData(response);
    } catch (error) {
      toast({
        title: t('documents.errorLoadingTemplates'),
        description: t('documents.errorLoadingTemplatesDesc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    if (!user) return;

    try {
      const tagsData = await api.getTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadSections = async (templateId: string) => {
    try {
      setSectionsLoading(true);
      const sectionsData = await api.getSections(templateId);
      setSections(sectionsData);
    } catch (error) {
      toast({
        title: t('documents.errorLoadingSections'),
        description: t('documents.errorLoadingSectionsDesc'),
        variant: "destructive",
      });
    } finally {
      setSectionsLoading(false);
    }
  };

  const moveSection = useCallback(async (dragIndex: number, hoverIndex: number) => {
    if (!selectedTemplate) return;

    const dragSection = sections[dragIndex];

    // Reorder sections array locally for immediate UI feedback
    const newSections = [...sections];
    newSections.splice(dragIndex, 1);
    newSections.splice(hoverIndex, 0, dragSection);

    // Update order property based on new positions
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      sectionOrder: index + 1
    }));

    setSections(updatedSections);

    try {
      await api.updateSectionOrder(selectedTemplate.id, updatedSections.map(s => ({ id: s.id, sectionOrder: s.sectionOrder })));
      toast({
        title: t('documents.orderUpdated'),
        description: t('documents.orderUpdatedDesc'),
      });
    } catch (error) {
      setSections(sections);
      toast({
        title: t('documents.errorReordering'),
        description: t('documents.errorReorderingDesc'),
        variant: "destructive",
      });
    }
  }, [sections, selectedTemplate, toast, t]);

  const handleTemplateClick = async (template: Template) => {
    setSelectedTemplate(template);

    if (expandedTemplates.has(template.id)) {
      setExpandedTemplates(prev => {
        const newSet = new Set(prev);
        newSet.delete(template.id);
        return newSet;
      });
      setSections([]);
    } else {
      setExpandedTemplates(prev => new Set([...prev, template.id]));
      await loadSections(template.id);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCreateTemplate = async () => {
    if (!user || !newTemplateData.name.trim()) return;

    try {
      await api.createTemplate(newTemplateData);
      await loadTemplates();
      setNewTemplateData({ name: '', description: '' });
      setShowNewTemplateModal(false);
      toast({
        title: t('documents.templateCreated'),
        description: t('documents.templateCreatedDesc'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('documents.errorCreatingTemplate'),
        variant: "destructive",
      });
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplateData({
      name: template.name,
      description: template.description
    });
    setShowEditTemplateModal(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      await api.updateTemplate(editingTemplate.id, newTemplateData);
      await loadTemplates();
      setEditingTemplate(null);
      setNewTemplateData({ name: '', description: '' });
      setShowEditTemplateModal(false);
      toast({
        title: t('documents.templateUpdated'),
        description: t('documents.templateUpdatedDesc'),
      });
    } catch (error) {
      toast({
        title: t('documents.errorUpdatingTemplate'),
        description: t('documents.errorUpdatingTemplateDesc'),
        variant: "destructive",
      });
    }
  };

  const handleCreateSection = async () => {
    if (!selectedTemplate || !newSectionData.name.trim()) return;

    try {
      const sectionData = {
        ...newSectionData,
        templateId: selectedTemplate.id
      };
      await api.createSection(sectionData);
      const updatedSections = await api.getSections(sectionData.templateId);
      setSections(updatedSections);
      setNewSectionData({ name: '', description: '', htmlContent: '', templateId: '' });
      setShowNewSectionModal(false);
      toast({
        title: t('documents.sectionCreated'),
        description: t('documents.sectionCreatedDesc'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('documents.errorCreatingSection'),
        variant: "destructive",
      });
    }
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setNewSectionData({
      name: section.name,
      description: section.description,
      htmlContent: section.htmlContent,
      templateId: section.templateId
    });
    setShowEditSectionModal(true);
  };

  const handleUpdateSection = async () => {
    if (!editingSection) return;

    try {
      await api.updateSection(editingSection.id, newSectionData);
      const updatedSections = await api.getSections(newSectionData.templateId);
      setSections(updatedSections);
      setEditingSection(null);
      setNewSectionData({ name: '', description: '', htmlContent: '', templateId: '' });
      setShowEditSectionModal(false);
      toast({
        title: t('documents.sectionUpdated'),
        description: t('documents.sectionUpdatedDesc'),
      });
    } catch (error) {
      toast({
        title: t('documents.errorUpdatingSection'),
        description: t('documents.errorUpdatingSectionDesc'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await api.deleteSection(sectionId);
      setSections(prev => prev.filter(s => s.id !== sectionId));
      toast({
        title: t('documents.sectionDeleted'),
        description: t('documents.sectionDeletedDesc'),
      });
    } catch (error) {
      toast({
        title: t('documents.errorDeletingSection'),
        description: t('documents.errorDeletingSectionDesc'),
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await api.deleteTemplate(templateId);
      await loadTemplates();
      toast({
        title: t('documents.templateDeleted'),
        description: t('documents.templateDeletedDesc'),
      });
    } catch (error) {
      toast({
        title: t('documents.errorDeletingTemplate'),
        description: t('documents.errorDeletingTemplateDesc'),
        variant: "destructive",
      });
    }
  };

  const handleDownloadExample = async (templateId: string) => {
    try {
      await api.downloadTemplateExample(templateId);
      toast({
        title: t('documents.downloadStarted'),
        description: t('documents.downloadStartedDesc'),
      });
    } catch (error) {
      toast({
        title: t('documents.errorDownload'),
        description: t('documents.errorDownloadDesc'),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-700">{t('documents.loadingTemplates')}</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">{t('documents.title')}</h1>
            <p className="text-gray-700 mt-2">{t('documents.subtitle')}</p>
          </div>

          <Dialog open={showNewTemplateModal} onOpenChange={setShowNewTemplateModal}>
            <DialogTrigger asChild>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                {t('documents.newTemplate')}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-gray-200">
              <DialogHeader>
                <DialogTitle>{t('documents.createTitle')}</DialogTitle>
                <DialogDescription>
                  {t('documents.createDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">{t('documents.templateName')}</Label>
                  <Input
                    id="template-name"
                    placeholder={t('documents.templateNamePlaceholder')}
                    value={newTemplateData.name}
                    onChange={(e) => setNewTemplateData(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    className="glass bg-gray-50 border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="template-description">{t('documents.description')}</Label>
                  <Textarea
                    id="template-description"
                    placeholder={t('documents.descriptionPlaceholder')}
                    value={newTemplateData.description}
                    onChange={(e) => setNewTemplateData(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    className="glass bg-gray-50 border-gray-200"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewTemplateModal(false)}
                    className="border-gray-200"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={!newTemplateData.name.trim()}
                    className="bg-blue-900"
                  >
                    {t('documents.createTemplate')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="flex space-x-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <Input
              type="text"
              placeholder={t('documents.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="pl-10 glass bg-gray-50 border-gray-200"
            />
          </div>
          <Button
            onClick={handleSearch}
            variant="outline"
            className="border-gray-200"
          >
            {t('common.search')}
          </Button>
        </div>

        {templatesData.templates.length === 0 ? (
          <Card className="glass-card border-gray-200 text-center py-12">
            <CardHeader>
              <FileText className="w-16 h-16 mx-auto text-gray-500 mb-4" />
              <CardTitle>{t('documents.noTemplates')}</CardTitle>
              <CardDescription>
                {searchQuery ? t('documents.noTemplatesSearch') : t('documents.noTemplatesDesc')}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {templatesData.templates.map((template) => (
                <Card key={template.id} className="glass-card border-gray-200">
                  <Collapsible
                    open={expandedTemplates.has(template.id)}
                    onOpenChange={() => handleTemplateClick(template)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-6 h-6 text-gray-500" />
                            <div>
                              <CardTitle className="text-left">{template.name}</CardTitle>
                              <CardDescription className="text-left mt-1">
                                {t('documents.idLabel')} {template.id}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadExample(template.id);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTemplate(template);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="glass-strong border-gray-200">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('documents.confirmExclusion')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('documents.confirmDeleteTemplate', { name: template.name })}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-gray-200">
                                      {t('common.cancel')}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteTemplate(template.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {t('common.delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            {expandedTemplates.has(template.id) ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{t('documents.templateSections')}</h3>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowImportModal(true);
                                }}
                                className="border-gray-200"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {t('documents.importSection')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setNewSectionData({ name: '', description: '', htmlContent: '', templateId: template.id });
                                  setShowNewSectionModal(true);
                                }}
                                className="bg-blue-900"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('documents.newSection')}
                              </Button>
                            </div>
                          </div>

                          {sectionsLoading && selectedTemplate?.id === template.id ? (
                            <div className="text-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                              <p className="text-gray-500">{t('documents.loadingSections')}</p>
                            </div>
                          ) : sections.length === 0 && selectedTemplate?.id === template.id ? (
                            <div className="text-center py-8 text-gray-500">
                              <p>{t('documents.noSectionsYet')}</p>
                            </div>
                          ) : (
                            selectedTemplate?.id === template.id && (
                              <div className="space-y-3">
                                {sections
                                  .sort((a, b) => a.order - b.order)
                                  .map((section, index) => (
                                    <DraggableSection
                                      key={section.id}
                                      section={section}
                                      index={index}
                                      onEdit={handleEditSection}
                                      onDelete={handleDeleteSection}
                                      onMove={moveSection}
                                    />
                                  ))}
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {templatesData.totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {Array.from({ length: templatesData.totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(Math.min(templatesData.totalPages, currentPage + 1))}
                      className={currentPage === templatesData.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}

        {/* New Section Modal */}
        <Dialog open={showNewSectionModal} onOpenChange={setShowNewSectionModal}>
          <DialogContent className="glass-strong border-gray-200 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('documents.createSectionTitle')}</DialogTitle>
              <DialogDescription>
                {t('documents.createSectionDesc', { name: selectedTemplate?.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="section-title">{t('documents.sectionTitle')}</Label>
                <Input
                  id="section-title"
                  placeholder={t('documents.sectionTitlePlaceholder')}
                  value={newSectionData.name}
                  onChange={(e) => setNewSectionData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  className="glass bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="section-description">{t('documents.descriptionBrief')}</Label>
                <Input
                  id="section-description"
                  placeholder={t('documents.descriptionBriefPlaceholder')}
                  value={newSectionData.description}
                  onChange={(e) => setNewSectionData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  className="glass bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <Label>{t('documents.sectionContent')}</Label>
                <Editor
                  htmlContent={newSectionData.htmlContent}
                  onChange={(htmlContent) => setNewSectionData(prev => ({
                    ...prev,
                    htmlContent
                  }))}
                  tags={tags}
                  placeholder={t('documents.sectionContentPlaceholder')}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewSectionModal(false)}
                  className="border-gray-200"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreateSection}
                  disabled={!newSectionData.name.trim()}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  {t('documents.createSection')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Template Modal */}
        <Dialog open={showEditTemplateModal} onOpenChange={setShowEditTemplateModal}>
          <DialogContent className="glass-strong border-gray-200">
            <DialogHeader>
              <DialogTitle>{t('documents.editTemplate')}</DialogTitle>
              <DialogDescription>
                {t('documents.editTemplateDesc', { name: editingTemplate?.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-template-name">{t('documents.templateName')}</Label>
                <Input
                  id="edit-template-name"
                  placeholder={t('documents.templateNamePlaceholder')}
                  value={newTemplateData.name}
                  onChange={(e) => setNewTemplateData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  className="glass bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="edit-template-description">{t('documents.description')}</Label>
                <Textarea
                  id="edit-template-description"
                  placeholder={t('documents.descriptionPlaceholder')}
                  value={newTemplateData.description}
                  onChange={(e) => setNewTemplateData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  className="glass bg-gray-50 border-gray-200"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditTemplateModal(false)}
                  className="border-gray-200"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleUpdateTemplate}
                  disabled={!newTemplateData.name.trim()}
                  className="bg-blue-900"
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Section Modal */}
        <Dialog open={showEditSectionModal} onOpenChange={setShowEditSectionModal}>
          <DialogContent className="glass-strong border-gray-200 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('documents.editSection')}</DialogTitle>
              <DialogDescription>
                {t('documents.editSectionDesc', { name: editingSection?.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-section-title">{t('documents.sectionTitle')}</Label>
                <Input
                  id="edit-section-title"
                  value={newSectionData.name}
                  onChange={(e) => setNewSectionData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  className="glass bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="edit-section-description">{t('documents.descriptionBrief')}</Label>
                <Input
                  id="edit-section-description"
                  value={newSectionData.description}
                  onChange={(e) => setNewSectionData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  className="glass bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <Label>{t('documents.sectionContent')}</Label>
                <Editor
                  htmlContent={newSectionData.htmlContent}
                  onChange={(htmlContent) => setNewSectionData(prev => ({
                    ...prev,
                    htmlContent
                  }))}
                  tags={tags}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditSectionModal(false)}
                  className="border-gray-200"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleUpdateSection}
                  disabled={!newSectionData.name.trim()}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Section Modal */}
        {showImportModal && selectedTemplate && (
          <ImportSectionModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            targetTemplate={selectedTemplate}
            onImportComplete={() => {
              if (selectedTemplate) {
                loadSections(selectedTemplate.id);
              }
            }}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default DocumentsPage;
