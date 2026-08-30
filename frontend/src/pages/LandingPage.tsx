import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Download, Copy, CheckCheck,
  Sparkles, Check, Layout, Palette, Search, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import LogoMark from '@/components/LogoMark';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface PostConfig {
  headline: string;
  subtext: string;
  cta: string;
  bgColor: string;
  bgColor2: string;
  useGradient: boolean;
  textColor: string;
  accentColor: string;
  font: 'sans' | 'serif' | 'mono';
  brandName: string;
  showCta: boolean;
  showBrand: boolean;
}

interface Template {
  id: string;
  name: string;
  platform: string;
  platformColor: string;
  description: string;
  aspectW: number;
  aspectH: number;
  layout: 'centered' | 'bottom' | 'quote';
  defaults: PostConfig;
}

interface SectionItem {
  title: string;
  description: string;
  icon?: string;
}

interface LandingSection {
  id: string;
  type: 'hero' | 'features' | 'how_it_works' | 'cta_banner' | 'wizard';
  sortOrder: number;
  isActive: boolean;
  heading: string | null;
  subheading: string | null;
  items: SectionItem[];
  config: Record<string, string>;
}

// ── Fallback sections (mirrors seeder data) ───────────────────────────────────

const FALLBACK_SECTIONS: LandingSection[] = [
  {
    id: 'hero',
    type: 'hero',
    sortOrder: 0,
    isActive: true,
    heading: 'Generate Documents at Scale',
    subheading: 'Create reusable templates with dynamic fields. Preview documents live as you type, then generate professional PDFs — instantly, in bulk, or via API.',
    items: [],
    config: {
      ctaStart: '/signup',
      ctaSignIn: '/login',
      badge: 'v2.0.0 is live · Enterprise SSO · Live preview · API keys',
    },
  },
  {
    id: 'wizard',
    type: 'wizard',
    sortOrder: 1,
    isActive: true,
    heading: 'Create Your Social Media Post',
    subheading: 'Pick a template, customise it, and download.',
    items: [],
    config: {},
  },
  {
    id: 'features',
    type: 'features',
    sortOrder: 2,
    isActive: true,
    heading: 'Everything you need',
    subheading: 'A complete platform for document automation — from template creation to live preview, bulk generation, and email delivery.',
    items: [
      { title: 'Template Builder',     description: 'Build rich document templates with a WYSIWYG editor. Add sections, reorder them with drag-and-drop, and reuse sections across multiple templates.' },
      { title: 'Dynamic Fields',       description: 'Define typed fields (text, number, date, select, email, long text) and embed them as placeholders. Configure and fill them all from the Generate page.' },
      { title: 'Async PDF Generation', description: "Queue documents for async PDF generation. Get notified when they're ready and download them directly from the app — no waiting around." },
      { title: 'Batch Processing',     description: 'Upload an Excel spreadsheet and generate one PDF per row across any number of templates — in a single operation.' },
      { title: 'REST API',             description: 'Integrate document generation into your own workflows via a clean REST API. Full documentation is built into the app.' },
      { title: 'Multi-language UI',    description: 'The interface is available in English, Finnish and Swedish. Language preference is saved automatically.' },
      { title: 'Live PDF Preview',     description: 'See the document update in real time as you fill in each field. Unfilled placeholders are highlighted so nothing gets missed before generating.' },
      { title: 'API Key Access',       description: 'Generate and manage API keys for programmatic document generation. Integrate DDoc into any workflow without session-based authentication.' },
      { title: 'Email Delivery',       description: 'Send generated PDFs directly from the app to any email address. Powered by Kafka for reliable async delivery.' },
    ],
    config: {},
  },
  {
    id: 'how_it_works',
    type: 'how_it_works',
    sortOrder: 3,
    isActive: true,
    heading: 'How it works',
    subheading: 'From template to finished document in three simple steps.',
    items: [
      { title: 'Build a Template',  description: 'Create a template, add sections with your HTML content, and insert dynamic placeholders like #CLIENT_NAME# or #CONTRACT_DATE#.' },
      { title: 'Configure Fields',  description: 'Open the Generate page and go to the Fields tab. Register your tags with types and contexts — they instantly appear as typed form fields with a live preview alongside.' },
      { title: 'Generate & Share',  description: 'Fill in the field values, preview the result live, then click Generate. Documents are queued and processed asynchronously — download them or send directly via email.' },
    ],
    config: {},
  },
  {
    id: 'cta_banner',
    type: 'cta_banner',
    sortOrder: 4,
    isActive: true,
    heading: 'Ready to automate your documents?',
    subheading: 'Create your account and start generating professional PDFs today.',
    items: [],
    config: {
      buttonText: 'Create Free Account',
      buttonUrl: '/signup',
    },
  },
];

// ── Templates (for the wizard) ────────────────────────────────────────────────

const FALLBACK_TEMPLATES: Template[] = [
  {
    id: 'bold-gradient',
    name: 'Bold Gradient',
    platform: 'Instagram',
    platformColor: '#ec4899',
    description: '1:1 square with vibrant gradient background',
    aspectW: 1, aspectH: 1, layout: 'centered',
    defaults: {
      headline: 'Make an Impact Today', subtext: 'Share your story with the world and inspire others', cta: 'Learn More',
      bgColor: '#7c3aed', bgColor2: '#ec4899', useGradient: true, textColor: '#ffffff',
      accentColor: '#fbbf24', font: 'sans', brandName: 'YourBrand', showCta: true, showBrand: true,
    },
  },
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    platform: 'Instagram',
    platformColor: '#ec4899',
    description: '1:1 square with light, elegant white design',
    aspectW: 1, aspectH: 1, layout: 'centered',
    defaults: {
      headline: 'Less Is More', subtext: 'Powerful ideas expressed simply and clearly to your audience', cta: 'Read More',
      bgColor: '#f8fafc', bgColor2: '#e2e8f0', useGradient: false, textColor: '#1e293b',
      accentColor: '#6366f1', font: 'sans', brandName: 'YourBrand', showCta: true, showBrand: true,
    },
  },
  {
    id: 'tweet-card',
    name: 'Tweet Card',
    platform: 'Twitter / X',
    platformColor: '#0ea5e9',
    description: '16:9 wide card optimised for X / Twitter',
    aspectW: 16, aspectH: 9, layout: 'centered',
    defaults: {
      headline: 'Big Thoughts Deserve Big Visibility', subtext: 'Craft messages that resonate and get shared across the platform', cta: 'Follow Us',
      bgColor: '#0f172a', bgColor2: '#1e3a5f', useGradient: true, textColor: '#f8fafc',
      accentColor: '#38bdf8', font: 'sans', brandName: '@YourHandle', showCta: false, showBrand: true,
    },
  },
  {
    id: 'linkedin-pro',
    name: 'Professional',
    platform: 'LinkedIn',
    platformColor: '#2563eb',
    description: '1.91:1 banner for LinkedIn posts',
    aspectW: 1.91, aspectH: 1, layout: 'bottom',
    defaults: {
      headline: 'Thought Leadership Starts Here', subtext: 'Connect, share insights, and grow your professional network with content that matters to your industry.', cta: 'Connect Now',
      bgColor: '#1d4ed8', bgColor2: '#1e3a8a', useGradient: true, textColor: '#ffffff',
      accentColor: '#93c5fd', font: 'sans', brandName: 'Your Company', showCta: true, showBrand: true,
    },
  },
  {
    id: 'story-vibrant',
    name: 'Vibrant Story',
    platform: 'Instagram Story',
    platformColor: '#f97316',
    description: '9:16 vertical story with bold colours',
    aspectW: 9, aspectH: 16, layout: 'centered',
    defaults: {
      headline: 'Swipe Up!', subtext: "Exclusive content just for you. Don't miss today's limited offer.", cta: 'Tap Here',
      bgColor: '#f97316', bgColor2: '#ef4444', useGradient: true, textColor: '#ffffff',
      accentColor: '#fef08a', font: 'sans', brandName: 'YourBrand', showCta: true, showBrand: true,
    },
  },
  {
    id: 'quote-card',
    name: 'Quote Card',
    platform: 'All Platforms',
    platformColor: '#475569',
    description: '1:1 dark inspirational quote design',
    aspectW: 1, aspectH: 1, layout: 'quote',
    defaults: {
      headline: 'The best time to start was yesterday. The next best time is now.', subtext: 'Share wisdom that moves people',
      cta: 'Share This', bgColor: '#18181b', bgColor2: '#27272a', useGradient: false, textColor: '#fafafa',
      accentColor: '#a78bfa', font: 'serif', brandName: '— Author Name', showCta: false, showBrand: true,
    },
  },
];

// ── Post Preview ──────────────────────────────────────────────────────────────

const CANONICAL = 400;

interface PostPreviewProps {
  template: Template;
  config: PostConfig;
  displayWidth: number;
}

const PostPreview: React.FC<PostPreviewProps> = ({ template, config, displayWidth }) => {
  const canonicalH = Math.round(CANONICAL * template.aspectH / template.aspectW);
  const displayH = Math.round(displayWidth * template.aspectH / template.aspectW);
  const scale = displayWidth / CANONICAL;

  const bg = config.useGradient
    ? `linear-gradient(135deg, ${config.bgColor}, ${config.bgColor2})`
    : config.bgColor;

  const fontFamily =
    config.font === 'serif' ? 'Georgia, serif' :
    config.font === 'mono' ? 'monospace' :
    'system-ui, sans-serif';

  const inner: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0,
    width: CANONICAL, height: canonicalH,
    background: bg, overflow: 'hidden', fontFamily,
    transform: `scale(${scale})`, transformOrigin: 'top left',
  };

  let content: React.ReactNode;

  if (template.layout === 'quote') {
    content = (
      <>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: config.accentColor }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 50px', gap: 18 }}>
          <div style={{ fontSize: 60, lineHeight: 1, color: config.accentColor, fontWeight: 800 }}>"</div>
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.5, fontStyle: 'italic', color: config.textColor }}>
            {config.headline}
          </div>
          {config.showBrand && <div style={{ fontSize: 14, color: config.accentColor, fontWeight: 600 }}>{config.brandName}</div>}
          <div style={{ fontSize: 13, color: config.textColor, opacity: 0.5 }}>{config.subtext}</div>
        </div>
      </>
    );
  } else if (template.layout === 'bottom') {
    content = (
      <>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 40, gap: 12 }}>
          {config.showBrand && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: config.accentColor }}>{config.brandName}</div>}
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.25, color: config.textColor }}>{config.headline}</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: config.textColor, opacity: 0.75, maxWidth: '75%' }}>{config.subtext}</div>
          {config.showCta && (
            <div><span style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 4, background: config.accentColor, color: config.bgColor, fontSize: 12, fontWeight: 700 }}>{config.cta}</span></div>
          )}
        </div>
      </>
    );
  } else {
    content = (
      <>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 40, gap: 18 }}>
          {config.showBrand && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: config.accentColor }}>{config.brandName}</div>}
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2, color: config.textColor }}>{config.headline}</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: config.textColor, opacity: 0.8 }}>{config.subtext}</div>
          {config.showCta && (
            <div><span style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 999, background: config.accentColor, color: config.bgColor, fontSize: 13, fontWeight: 700 }}>{config.cta}</span></div>
          )}
        </div>
      </>
    );
  }

  return (
    <div style={{ width: displayWidth, height: displayH, position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      <div style={inner}>{content}</div>
    </div>
  );
};

// ── Wizard Step Indicator ─────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Choose Template', Icon: Layout },
  { num: 2, label: 'Customise', Icon: Palette },
  { num: 3, label: 'Download & Share', Icon: Download },
];

// ── Wizard Section ────────────────────────────────────────────────────────────

interface WizardSectionProps {
  section: LandingSection;
}

const PAGE_SIZE = 6;

const WizardSection: React.FC<WizardSectionProps> = ({ section }) => {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Template | null>(null);
  const [config, setConfig] = useState<PostConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(FALLBACK_TEMPLATES);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch('/api/landing-templates')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Template[]) => { if (Array.isArray(data) && data.length > 0) setTemplates(data); })
      .catch(() => { /* keep fallback */ });
  }, []);

  const platforms = useMemo(
    () => Array.from(new Set(templates.map(t => t.platform))).sort(),
    [templates],
  );

  const filtered = useMemo(() => {
    let result = templates;
    if (platformFilter) result = result.filter(t => t.platform === platformFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.platform.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [templates, search, platformFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageTemplates = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, platformFilter]);

  const pick = (tpl: Template) => {
    setSelected(tpl);
    setConfig({ ...tpl.defaults });
  };

  const patch = useCallback((p: Partial<PostConfig>) => setConfig(prev => prev ? { ...prev, ...p } : null), []);

  const next = () => setStep(s => Math.min(s + 1, 2));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleDownload = () => {
    if (!selected || !config) return;
    const bg = config.useGradient ? `linear-gradient(135deg,${config.bgColor},${config.bgColor2})` : config.bgColor;
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${config.headline}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .post{width:540px;height:${Math.round(540 * selected.aspectH / selected.aspectW)}px;background:${bg};border-radius:10px;position:relative;overflow:hidden;
    font-family:${config.font==='serif'?'Georgia,serif':config.font==='mono'?'monospace':'system-ui,sans-serif'};display:flex;flex-direction:column;justify-content:center;padding:48px;gap:18px}
    .brand{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${config.accentColor}}
    .headline{font-size:34px;font-weight:800;line-height:1.2;color:${config.textColor}}
    .subtext{font-size:15px;line-height:1.7;color:${config.textColor};opacity:.8}
    .cta{display:inline-block;padding:11px 26px;border-radius:999px;background:${config.accentColor};color:${config.bgColor};font-size:13px;font-weight:700;margin-top:6px}
    @media print{body{background:white}}</style></head>
    <body><div class="post">
    ${config.showBrand ? `<div class="brand">${config.brandName}</div>` : ''}
    <div class="headline">${config.headline}</div>
    <div class="subtext">${config.subtext}</div>
    ${config.showCta ? `<div><span class="cta">${config.cta}</span></div>` : ''}
    </div><script>window.onload=()=>window.print()<\/script></body></html>`);
    pw.document.close();
  };

  const handleCopy = async () => {
    if (!config) return;
    const text = [config.headline, config.subtext, config.showCta ? config.cta : ''].filter(Boolean).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setStep(0); setSelected(null); setConfig(null); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-10">
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300',
                step > idx ? 'bg-green-500 text-white' :
                step === idx ? 'bg-blue-900 text-white ring-4 ring-blue-200' :
                'bg-gray-200 text-gray-500'
              )}>
                {step > idx ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={cn('text-xs font-medium whitespace-nowrap', step === idx ? 'text-blue-900' : 'text-gray-400')}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('w-16 sm:w-24 h-0.5 mb-5 mx-1 transition-all duration-300', step > idx ? 'bg-green-500' : 'bg-gray-200')} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 0: Template Gallery ── */}
      {step === 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Choose a Template</h2>
          <p className="text-gray-500 text-center mb-6">Select the style and format that fits your platform</p>

          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Platform filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setPlatformFilter('')}
              className={cn('px-3 py-1 text-xs rounded-full border font-medium transition-colors',
                platformFilter === '' ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white')}>
              All
            </button>
            {platforms.map(p => (
              <button key={p}
                onClick={() => setPlatformFilter(prev => prev === p ? '' : p)}
                className={cn('px-3 py-1 text-xs rounded-full border font-medium transition-colors',
                  platformFilter === p ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white')}>
                {p}
              </button>
            ))}
          </div>

          {/* Grid */}
          {pageTemplates.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No templates match your search.</p>
              <button onClick={() => { setSearch(''); setPlatformFilter(''); }} className="mt-3 text-blue-700 text-xs underline">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pageTemplates.map(tpl => {
                const isSelected = selected?.id === tpl.id;
                const bg = tpl.defaults.useGradient
                  ? `linear-gradient(135deg, ${tpl.defaults.bgColor}, ${tpl.defaults.bgColor2})`
                  : tpl.defaults.bgColor;
                return (
                  <button key={tpl.id} onClick={() => pick(tpl)}
                    className={cn('text-left rounded-2xl border-2 p-1 transition-all duration-200 hover:shadow-lg focus:outline-none',
                      isSelected ? 'border-blue-600 shadow-blue-100 shadow-lg' : 'border-transparent hover:border-gray-200')}>
                    <div className="rounded-xl overflow-hidden relative"
                      style={{ aspectRatio: `${tpl.aspectW}/${tpl.aspectH}`, background: bg }}>
                      <div className="absolute inset-0 flex flex-col justify-center p-4 gap-2">
                        {tpl.defaults.showBrand && (
                          <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: tpl.defaults.accentColor }}>
                            {tpl.defaults.brandName}
                          </div>
                        )}
                        <div className="text-xs font-bold leading-tight" style={{ color: tpl.defaults.textColor }}>
                          {tpl.defaults.headline}
                        </div>
                        <div className="text-[9px] leading-relaxed opacity-75" style={{ color: tpl.defaults.textColor }}>
                          {tpl.defaults.subtext}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{tpl.name}</span>
                        <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: tpl.platformColor }}>
                          {tpl.platform}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{tpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 0))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)}
                    className={cn('w-7 h-7 text-xs rounded-lg border font-medium transition-colors',
                      page === i ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Customise ── */}
      {step === 1 && selected && config && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Customise Your Post</h2>
          <p className="text-gray-500 text-center mb-8">Adjust text, colours, and style to match your brand</p>
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Live preview */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2 lg:sticky lg:top-24">
              <PostPreview template={selected} config={config} displayWidth={280} />
              <span className="text-xs text-gray-400 font-medium">{selected.name} · {selected.platform}</span>
            </div>

            {/* Form */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Headline</Label>
                <Input value={config.headline} onChange={e => patch({ headline: e.target.value })} className="text-sm" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Subtext</Label>
                <Textarea value={config.subtext} onChange={e => patch({ subtext: e.target.value })} rows={3} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Brand / Handle</Label>
                <Input value={config.brandName} onChange={e => patch({ brandName: e.target.value })} className="text-sm" disabled={!config.showBrand} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">CTA Button Text</Label>
                <Input value={config.cta} onChange={e => patch({ cta: e.target.value })} className="text-sm" disabled={!config.showCta} />
              </div>

              {/* Background colour */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Background</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={config.bgColor} onChange={e => patch({ bgColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-200 p-0.5" />
                  {config.useGradient && (
                    <input type="color" value={config.bgColor2} onChange={e => patch({ bgColor2: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-200 p-0.5" />
                  )}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Switch checked={config.useGradient} onCheckedChange={v => patch({ useGradient: v })} />
                    <span className="text-xs text-gray-500">Gradient</span>
                  </div>
                </div>
              </div>

              {/* Text / accent */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Text · Accent</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={config.textColor} onChange={e => patch({ textColor: e.target.value })}
                    title="Text colour" className="w-10 h-10 rounded cursor-pointer border border-gray-200 p-0.5" />
                  <input type="color" value={config.accentColor} onChange={e => patch({ accentColor: e.target.value })}
                    title="Accent colour" className="w-10 h-10 rounded cursor-pointer border border-gray-200 p-0.5" />
                  <span className="text-xs text-gray-400 ml-1">text · accent</span>
                </div>
              </div>

              {/* Font */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Font Style</Label>
                <div className="flex gap-2">
                  {(['sans', 'serif', 'mono'] as const).map(f => (
                    <button key={f} onClick={() => patch({ font: f })}
                      className={cn('flex-1 py-2 text-xs rounded-lg border font-medium capitalize transition-colors',
                        config.font === f ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility toggles */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Show / Hide</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={config.showBrand} onCheckedChange={v => patch({ showBrand: v })} />
                    <span className="text-sm text-gray-600">Brand name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={config.showCta} onCheckedChange={v => patch({ showCta: v })} />
                    <span className="text-sm text-gray-600">CTA button</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Download & Share ── */}
      {step === 2 && selected && config && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Ready to Share!</h2>
          <p className="text-gray-500 text-center mb-8">Your post is ready — download it or copy the caption text.</p>
          <div className="flex flex-col items-center gap-8">
            <PostPreview template={selected} config={config} displayWidth={360} />

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button onClick={handleDownload} size="lg" className="flex-1 bg-blue-900 hover:bg-blue-800 text-white gap-2">
                <Download className="w-4 h-4" /> Download
              </Button>
              <Button onClick={handleCopy} variant="outline" size="lg" className="flex-1 gap-2">
                {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </Button>
            </div>

            {/* Caption preview */}
            <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Caption Preview</p>
              <p className="font-bold text-gray-900 mb-2">{config.headline}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{config.subtext}</p>
              {config.showCta && <p className="mt-3 text-blue-700 font-semibold text-sm">→ {config.cta}</p>}
              {config.showBrand && <p className="mt-3 text-gray-400 text-xs">{config.brandName}</p>}
            </div>

            <button onClick={reset} className="text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2 transition-colors">
              ← Create another post
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className={cn('flex mt-10', step === 0 ? 'justify-end' : 'justify-between')}>
        {step > 0 && (
          <Button variant="outline" onClick={back} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        {step < 2 && (
          <Button onClick={next} disabled={step === 0 && !selected}
            className="bg-blue-900 hover:bg-blue-800 text-white gap-2">
            {step === 0 ? 'Customise This Template' : 'Continue to Download'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Section renderers ─────────────────────────────────────────────────────────

const HeroSection: React.FC<{ section: LandingSection }> = ({ section }) => {
  const ctaStart = section.config.ctaStart ?? '/signup';
  const ctaSignIn = section.config.ctaSignIn ?? '/login';
  const badge = section.config.badge ?? '';

  return (
    <div className="bg-gradient-to-br from-blue-950 to-indigo-900 text-white text-center py-20 px-4">
      <div className="max-w-3xl mx-auto">
        {badge && (
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm text-indigo-200 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            {badge}
          </div>
        )}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
          {section.heading}
        </h1>
        {section.subheading && (
          <p className="text-indigo-200 max-w-2xl mx-auto text-lg mb-8 leading-relaxed">
            {section.subheading}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={ctaStart}>
            <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-8">
              Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to={ctaSignIn}>
            <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 border border-white/30 px-8">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const FeaturesSection: React.FC<{ section: LandingSection }> = ({ section }) => (
  <div className="py-20 px-4 bg-white">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{section.heading}</h2>
        {section.subheading && (
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">{section.subheading}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {section.items.map((item, i) => (
          <div key={i} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
            <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const HowItWorksSection: React.FC<{ section: LandingSection }> = ({ section }) => (
  <div className="py-20 px-4 bg-gray-50">
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{section.heading}</h2>
        {section.subheading && (
          <p className="text-gray-500 max-w-xl mx-auto text-lg">{section.subheading}</p>
        )}
      </div>
      <div className="flex flex-col gap-8">
        {section.items.map((item, i) => (
          <div key={i} className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
              {i + 1}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CtaBannerSection: React.FC<{ section: LandingSection }> = ({ section }) => {
  const buttonText = section.config.buttonText ?? 'Get Started';
  const buttonUrl = section.config.buttonUrl ?? '/signup';

  return (
    <div className="py-20 px-4 bg-gradient-to-br from-blue-950 to-indigo-900 text-white text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{section.heading}</h2>
        {section.subheading && (
          <p className="text-indigo-200 text-lg mb-8">{section.subheading}</p>
        )}
        <Link to={buttonUrl}>
          <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-10">
            {buttonText} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

// ── useSections hook ──────────────────────────────────────────────────────────

function useSections(locale: string): LandingSection[] {
  const [sections, setSections] = useState<LandingSection[]>(FALLBACK_SECTIONS);

  useEffect(() => {
    const lang = locale.split('-')[0];
    const safeLocale = ['en', 'fi', 'sv'].includes(lang) ? lang : 'en';
    const apiUrl = (import.meta.env.VITE_API_URL ?? '') + `/api/landing-sections?locale=${safeLocale}`;

    fetch(apiUrl)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: LandingSection[]) => {
        if (Array.isArray(data) && data.length > 0) setSections(data);
      })
      .catch(() => { /* keep fallback */ });
  }, [locale]);

  return sections;
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  const { i18n } = useTranslation();
  const sections = useSections(i18n.language);

  const sorted = [...sections]
    .filter(s => s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const renderSection = (section: LandingSection) => {
    switch (section.type) {
      case 'hero':
        return <HeroSection key={section.id} section={section} />;
      case 'wizard':
        return (
          <div key={section.id} className="bg-gray-50">
            {(section.heading || section.subheading) && (
              <div className="bg-gradient-to-br from-blue-950 to-indigo-900 text-white text-center py-14 px-4">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm text-indigo-200 mb-5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  Social Media Post Generator
                </div>
                {section.heading && (
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">{section.heading}</h1>
                )}
                {section.subheading && (
                  <p className="text-indigo-200 max-w-xl mx-auto text-lg">{section.subheading}</p>
                )}
              </div>
            )}
            <WizardSection section={section} />
          </div>
        );
      case 'features':
        return <FeaturesSection key={section.id} section={section} />;
      case 'how_it_works':
        return <HowItWorksSection key={section.id} section={section} />;
      case 'cta_banner':
        return <CtaBannerSection key={section.id} section={section} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="fixed inset-x-0 top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="font-bold text-blue-900 text-lg">DDoc</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1">
              {['en', 'fi', 'sv'].map(code => (
                <button key={code} onClick={() => i18n.changeLanguage(code)}
                  className={cn('text-xs px-2 py-1 rounded transition-colors uppercase',
                    i18n.language === code ? 'bg-blue-100 text-blue-900 font-semibold' : 'text-gray-500 hover:text-gray-900')}>
                  {code}
                </button>
              ))}
            </div>
            <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-blue-900 hover:bg-blue-800 text-white">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-16">
        {sorted.map(renderSection)}
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span>DDoc</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-blue-900 transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-blue-900 transition-colors">Get Started</Link>
            <Link to="/api" className="hover:text-blue-900 transition-colors">API</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
