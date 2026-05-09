import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download, FileText, Calendar, Loader2, RefreshCw, AlertCircle,
  CheckCircle, Mail, Trash2, History, Send,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GeneratedFile, GeneratedFilesResponse, FileEmailLog, FileDownloadLog } from '@/types';
import api from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { enUS, fi, sv } from 'date-fns/locale';

const dateFnsLocales: Record<string, Locale> = { en: enUS, fi, sv };

const FilesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const [filesData, setFilesData] = useState<GeneratedFilesResponse>({
    files: [], total: 0, page: 1, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [sendingEmailFiles, setSendingEmailFiles] = useState<Set<string>>(new Set());
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

  // Email dialog
  const [emailDialogFile, setEmailDialogFile] = useState<GeneratedFile | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // History dialog
  const [historyFile, setHistoryFile] = useState<GeneratedFile | null>(null);
  const [emailHistory, setEmailHistory] = useState<FileEmailLog[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<FileDownloadLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Delete confirm
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<GeneratedFile | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  const startPolling = (fast: boolean) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const refreshed = await api.getGeneratedFiles(currentPage, 10);
        setFilesData(refreshed);
        const hasProcessing = refreshed.files.some(f => f.status === 1);
        if (!hasProcessing && fast) startPolling(false);
        if (hasProcessing && !fast) startPolling(true);
      } catch { /* silent */ }
    }, fast ? 3000 : 10000);
  };

  const loadFiles = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      const response = await api.getGeneratedFiles(currentPage, 10);
      setFilesData(response);
      startPolling(response.files.some(f => f.status === 1));
    } catch {
      toast({
        title: t('files.errorLoadingFiles'),
        description: t('files.errorLoadingFilesDesc'),
        variant: 'destructive',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, currentPage, t]);

  useEffect(() => {
    loadFiles();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadFiles]);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      setDownloadingFiles(prev => new Set(prev).add(fileId));
      await api.downloadGeneratedFile(fileId, fileName);
    } catch {
      toast({
        title: t('files.downloadFailed'),
        description: t('files.downloadFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setDownloadingFiles(prev => { const n = new Set(prev); n.delete(fileId); return n; });
    }
  };

  const handleSendEmail = async () => {
    if (!emailDialogFile || !emailInput) return;
    const fileId = emailDialogFile.id;
    try {
      setSendingEmailFiles(prev => new Set(prev).add(fileId));
      await api.sendFileEmail(fileId, emailInput, emailMessage || undefined);
      setEmailDialogFile(null);
      setEmailInput('');
      setEmailMessage('');
      toast({ title: t('files.sendEmailSuccess'), description: t('files.sendEmailSuccessDesc') });
    } catch (err: unknown) {
      toast({
        title: t('files.sendEmailFailed'),
        description: err instanceof Error ? err.message : t('files.sendEmailFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setSendingEmailFiles(prev => { const n = new Set(prev); n.delete(fileId); return n; });
    }
  };

  const handleOpenHistory = async (file: GeneratedFile) => {
    setHistoryFile(file);
    setHistoryLoading(true);
    setEmailHistory([]);
    setDownloadHistory([]);
    try {
      const [emails, downloads] = await Promise.all([
        api.getFileEmailHistory(file.id),
        api.getFileDownloadHistory(file.id),
      ]);
      setEmailHistory(emails);
      setDownloadHistory(downloads);
    } catch {
      toast({ title: 'Failed to load history', variant: 'destructive' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmFile) return;
    const fileId = deleteConfirmFile.id;
    setDeleteConfirmFile(null);
    try {
      setDeletingFiles(prev => new Set(prev).add(fileId));
      await api.deleteFile(fileId);
      toast({ title: 'File deleted successfully' });
      loadFiles(true);
    } catch (err: unknown) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete file',
        variant: 'destructive',
      });
    } finally {
      setDeletingFiles(prev => { const n = new Set(prev); n.delete(fileId); return n; });
    }
  };

  const canDelete = (file: GeneratedFile) =>
    isAdminOrOwner || file.userId === user?.id;

  const getStatusBadge = (file: GeneratedFile) => {
    if (file.status === 2) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle className="w-3.5 h-3.5" /> {t('files.statusReady')}
        </span>
      );
    }
    if (file.status === 3) {
      let errorMsg = t('files.statusError');
      try { if (file.errors) errorMsg = JSON.parse(file.errors).join(', '); } catch { /* keep default */ }
      return (
        <span className="flex items-center gap-1 text-xs text-red-400" title={errorMsg}>
          <AlertCircle className="w-3.5 h-3.5" /> {t('files.statusError')}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('files.statusProcessing')}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const locale = dateFnsLocales[i18n.language] ?? enUS;
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale });
    } catch { return dateString; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-700">{t('files.loadingFiles')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t('files.title')}</h1>
          <p className="text-gray-700 mt-1">{t('files.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadFiles()} className="border-gray-200 gap-2">
          <RefreshCw className="w-4 h-4" /> {t('files.refresh')}
        </Button>
      </div>

      <Card className="glass-card border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('files.fileHistory')}
          </CardTitle>
          <CardDescription>{t('files.allDocuments')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filesData.files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-semibold mb-2">{t('files.noFiles')}</h3>
              <p className="text-gray-500">
                {t('files.noFilesDesc')}{' '}
                <a href="/generate" className="text-blue-700 hover:text-blue-800">{t('files.noFilesLink')}</a>
                {' '}{t('files.noFilesEnd')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="text-left py-3 px-4 font-semibold">{t('files.colTemplate')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('files.colStatus')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('files.colGeneratedAt')}</th>
                    <th className="text-center py-3 px-4 font-semibold">History</th>
                    <th className="text-right py-3 px-4 font-semibold">{t('files.colDownload')}</th>
                    <th className="text-right py-3 px-4 font-semibold">{t('files.sendEmail')}</th>
                    <th className="text-right py-3 px-4 font-semibold">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filesData.files.map((file) => (
                    <tr key={file.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-900 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{file.name || '—'}</p>
                            <p className="text-xs text-gray-500">{file.templateName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(file)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          {formatDate(file.createdAt)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenHistory(file)}
                          className="hover:bg-purple-500/20"
                          title="View sending & download history"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file.id, file.name || file.id)}
                          disabled={!file.readyToDownload || downloadingFiles.has(file.id)}
                          className="hover:bg-green-500/20 disabled:opacity-30"
                          title={!file.readyToDownload ? t('files.fileNotReady') : t('files.downloadPdf')}
                        >
                          {downloadingFiles.has(file.id)
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />}
                        </Button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEmailDialogFile(file); setEmailInput(''); setEmailMessage(''); }}
                          disabled={!file.readyToDownload || sendingEmailFiles.has(file.id)}
                          className="hover:bg-blue-500/20 disabled:opacity-30"
                          title={!file.readyToDownload ? t('files.fileNotReady') : t('files.sendEmail')}
                        >
                          {sendingEmailFiles.has(file.id)
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Mail className="w-4 h-4" />}
                        </Button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {canDelete(file) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmFile(file)}
                            disabled={deletingFiles.has(file.id)}
                            className="hover:bg-red-500/20 text-red-500 disabled:opacity-30"
                            title="Delete file"
                          >
                            {deletingFiles.has(file.id)
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {filesData.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: filesData.totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(filesData.totalPages, p + 1))}
                  className={currentPage === filesData.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Send Email Dialog */}
      <Dialog open={!!emailDialogFile} onOpenChange={open => { if (!open) { setEmailDialogFile(null); setEmailInput(''); setEmailMessage(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('files.sendEmailDialogTitle')}</DialogTitle>
            <DialogDescription>{t('files.sendEmailDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="email-recipient">Email</Label>
              <Input
                id="email-recipient"
                type="email"
                placeholder={t('files.sendEmailPlaceholder')}
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Message (optional)</Label>
              <Textarea
                id="email-message"
                placeholder="Add a personal message to accompany the document..."
                value={emailMessage}
                onChange={e => setEmailMessage(e.target.value)}
                maxLength={1000}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{emailMessage.length}/1000</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEmailDialogFile(null); setEmailInput(''); setEmailMessage(''); }}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={!emailInput || (emailDialogFile ? sendingEmailFiles.has(emailDialogFile.id) : false)}
            >
              {emailDialogFile && sendingEmailFiles.has(emailDialogFile.id)
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('files.sendEmailSending')}</>
                : <><Send className="w-4 h-4 mr-2" />{t('files.sendEmailSend')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyFile} onOpenChange={open => { if (!open) setHistoryFile(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              History — {historyFile?.name}
            </DialogTitle>
            <DialogDescription>Email sending and download history for this document.</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email History
                  {emailHistory.length > 0 && <Badge variant="secondary">{emailHistory.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="download" className="flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download History
                  {downloadHistory.length > 0 && <Badge variant="secondary">{downloadHistory.length}</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                {emailHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No emails sent yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500">
                          <th className="text-left py-2 px-3">Recipient</th>
                          <th className="text-left py-2 px-3">Status</th>
                          <th className="text-left py-2 px-3">Message</th>
                          <th className="text-left py-2 px-3">Sent At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailHistory.map(log => (
                          <tr key={log.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-medium">{log.recipient_email}</td>
                            <td className="py-2 px-3">
                              <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                                {log.status}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-gray-500 max-w-[180px] truncate" title={log.message || ''}>
                              {log.message || <span className="italic text-gray-400">—</span>}
                            </td>
                            <td className="py-2 px-3 text-gray-500">{formatDate(log.sent_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="download">
                {downloadHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No downloads recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500">
                          <th className="text-left py-2 px-3">User ID</th>
                          <th className="text-left py-2 px-3">IP Address</th>
                          <th className="text-left py-2 px-3">Downloaded At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {downloadHistory.map(log => (
                          <tr key={log.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-mono text-xs">{log.downloaded_by_user_id}</td>
                            <td className="py-2 px-3 text-gray-500">{log.ip_address || '—'}</td>
                            <td className="py-2 px-3 text-gray-500">{formatDate(log.downloaded_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteConfirmFile} onOpenChange={open => { if (!open) setDeleteConfirmFile(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteConfirmFile?.name}</strong> and remove it from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FilesPage;
