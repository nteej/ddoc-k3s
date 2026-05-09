import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Calendar, Loader2, RefreshCw, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GeneratedFile, GeneratedFilesResponse } from '@/types';
import api from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
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
    files: [],
    total: 0,
    page: 1,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [sendingEmailFiles, setSendingEmailFiles] = useState<Set<string>>(new Set());
  const [emailDialogFile, setEmailDialogFile] = useState<GeneratedFile | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const loadFiles = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      const response = await api.getGeneratedFiles(currentPage, 10);
      setFilesData(response);

      const hasProcessing = response.files.some(f => f.status === 1);
      if (hasProcessing && !pollRef.current) {
        pollRef.current = setInterval(async () => {
          try {
            const refreshed = await api.getGeneratedFiles(currentPage, 10);
            setFilesData(refreshed);
            if (!refreshed.files.some(f => f.status === 1)) stopPolling();
          } catch { /* silent */ }
        }, 4000);
      } else if (!hasProcessing) {
        stopPolling();
      }
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
    return () => stopPolling();
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
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const handleSendEmail = async () => {
    if (!emailDialogFile || !emailInput) return;
    const fileId = emailDialogFile.id;
    try {
      setSendingEmailFiles(prev => new Set(prev).add(fileId));
      await api.sendFileEmail(fileId, emailInput);
      setEmailDialogFile(null);
      setEmailInput('');
      toast({ title: t('files.sendEmailSuccess'), description: t('files.sendEmailSuccessDesc') });
    } catch {
      toast({ title: t('files.sendEmailFailed'), description: t('files.sendEmailFailedDesc'), variant: 'destructive' });
    } finally {
      setSendingEmailFiles(prev => { const next = new Set(prev); next.delete(fileId); return next; });
    }
  };

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
      try {
        if (file.errors) errorMsg = JSON.parse(file.errors).join(', ');
      } catch { /* keep default */ }
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
    } catch {
      return dateString;
    }
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
                    <th className="text-right py-3 px-4 font-semibold">{t('files.colDownload')}</th>
                    <th className="text-right py-3 px-4 font-semibold">{t('files.sendEmail')}</th>
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
                            <p className="font-medium text-sm">{file.templateName || '—'}</p>
                            <p className="text-xs text-gray-500 font-mono">{file.id.slice(0, 8)}…</p>
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
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file.id, file.templateName || file.id)}
                          disabled={!file.readyToDownload || downloadingFiles.has(file.id)}
                          className="hover:bg-green-500/20 disabled:opacity-30"
                          title={!file.readyToDownload ? t('files.fileNotReady') : t('files.downloadPdf')}
                        >
                          {downloadingFiles.has(file.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEmailDialogFile(file); setEmailInput(''); }}
                          disabled={!file.readyToDownload || sendingEmailFiles.has(file.id)}
                          className="hover:bg-blue-500/20 disabled:opacity-30"
                          title={!file.readyToDownload ? t('files.fileNotReady') : t('files.sendEmail')}
                        >
                          {sendingEmailFiles.has(file.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </Button>
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

      <Dialog open={!!emailDialogFile} onOpenChange={open => { if (!open) { setEmailDialogFile(null); setEmailInput(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('files.sendEmailDialogTitle')}</DialogTitle>
            <DialogDescription>{t('files.sendEmailDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="email-recipient">Email</Label>
            <Input
              id="email-recipient"
              type="email"
              placeholder={t('files.sendEmailPlaceholder')}
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendEmail(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEmailDialogFile(null); setEmailInput(''); }}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={!emailInput || (emailDialogFile ? sendingEmailFiles.has(emailDialogFile.id) : false)}
            >
              {emailDialogFile && sendingEmailFiles.has(emailDialogFile.id)
                ? t('files.sendEmailSending')
                : t('files.sendEmailSend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FilesPage;
