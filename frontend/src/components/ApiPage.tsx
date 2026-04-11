import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Copy, Check, Code, Lock, Globe, Zap, FileText,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';

const BASE_URL = 'http://localhost:8000/api';

const METHOD_COLORS: Record<string, string> = {
  POST: 'bg-green-500/20 text-green-300 border-green-500/30',
  GET: 'bg-blue-500/20 text-blue-800 border-blue-500/30',
  PATCH: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-300 border-red-500/30',
};

interface Endpoint {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  requestBody?: string;
  response?: string;
  notes?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST', path: '/auth/login', auth: false,
    description: 'Authenticate a user and receive a session cookie.',
    requestBody: `{\n  "email": "user@example.com",\n  "password": "yourpassword"\n}`,
    response: `{\n  "data": {\n    "id": "uuid",\n    "name": "Jane Smith",\n    "email": "user@example.com"\n  }\n}`,
    notes: 'Sets an HTTP-only cookie named `token` on success. Include credentials in subsequent requests.',
  },
  {
    method: 'POST', path: '/auth/register', auth: false,
    description: 'Create a new user account.',
    requestBody: `{\n  "name": "Jane Smith",\n  "email": "user@example.com",\n  "password": "yourpassword",\n  "password_confirmation": "yourpassword"\n}`,
    response: `{\n  "data": {\n    "id": "uuid",\n    "name": "Jane Smith",\n    "email": "user@example.com"\n  }\n}`,
  },
  { method: 'POST', path: '/auth/logout', auth: true, description: 'Invalidate the current session.', response: 'HTTP 204 No Content' },
  {
    method: 'GET', path: '/templates/filters', auth: true,
    description: 'List all templates belonging to your account.',
    response: `{\n  "data": [\n    {\n      "id": "uuid",\n      "name": "Contract Template",\n      "description": "..."\n    }\n  ]\n}`,
  },
  {
    method: 'POST', path: '/templates', auth: true,
    description: 'Create a new template.',
    requestBody: `{\n  "name": "Contract Template",\n  "description": "A reusable contract template"\n}`,
    response: `{\n  "data": { "id": "uuid" }\n}`,
  },
  {
    method: 'PATCH', path: '/templates/{id}', auth: true,
    description: 'Update an existing template.',
    requestBody: `{\n  "name": "Updated Name",\n  "description": "Updated description"\n}`,
    response: `{\n  "data": { "id": "uuid", "name": "Updated Name" }\n}`,
  },
  { method: 'DELETE', path: '/templates/{id}', auth: true, description: 'Delete a template and all its sections.', response: 'HTTP 204 No Content' },
  {
    method: 'GET', path: '/sections/filters?templateId={id}', auth: true,
    description: 'List all sections for a given template, ordered by sectionOrder.',
    response: `{\n  "data": [\n    {\n      "id": "uuid",\n      "name": "Introduction",\n      "htmlContent": "<p>Hello {{name}}</p>",\n      "sectionOrder": 1\n    }\n  ]\n}`,
  },
  {
    method: 'POST', path: '/sections', auth: true,
    description: 'Add a section to a template.',
    requestBody: `{\n  "name": "Clause 1",\n  "description": "General terms",\n  "htmlContent": "<p>The party {{client_name}} agrees...</p>",\n  "templateId": "uuid"\n}`,
    response: `{\n  "data": { "id": "uuid" }\n}`,
  },
  {
    method: 'GET', path: '/tags/filters', auth: true,
    description: 'List all registered tags (dynamic fields) for your account.',
    response: `{\n  "data": [\n    {\n      "id": "uuid",\n      "name": "client_name",\n      "type": "1",\n      "description": "Client full name",\n      "contextId": "uuid"\n    }\n  ]\n}`,
    notes: 'Tag types: 1 = free text, 2 = select (has options array), 3 = date.',
  },
  {
    method: 'POST', path: '/files/async-generate', auth: true,
    description: 'Queue one or more PDF documents for async generation.',
    requestBody: `{\n  "templateId": "uuid",\n  "name": "Contract – John Doe",\n  "payload": {\n    "#CLIENT_NAME#": "John Doe",\n    "#CONTRACT_DATE#": "2026-04-04",\n    "#VALUE#": "5000.00"\n  }\n}`,
    response: 'HTTP 200 OK',
    notes: '`name` is used as the filename. `payload` keys must match tag placeholders used in template HTML (e.g. `#TAG_NAME#` with hash signs). Call this endpoint once per document.',
  },
  {
    method: 'GET', path: '/files/filters', auth: true,
    description: 'List all generated files for your account.',
    response: `{\n  "data": [\n    {\n      "id": "uuid",\n      "template_id": "uuid",\n      "user_id": "uuid",\n      "ready_to_download": true,\n      "created_at": "2026-04-04T12:00:00Z"\n    }\n  ]\n}`,
  },
  { method: 'DELETE', path: '/files/{id}', auth: true, description: 'Delete a generated file record.', response: 'HTTP 204 No Content' },
];

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: t('api.copied'), description: t('api.copiedDesc') });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t('common.error'), description: t('api.errorCopy'), variant: 'destructive' });
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-gray-500 hover:text-gray-900" onClick={handleCopy}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
};

const EndpointCard: React.FC<{ endpoint: Endpoint }> = ({ endpoint }) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Card className="glass-card border-gray-200">
      <button type="button" className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-xs font-bold px-2 py-1 rounded border shrink-0 ${METHOD_COLORS[endpoint.method]}`}>
                {endpoint.method}
              </span>
              <code className="text-sm text-gray-700 font-mono truncate">{endpoint.path}</code>
              {endpoint.auth && <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" title={t('api.protected')} />}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 hidden sm:block">{endpoint.description}</span>
              {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </div>
          </div>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0 space-y-4 border-t border-gray-200">
          <p className="text-gray-700 text-sm">{endpoint.description}</p>

          {endpoint.notes && (
            <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded p-3">
              <Info className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
              <p className="text-blue-800 text-xs">{endpoint.notes}</p>
            </div>
          )}

          {endpoint.requestBody && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">{t('api.requestBody')}</span>
                <CopyButton text={endpoint.requestBody} />
              </div>
              <pre className="bg-gray-100 rounded-lg p-3 text-xs text-gray-700 font-mono overflow-x-auto">{endpoint.requestBody}</pre>
            </div>
          )}

          {endpoint.response && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">{t('api.response')}</span>
                <CopyButton text={endpoint.response} />
              </div>
              <pre className="bg-gray-100 rounded-lg p-3 text-xs text-gray-700 font-mono overflow-x-auto">{endpoint.response}</pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const ApiPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [modelCopied, setModelCopied] = useState(false);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.getTags(),
    enabled: !!user,
  });

  const generateJsonModel = () => {
    const payload = tags.reduce((acc: Record<string, string>, tag) => {
      acc[`#${tag.name}#`] = '';
      return acc;
    }, {});
    return { templateId: '<template-uuid>', name: '<document-name>', payload };
  };

  const handleCopyModel = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(generateJsonModel(), null, 2));
      setModelCopied(true);
      toast({ title: t('api.copied'), description: t('api.copiedDesc') });
      setTimeout(() => setModelCopied(false), 2000);
    } catch {
      toast({ title: t('common.error'), description: t('api.errorCopy'), variant: 'destructive' });
    }
  };

  const curlExample = `curl -X POST ${BASE_URL}/files/async-generate \\
  -H "Content-Type: application/json" \\
  -b "token=<your-jwt-cookie>" \\
  -d '${JSON.stringify(generateJsonModel(), null, 2)}'`;

  const fetchExample = `const response = await fetch('${BASE_URL}/files/async-generate', {
  method: 'POST',
  credentials: 'include', // sends the token cookie automatically
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(generateJsonModel(), null, 2)}),
});`;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <Code className="w-8 h-8 text-blue-700" />
          <h1 className="text-3xl font-bold gradient-text">{t('api.title')}</h1>
        </div>
        <p className="text-gray-700">
          {t('api.subtitle')}{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-800 text-sm">{BASE_URL}</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Auth */}
          <Card className="glass-card border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-4 h-4 text-yellow-400" />
                {t('api.authTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <p>
                DDoc uses <strong className="text-gray-900">HTTP-only cookies</strong> for authentication.
                After a successful <code className="bg-gray-100 px-1 rounded">/auth/login</code> or{' '}
                <code className="bg-gray-100 px-1 rounded">/auth/register</code> call, the server sets a cookie
                named <code className="bg-gray-100 px-1 rounded text-blue-800">token</code>.
              </p>
              <p>
                When using a browser, set <code className="bg-gray-100 px-1 rounded">credentials: 'include'</code> on
                every fetch request. For curl, pass <code className="bg-gray-100 px-1 rounded">-b "token=…"</code>.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-xs">
                  <Lock className="w-3 h-3 mr-1" /> {t('api.protected')}
                </Badge>
                <span className="text-gray-500 text-xs">— {t('api.protectedDesc')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Endpoints */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-700" />
              {t('api.endpoints')}
            </h2>
            <p className="text-gray-500 text-sm">{t('api.endpointsDesc')}</p>
            <div className="space-y-2 mt-3">
              {ENDPOINTS.map((ep, i) => <EndpointCard key={i} endpoint={ep} />)}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dynamic JSON model */}
          <Card className="glass-card border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-blue-700" />
                {t('api.yourJsonModel')}
              </CardTitle>
              <CardDescription>{t('api.jsonModelDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  {t('api.loadingTags')}
                </div>
              ) : tags.length === 0 ? (
                <div className="text-center py-4">
                  <Info className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs">{t('api.noTags')}</p>
                </div>
              ) : (
                <>
                  <pre className="bg-gray-100 rounded-lg p-3 text-xs text-gray-700 font-mono overflow-x-auto max-h-64 overflow-y-auto">
                    {JSON.stringify(generateJsonModel(), null, 2)}
                  </pre>
                  <Button onClick={handleCopyModel} className="w-full bg-blue-700 hover:bg-blue-800 h-8 text-sm">
                    {modelCopied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    {modelCopied ? t('api.copied') : t('api.copyModel')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick generate CTA */}
          <Card className="glass-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-blue-800">
                <Zap className="w-4 h-4" />
                {t('api.interactiveGenerator')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm mb-3">{t('api.interactiveGeneratorDesc')}</p>
              <Button asChild className="w-full bg-blue-900 hover:bg-blue-800 text-white h-8 text-sm">
                <a href="/generate">{t('api.openGenerator')}</a>
              </Button>
            </CardContent>
          </Card>

          {/* Base URL */}
          <Card className="glass-card border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-normal">{t('api.baseUrl')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between bg-gray-100 rounded p-2">
                <code className="text-xs text-blue-800 font-mono break-all">{BASE_URL}</code>
                <CopyButton text={BASE_URL} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Code examples */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Code className="w-5 h-5 text-blue-700" />
          {t('api.codeExamples')}
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="glass-card border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-700">cURL</CardTitle>
                <CopyButton text={curlExample} />
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 rounded-lg p-3 text-xs text-gray-700 font-mono overflow-x-auto">{curlExample}</pre>
            </CardContent>
          </Card>

          <Card className="glass-card border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-700">JavaScript (fetch)</CardTitle>
                <CopyButton text={fetchExample} />
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 rounded-lg p-3 text-xs text-gray-700 font-mono overflow-x-auto">{fetchExample}</pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApiPage;
