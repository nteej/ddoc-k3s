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
  exportWidth: number;
  exportHeight: number;
  shareUrlTemplate: string | null;
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

// ── Fallback sections ─────────────────────────────────────────────────────────

const FALLBACK_SECTIONS: LandingSection[] = [
  {
    id: 'hero', type: 'hero', sortOrder: 0, isActive: true,
    heading: 'Generate Documents at Scale',
    subheading: 'Create reusable templates with dynamic fields. Preview documents live as you type, then generate professional PDFs — instantly, in bulk, or via API.',
    items: [],
    config: {
      ctaStart: '/signup', ctaSignIn: '/login',
      badge: 'v2.0.0 is live · Enterprise SSO · Live preview · API keys',
    },
  },
  {
    id: 'wizard', type: 'wizard', sortOrder: 1, isActive: true,
    heading: 'Create Your Social Media Post',
    subheading: 'Pick a template, customise it, and download.',
    items: [], config: {},
  },
  {
    id: 'features', type: 'features', sortOrder: 2, isActive: true,
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
    id: 'how_it_works', type: 'how_it_works', sortOrder: 3, isActive: true,
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
    id: 'cta_banner', type: 'cta_banner', sortOrder: 4, isActive: true,
    heading: 'Ready to automate your documents?',
    subheading: 'Create your account and start generating professional PDFs today.',
    items: [],
    config: { buttonText: 'Create Free Account', buttonUrl: '/signup' },
  },
];

// ── Fallback templates ────────────────────────────────────────────────────────

const FALLBACK_TEMPLATES: Template[] = [
  {
    id: 'bold-gradient', name: 'Bold Gradient', platform: 'Instagram', platformColor: '#ec4899',
    description: '1:1 square with vibrant gradient background',
    aspectW: 1, aspectH: 1, exportWidth: 1080, exportHeight: 1080, shareUrlTemplate: null,
    layout: 'centered',
    defaults: {
      headline: 'Make an Impact Today', subtext: 'Share your story with the world and inspire others', cta: 'Learn More',
      bgColor: '#7c3aed', bgColor2: '#ec4899', useGradient: true, textColor: '#ffffff',
      accentColor: '#fbbf24', font: 'sans', brandName: 'YourBrand', showCta: true, showBrand: true,
    },
  },
  {
    id: 'minimal-clean', name: 'Minimal Clean', platform: 'Instagram', platformColor: '#ec4899',
    description: '1:1 square with light, elegant white design',
    aspectW: 1, aspectH: 1, exportWidth: 1080, exportHeight: 1080, shareUrlTemplate: null,
    layout: 'centered',
    defaults: {
      headline: 'Less Is More', subtext: 'Powerful ideas expressed simply and clearly to your audience', cta: 'Read More',
      bgColor: '#f8fafc', bgColor2: '#e2e8f0', useGradient: false, textColor: '#1e293b',
      accentColor: '#6366f1', font: 'sans', brandName: 'YourBrand', showCta: true, showBrand: true,
    },
  },
  {
    id: 'tweet-card', name: 'Tweet Card', platform: 'Twitter / X', platformColor: '#0ea5e9',
    description: '16:9 wide card optimised for X / Twitter',
    aspectW: 16, aspectH: 9, exportWidth: 1200, exportHeight: 675,
    shareUrlTemplate: 'https://twitter.com/intent/tweet?text={text}',
    layout: 'centered',
    defaults: {
      headline: 'Big Thoughts Deserve Big Visibility', subtext: 'Craft messages that resonate and get shared across the platform', cta: 'Follow Us',
      bgColor: '#0f172a', bgColor2: '#1e3a5f', useGradient: true, textColor: '#f8fafc',
      accentColor: '#38bdf8', font: 'sans', brandName: '@YourHandle', showCta: false, showBrand: true,
    },
  },
  {
    id: 'linkedin-pro', name: 'Professional', platform: 'LinkedIn', platformColor: '#2563eb',
    description: '1.91:1 banner for LinkedIn posts',
    aspectW: 1.91, aspectH: 1, exportWidth: 1200, exportHeight: 628,
    shareUrlTemplate: 'https://www.linkedin.com/sharing/share-offsite/?url={url}',
    layout: 'bottom',
    defaults: {
      headline: 'Thought Leadership Starts Here', subtext: 'Connect, share insights, and grow your professional network with content that matters to your industry.', cta: 'Connect Now',
      bgColor: '#1d4ed8', bgColor2: '#1e3a8a', useGradient: true, textColor: '#ffffff',
      accentColor: '#93c5fd', font: 'sans', brandName: 'Your Company', showCta: true, showBrand: true,
    },
  },
  {
    id: 'story-vibrant', name: 'Vibrant Story', platform: 'Instagram Story', platformColor: '#f97316',
    description: '9:16 vertical story with bold colours',
    aspectW: 9, aspectH: 16, exportWidth: 1080, exportHeight: 1920, shareUrlTemplate: null,
    layout: 'centered',
    defaults: {
      headline: 'Swipe Up!', subtext: "Exclusive content just for you. Don't miss today's limited offer.", cta: 'Tap Here',
      bgColor: '#f97316', bgColor2: '#ef4444', useGradient: true, textColor: '#ffffff',
      accentColor: '#fef08a', font: 'sans', brandName: 'YourBrand', showCta: true, showBrand: true,
    },
  },
  {
    id: 'quote-card', name: 'Quote Card', platform: 'All Platforms', platformColor: '#475569',
    description: '1:1 dark inspirational quote design',
    aspectW: 1, aspectH: 1, exportWidth: 1080, exportHeight: 1080, shareUrlTemplate: null,
    layout: 'quote',
    defaults: {
      headline: 'The best time to start was yesterday. The next best time is now.', subtext: 'Share wisdom that moves people',
      cta: 'Share This', bgColor: '#18181b', bgColor2: '#27272a', useGradient: false, textColor: '#fafafa',
      accentColor: '#a78bfa', font: 'serif', brandName: '— Author Name', showCta: false, showBrand: true,
    },
  },
];

// ── Canvas helpers ────────────────────────────────────────────────────────────

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, cy); cy += lineHeight; }
  return cy;
}

function createPostBlob(template: Template, config: PostConfig): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const W = template.exportWidth ?? 1080;
    const H = template.exportHeight ?? 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('canvas unsupported')); return; }

    if (config.useGradient) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, config.bgColor);
      grad.addColorStop(1, config.bgColor2);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = config.bgColor;
    }
    ctx.fillRect(0, 0, W, H);

    const pad = W * 0.1;
    const fontFamily = config.font === 'serif' ? 'Georgia, serif'
      : config.font === 'mono' ? 'monospace'
      : 'system-ui, sans-serif';

    if (template.layout === 'quote') {
      ctx.fillStyle = config.accentColor;
      ctx.fillRect(0, 0, W * 0.012, H);
      ctx.font = `bold ${W * 0.15}px ${fontFamily}`;
      ctx.fillStyle = config.accentColor;
      ctx.fillText('"', pad, H * 0.22);
      ctx.font = `italic ${W * 0.055}px ${fontFamily}`;
      ctx.fillStyle = config.textColor;
      let cy = drawWrappedText(ctx, config.headline, pad, H * 0.35, W - pad * 2, W * 0.07);
      if (config.showBrand) {
        ctx.font = `bold ${W * 0.035}px ${fontFamily}`;
        ctx.fillStyle = config.accentColor;
        ctx.fillText(config.brandName, pad, cy + W * 0.03);
      }
    } else if (template.layout === 'bottom') {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(W * 0.45, 0, W, H);
      const startY = H * 0.6;
      let cy = startY;
      if (config.showBrand) {
        ctx.font = `bold ${W * 0.025}px ${fontFamily}`;
        ctx.fillStyle = config.accentColor;
        ctx.fillText(config.brandName.toUpperCase(), pad, cy); cy += W * 0.04;
      }
      ctx.font = `bold ${W * 0.07}px ${fontFamily}`;
      ctx.fillStyle = config.textColor;
      cy = drawWrappedText(ctx, config.headline, pad, cy, W * 0.75, W * 0.085);
      ctx.font = `${W * 0.035}px ${fontFamily}`;
      ctx.globalAlpha = 0.75;
      cy = drawWrappedText(ctx, config.subtext, pad, cy + W * 0.01, W * 0.7, W * 0.045);
      ctx.globalAlpha = 1;
      if (config.showCta) {
        const ctaPad = W * 0.04;
        ctx.fillStyle = config.accentColor;
        ctx.roundRect(pad, cy + W * 0.02, ctx.measureText(config.cta).width + ctaPad * 2, W * 0.06, W * 0.01);
        ctx.fill();
        ctx.font = `bold ${W * 0.028}px ${fontFamily}`;
        ctx.fillStyle = config.bgColor;
        ctx.fillText(config.cta, pad + ctaPad, cy + W * 0.02 + W * 0.042);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.arc(W * 1.1, -H * 0.1, W * 0.5, 0, Math.PI * 2);
      ctx.fill();
      let cy = H * 0.25;
      if (config.showBrand) {
        ctx.font = `bold ${W * 0.025}px ${fontFamily}`;
        ctx.fillStyle = config.accentColor;
        ctx.fillText(config.brandName.toUpperCase(), pad, cy); cy += W * 0.05;
      }
      ctx.font = `bold ${W * 0.075}px ${fontFamily}`;
      ctx.fillStyle = config.textColor;
      cy = drawWrappedText(ctx, config.headline, pad, cy, W - pad * 2, W * 0.09);
      ctx.font = `${W * 0.035}px ${fontFamily}`;
      ctx.globalAlpha = 0.8;
      cy = drawWrappedText(ctx, config.subtext, pad, cy + W * 0.01, W - pad * 2, W * 0.05);
      ctx.globalAlpha = 1;
      if (config.showCta) {
        const ctaPad = W * 0.05;
        const ctaW = ctx.measureText(config.cta).width + ctaPad * 2;
        const ctaH = W * 0.065;
        ctx.fillStyle = config.accentColor;
        ctx.beginPath();
        ctx.roundRect(pad, cy + W * 0.02, ctaW, ctaH, ctaH / 2);
        ctx.fill();
        ctx.font = `bold ${W * 0.03}px ${fontFamily}`;
        ctx.fillStyle = config.bgColor;
        ctx.fillText(config.cta, pad + ctaPad, cy + W * 0.02 + ctaH * 0.65);
      }
    }

    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
  });
}

async function downloadPostAsImage(template: Template, config: PostConfig): Promise<void> {
  const blob = await createPostBlob(template, config);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.png`;
  a.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Mockup frame components ───────────────────────────────────────────────────

const PhoneFrame: React.FC<{ children: React.ReactNode; width?: number; dark?: boolean }> = ({
  children, width = 300, dark = false,
}) => (
  <div style={{
    width, flexShrink: 0,
    background: dark ? '#0a0a0a' : '#fff',
    borderRadius: 40,
    border: `7px solid ${dark ? '#222' : '#c8cbd0'}`,
    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
    overflow: 'hidden',
  }}>
    {/* Status bar */}
    <div style={{
      height: 30, background: dark ? '#0a0a0a' : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 18px', fontSize: 9, fontWeight: 700,
      color: dark ? '#fff' : '#000',
    }}>
      <span>9:41</span>
      <div style={{ width: 64, height: 16, background: dark ? '#111' : '#e5e7eb', borderRadius: 8 }} />
      <span style={{ letterSpacing: -0.5 }}>●●● 100%</span>
    </div>
    {/* Content */}
    <div style={{ maxHeight: 540, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
    {/* Home indicator */}
    <div style={{ height: 28, background: dark ? '#0a0a0a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 90, height: 4, background: dark ? '#333' : '#d1d5db', borderRadius: 4 }} />
    </div>
  </div>
);

const BrowserFrame: React.FC<{ url: string; children: React.ReactNode; width?: number }> = ({
  url, children, width = 520,
}) => (
  <div style={{
    width, background: '#f8f9fa', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 12px 48px rgba(0,0,0,0.22)', border: '1px solid #dadce0',
  }}>
    {/* Chrome toolbar */}
    <div style={{
      background: '#ffffff', padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: '1px solid #e8eaed',
    }}>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {['#ff5f57', '#ffbd2e', '#28c840'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{
        flex: 1, background: '#f1f3f4', borderRadius: 20,
        padding: '4px 10px', fontSize: 10, color: '#5f6368',
        display: 'flex', alignItems: 'center', gap: 5, minWidth: 0,
      }}>
        <span>🔒</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
      </div>
    </div>
    <div style={{ maxHeight: 480, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
  </div>
);

// ── Social Mockup ─────────────────────────────────────────────────────────────

type MockupView = 'mobile' | 'desktop';

interface SocialMockupProps {
  template: Template;
  config: PostConfig;
  view: MockupView;
}

const SocialMockup: React.FC<SocialMockupProps> = ({ template, config, view }) => {
  const plat = template.platform.toLowerCase();
  const isInstagram = plat.includes('instagram') && !plat.includes('story');
  const isStory = plat.includes('story');
  const isTwitter = plat.includes('twitter') || plat === 'x';
  const isLinkedIn = plat.includes('linkedin');

  const bg = config.useGradient
    ? `linear-gradient(135deg, ${config.bgColor}, ${config.bgColor2})`
    : config.bgColor;

  const handle = (config.brandName || 'yourbrand').toLowerCase().replace(/\s+/g, '');

  // ── Instagram Story ──────────────────────────────────────────────────────────
  if (isStory) {
    const storyW = view === 'mobile' ? 220 : 260;
    return (
      <PhoneFrame width={storyW + 28} dark>
        <div style={{ position: 'relative' }}>
          {/* Story image full-bleed */}
          <div style={{ width: '100%', aspectRatio: '9/16', background: bg, position: 'relative', overflow: 'hidden' }}>
            <PostPreview template={template} config={config} displayWidth={storyW + 14} />
            {/* Top overlay: progress + avatar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 10px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)',
            }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ flex: 1, height: 2, background: i === 1 ? '#fff' : 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #fff', background: `linear-gradient(45deg,${config.bgColor2},${config.accentColor})`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{config.brandName || 'brand'}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>3h</span>
                <span style={{ marginLeft: 'auto', fontSize: 15, color: '#fff' }}>✕</span>
              </div>
            </div>
            {/* Bottom reply bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 999, padding: '5px 10px', fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>
                Reply to {config.brandName || 'brand'}…
              </div>
              <span style={{ fontSize: 18 }}>❤</span>
              <span style={{ fontSize: 18 }}>↗</span>
            </div>
          </div>
        </div>
        {/* Bottom nav */}
        <div style={{ background: '#000', display: 'flex', justifyContent: 'space-around', padding: '8px 0', fontSize: 18 }}>
          {['🏠', '🔍', '🎬', '🛒', '👤'].map(i => <span key={i}>{i}</span>)}
        </div>
      </PhoneFrame>
    );
  }

  // ── Instagram Post ───────────────────────────────────────────────────────────
  if (isInstagram) {
    if (view === 'mobile') {
      const phoneW = 300;
      return (
        <PhoneFrame width={phoneW}>
          {/* App bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #efefef' }}>
            <div style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', fontFamily: 'serif', letterSpacing: -0.5 }}>Instagram</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 18 }}>
              <span>➕</span><span>❤</span><span>✈</span>
            </div>
          </div>
          {/* Stories row */}
          <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #efefef', overflowX: 'hidden' }}>
            {['Your story', handle, 'friend1', 'friend2'].map((n, i) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', padding: 2, background: i === 0 ? '#e5e7eb' : 'linear-gradient(45deg,#f09433,#dc2743,#bc1888)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: i === 0 ? '#f9fafb' : `hsl(${i * 80},55%,60%)`, border: '2px solid white' }} />
                </div>
                <span style={{ fontSize: 9, color: '#262626', maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
              </div>
            ))}
          </div>
          {/* Post */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(45deg,${config.bgColor2},${config.accentColor})`, border: '2px solid #e5e7eb', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#262626' }}>{handle}</div>
                <div style={{ fontSize: 9, color: '#8e8e8e' }}>Sponsored · <span style={{ color: '#0095f6' }}>Follow</span></div>
              </div>
              <span style={{ fontSize: 16, color: '#262626' }}>···</span>
            </div>
            <div style={{ width: '100%', aspectRatio: `${template.aspectW}/${template.aspectH}`, overflow: 'hidden', position: 'relative' }}>
              <PostPreview template={template} config={config} displayWidth={phoneW - 14} />
            </div>
            <div style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>♡</span>
                <span style={{ fontSize: 20 }}>💬</span>
                <span style={{ fontSize: 20 }}>↗</span>
                <span style={{ fontSize: 20, marginLeft: 'auto' }}>🔖</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#262626', marginBottom: 3 }}>1,234 likes</div>
              <div style={{ fontSize: 11, color: '#262626' }}>
                <strong>{handle}</strong> <span style={{ color: '#8e8e8e' }}>{config.headline}</span>
              </div>
              <div style={{ fontSize: 10, color: '#8e8e8e', marginTop: 2 }}>View all 56 comments</div>
            </div>
          </div>
          {/* Bottom nav */}
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0', borderTop: '1px solid #efefef', fontSize: 20 }}>
            {['🏠', '🔍', '➕', '🎬', '👤'].map(i => <span key={i}>{i}</span>)}
          </div>
        </PhoneFrame>
      );
    }
    // Desktop Instagram
    return (
      <BrowserFrame url={`instagram.com/p/abc123`}>
        {/* Top nav */}
        <div style={{ background: '#fff', borderBottom: '1px solid #dbdbdb', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', fontFamily: 'serif' }}>Instagram</div>
          <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#8e8e8e', display: 'flex', alignItems: 'center', gap: 5 }}>🔍 Search</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 18 }}>
            <span>🏠</span><span>🎬</span><span>➕</span><span>❤</span><span>👤</span>
          </div>
        </div>
        {/* Two-column feed */}
        <div style={{ display: 'flex', gap: 20, padding: '16px', justifyContent: 'center', background: '#fafafa' }}>
          {/* Main post */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ background: '#fff', border: '1px solid #dbdbdb', borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(45deg,${config.bgColor2},${config.accentColor})`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{handle}</div>
                  <div style={{ fontSize: 9, color: '#8e8e8e' }}>Sponsored</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 14, color: '#262626' }}>···</span>
              </div>
              <div style={{ width: '100%', aspectRatio: `${template.aspectW}/${template.aspectH}`, overflow: 'hidden' }}>
                <PostPreview template={template} config={config} displayWidth={340} />
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 16 }}>
                  <span>♡</span><span>💬</span><span>↗</span><span style={{ marginLeft: 'auto' }}>🔖</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>1,234 likes</div>
                <div style={{ fontSize: 11, color: '#262626', marginTop: 2 }}>
                  <strong>{handle}</strong> {config.headline}
                </div>
              </div>
            </div>
          </div>
          {/* Right sidebar */}
          <div style={{ width: 130, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(45deg,${config.bgColor2},${config.accentColor})` }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700 }}>{handle}</div>
                <div style={{ fontSize: 9, color: '#8e8e8e' }}>{config.brandName || 'Your Brand'}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8e8e8e', marginBottom: 8 }}>Suggested for you</div>
            {['user_one', 'cool_brand', 'creator99'].map(u => (
              <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e5e7eb', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u}</div>
                <div style={{ fontSize: 9, color: '#0095f6', fontWeight: 700, flexShrink: 0 }}>Follow</div>
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    );
  }

  // ── Twitter / X ──────────────────────────────────────────────────────────────
  if (isTwitter) {
    if (view === 'mobile') {
      const phoneW = 300;
      return (
        <PhoneFrame width={phoneW} dark>
          {/* App header */}
          <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderBottom: '1px solid #2f3336' }}>
            <div style={{ fontSize: 20, color: '#fff', fontWeight: 900 }}>𝕏</div>
          </div>
          {/* Tweet */}
          <div style={{ background: '#000', padding: '12px 14px', borderBottom: '1px solid #2f3336' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1d9bf0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>𝕏</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e7e9ea' }}>{config.brandName || 'Your Brand'}</span>
                  <span style={{ fontSize: 11, color: '#71767b' }}>@{handle} · 3h</span>
                </div>
                <div style={{ fontSize: 12, color: '#e7e9ea', lineHeight: 1.5, marginBottom: 8 }}>{config.headline}</div>
                <div style={{ width: '100%', aspectRatio: `${template.aspectW}/${template.aspectH}`, borderRadius: 12, overflow: 'hidden' }}>
                  <PostPreview template={template} config={config} displayWidth={phoneW - 74} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: '#71767b', fontSize: 11 }}>
                  <span>💬 12</span><span>🔁 48</span><span>♡ 284</span><span>📊</span><span>📤</span>
                </div>
              </div>
            </div>
          </div>
          {/* Placeholder tweet */}
          <div style={{ background: '#000', padding: '12px 14px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2f3336', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '55%', height: 8, background: '#2f3336', borderRadius: 4, marginBottom: 6 }} />
              <div style={{ width: '85%', height: 6, background: '#2f3336', borderRadius: 4, marginBottom: 4 }} />
              <div style={{ width: '65%', height: 6, background: '#2f3336', borderRadius: 4 }} />
            </div>
          </div>
          {/* Bottom nav */}
          <div style={{ background: '#000', borderTop: '1px solid #2f3336', display: 'flex', justifyContent: 'space-around', padding: '10px 0', fontSize: 18, color: '#e7e9ea' }}>
            {['🏠', '🔍', '🔔', '✉'].map(i => <span key={i}>{i}</span>)}
          </div>
        </PhoneFrame>
      );
    }
    // Desktop X
    return (
      <BrowserFrame url="x.com/home">
        <div style={{ display: 'flex', background: '#000', minHeight: 400 }}>
          {/* Left nav */}
          <div style={{ width: 68, padding: '12px', display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0, borderRight: '1px solid #2f3336' }}>
            <div style={{ fontSize: 22, color: '#fff', fontWeight: 900 }}>𝕏</div>
            {['🏠', '🔍', '🔔', '✉', '👤'].map(i => (
              <div key={i} style={{ fontSize: 18, color: '#e7e9ea' }}>{i}</div>
            ))}
            <div style={{ padding: '8px 10px', background: '#1d9bf0', borderRadius: 999, color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'center', marginTop: 4 }}>Post</div>
          </div>
          {/* Feed */}
          <div style={{ flex: 1, borderRight: '1px solid #2f3336' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #2f3336', fontSize: 13, fontWeight: 700, color: '#e7e9ea' }}>For You</div>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1d9bf0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>𝕏</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#e7e9ea', marginBottom: 4 }}>
                  <strong>{config.brandName || 'Your Brand'}</strong>
                  <span style={{ color: '#71767b', marginLeft: 4 }}>@{handle} · 3h</span>
                </div>
                <div style={{ fontSize: 12, color: '#e7e9ea', lineHeight: 1.5, marginBottom: 8 }}>{config.headline}</div>
                <div style={{ aspectRatio: `${template.aspectW}/${template.aspectH}`, borderRadius: 12, overflow: 'hidden' }}>
                  <PostPreview template={template} config={config} displayWidth={300} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#71767b', fontSize: 11 }}>
                  <span>💬 12</span><span>🔁 48</span><span>♡ 284</span><span>📊 1.2K</span><span>📤</span>
                </div>
              </div>
            </div>
            {[0, 1].map(i => (
              <div key={i} style={{ padding: '12px 14px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2f3336', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '50%', height: 8, background: '#2f3336', borderRadius: 4, marginBottom: 6 }} />
                  <div style={{ width: '85%', height: 6, background: '#2f3336', borderRadius: 4, marginBottom: 4 }} />
                  <div style={{ width: '65%', height: 6, background: '#2f3336', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          {/* Right sidebar */}
          <div style={{ width: 130, padding: '12px', flexShrink: 0 }}>
            <div style={{ background: '#16181c', borderRadius: 12, padding: '10px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e7e9ea', marginBottom: 8 }}>What's happening</div>
              {['Tech · Trending', 'Sports · Top', 'Business · Hot'].map(t => (
                <div key={t} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#71767b' }}>{t.split('·')[0].trim()}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#e7e9ea' }}>{t.split('·')[1].trim()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BrowserFrame>
    );
  }

  // ── LinkedIn ─────────────────────────────────────────────────────────────────
  if (isLinkedIn) {
    if (view === 'mobile') {
      const phoneW = 300;
      return (
        <PhoneFrame width={phoneW}>
          {/* App header */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0a66c2', fontStyle: 'italic' }}>in</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 18 }}>
              <span>🔍</span><span>🔔</span><span>✉</span>
            </div>
          </div>
          {/* Post */}
          <div style={{ background: '#fff' }}>
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0a66c2', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>in</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#000' }}>{config.brandName || 'Your Company'}</div>
                <div style={{ fontSize: 9, color: '#666' }}>10,482 followers · Promoted · 🌐</div>
                <div style={{ fontSize: 9, color: '#0a66c2', fontWeight: 600 }}>Follow +</div>
              </div>
              <span style={{ fontSize: 16 }}>···</span>
            </div>
            <div style={{ padding: '0 12px 8px', fontSize: 11, color: '#333', lineHeight: 1.5 }}>{config.headline}</div>
            <div style={{ width: '100%', aspectRatio: `${template.aspectW}/${template.aspectH}`, overflow: 'hidden' }}>
              <PostPreview template={template} config={config} displayWidth={phoneW - 14} />
            </div>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: '#666' }}>👍❤ 1,234</span>
              <span style={{ fontSize: 9, color: '#666' }}>42 comments · 18 reposts</span>
            </div>
            <div style={{ padding: '4px 0', display: 'flex', justifyContent: 'space-around' }}>
              {[['👍', 'Like'], ['💬', 'Comment'], ['🔁', 'Repost'], ['➤', 'Send']].map(([icon, label]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 9, color: '#666', gap: 2 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Bottom nav */}
          <div style={{ borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-around', padding: '8px 0', fontSize: 18 }}>
            {['🏠', '🔍', '➕', '🔔', '👤'].map(i => <span key={i}>{i}</span>)}
          </div>
        </PhoneFrame>
      );
    }
    // Desktop LinkedIn
    return (
      <BrowserFrame url="linkedin.com/feed">
        {/* Top nav */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24, color: '#0a66c2', fontWeight: 900, fontStyle: 'italic', flexShrink: 0 }}>in</div>
          <div style={{ background: '#f3f2ef', borderRadius: 4, padding: '5px 10px', fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 5, flex: 1, maxWidth: 180 }}>
            🔍 Search
          </div>
          <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', fontSize: 18 }}>
            <span>🏠</span><span>👥</span><span>🔔</span><span>✉</span>
          </div>
        </div>
        {/* Feed */}
        <div style={{ display: 'flex', background: '#f3f2ef', gap: 10, padding: '12px', justifyContent: 'center' }}>
          {/* Profile card */}
          <div style={{ width: 110, flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0a66c2', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>in</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#000' }}>{config.brandName || 'Your Name'}</div>
              <div style={{ fontSize: 8, color: '#666', marginTop: 2 }}>Your headline</div>
              <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                <div style={{ fontSize: 9, color: '#666' }}>Profile viewers</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0a66c2' }}>142</div>
              </div>
            </div>
          </div>
          {/* Main feed */}
          <div style={{ width: 290, flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0a66c2', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>in</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#000' }}>{config.brandName || 'Company'}</div>
                  <div style={{ fontSize: 9, color: '#666' }}>10,482 followers · Promoted · 🌐</div>
                </div>
              </div>
              <div style={{ padding: '0 12px 8px', fontSize: 11, color: '#333' }}>{config.headline}</div>
              <div style={{ aspectRatio: `${template.aspectW}/${template.aspectH}`, overflow: 'hidden' }}>
                <PostPreview template={template} config={config} displayWidth={290} />
              </div>
              <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 16 }}>
                {['👍 Like', '💬 Comment', '🔁 Repost', '➤ Send'].map(a => (
                  <div key={a} style={{ fontSize: 9, color: '#666' }}>{a}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </BrowserFrame>
    );
  }

  // ── Generic / All Platforms ──────────────────────────────────────────────────
  const postW = view === 'mobile' ? 260 : 380;
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 16, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <PostPreview template={template} config={config} displayWidth={postW} />
      <div style={{ fontSize: 11, color: '#64748b' }}>{template.exportWidth}×{template.exportHeight}px · {template.name}</div>
    </div>
  );
};

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
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.5, fontStyle: 'italic', color: config.textColor }}>{config.headline}</div>
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

// ── Platform share label ──────────────────────────────────────────────────────

function shareLabelForPlatform(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes('instagram') && p.includes('story')) return 'Share to Instagram Story';
  if (p.includes('instagram')) return 'Share to Instagram';
  if (p.includes('twitter') || p === 'x') return 'Post on X';
  if (p.includes('linkedin')) return 'Share on LinkedIn';
  return 'Share';
}

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(FALLBACK_TEMPLATES);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(0);
  const [mockupView, setMockupView] = useState<MockupView>('mobile');

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

  const pick = (tpl: Template) => { setSelected(tpl); setConfig({ ...tpl.defaults }); };
  const patch = useCallback((p: Partial<PostConfig>) => setConfig(prev => prev ? { ...prev, ...p } : null), []);
  const next = () => setStep(s => Math.min(s + 1, 2));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleDownload = async () => {
    if (!selected || !config || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadPostAsImage(selected, config);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!selected || !config || isSharing) return;
    setIsSharing(true);
    try {
      const plat = selected.platform.toLowerCase();
      const isInstagramLike = plat.includes('instagram');

      if (isInstagramLike) {
        // Try native file sharing first (works on mobile), then fall back to download
        try {
          const blob = await createPostBlob(selected, config);
          const file = new File([blob], `${selected.name.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: config.headline, text: config.subtext });
            return;
          }
        } catch { /* fall through */ }
        // Desktop: download the image so user can share manually
        await downloadPostAsImage(selected, config);
        return;
      }

      const text = encodeURIComponent([config.headline, config.subtext, config.showCta ? config.cta : ''].filter(Boolean).join('\n\n'));
      const url = encodeURIComponent(window.location.href);

      if (selected.shareUrlTemplate) {
        const shareUrl = selected.shareUrlTemplate.replace('{text}', text).replace('{url}', url);
        window.open(shareUrl, '_blank', 'noopener,width=600,height=500');
      } else if (navigator.share) {
        await navigator.share({ title: config.headline, text: `${config.headline}\n\n${config.subtext}` });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!config) return;
    const text = [config.headline, config.subtext, config.showCta ? config.cta : ''].filter(Boolean).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setStep(0); setSelected(null); setConfig(null); };

  // View switcher pill (reused in step 1 and step 2)
  const ViewSwitcher = (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {(['mobile', 'desktop'] as MockupView[]).map(v => (
        <button key={v} onClick={() => setMockupView(v)}
          className={cn('px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors',
            mockupView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          {v}
        </button>
      ))}
    </div>
  );

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
                'bg-gray-200 text-gray-500',
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

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text" value={search}
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

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setPlatformFilter('')}
              className={cn('px-3 py-1 text-xs rounded-full border font-medium transition-colors',
                platformFilter === '' ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white')}>
              All
            </button>
            {platforms.map(p => (
              <button key={p} onClick={() => setPlatformFilter(prev => prev === p ? '' : p)}
                className={cn('px-3 py-1 text-xs rounded-full border font-medium transition-colors',
                  platformFilter === p ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white')}>
                {p}
              </button>
            ))}
          </div>

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
                const tplBg = tpl.defaults.useGradient
                  ? `linear-gradient(135deg, ${tpl.defaults.bgColor}, ${tpl.defaults.bgColor2})`
                  : tpl.defaults.bgColor;
                return (
                  <button key={tpl.id} onClick={() => pick(tpl)}
                    className={cn('text-left rounded-2xl border-2 p-1 transition-all duration-200 hover:shadow-lg focus:outline-none',
                      isSelected ? 'border-blue-600 shadow-blue-100 shadow-lg' : 'border-transparent hover:border-gray-200')}>
                    <div className="rounded-xl overflow-hidden relative"
                      style={{ aspectRatio: `${tpl.aspectW}/${tpl.aspectH}`, background: tplBg }}>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}
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
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} disabled={page >= totalPages - 1}
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
            {/* Live preview — sticky */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3 lg:sticky lg:top-24">
              {ViewSwitcher}
              <SocialMockup template={selected} config={config} view={mockupView} />
              <span className="text-xs text-gray-400 font-medium">
                {selected.name} · {selected.platform} · {selected.exportWidth}×{selected.exportHeight}px
              </span>
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
          <p className="text-gray-500 text-center mb-8">
            Download as a {selected.exportWidth}×{selected.exportHeight}px PNG or share directly to {selected.platform}.
          </p>
          <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">
            {/* Mockup */}
            <div className="flex flex-col items-center gap-3">
              {ViewSwitcher}
              <SocialMockup template={selected} config={config} view={mockupView} />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-5 w-full max-w-xs">
              <div className="flex flex-col gap-3">
                <Button onClick={handleDownload} disabled={isDownloading} size="lg"
                  className="bg-blue-900 hover:bg-blue-800 text-white gap-2 w-full disabled:opacity-60">
                  <Download className="w-4 h-4" />
                  {isDownloading ? 'Generating…' : `Download PNG (${selected.exportWidth}×${selected.exportHeight})`}
                </Button>

                <Button onClick={handleCopy} variant="outline" size="lg" className="gap-2 w-full">
                  {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Caption Text'}
                </Button>

                <Button onClick={handleShare} disabled={isSharing} variant="outline" size="lg"
                  className="gap-2 w-full disabled:opacity-60"
                  style={{ borderColor: selected.platformColor, color: selected.platformColor }}>
                  {isSharing ? 'Opening…' : shareLabelForPlatform(selected.platform)}
                </Button>
              </div>

              {/* Caption preview */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Caption</p>
                <p className="font-bold text-gray-900 mb-2">{config.headline}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{config.subtext}</p>
                {config.showCta && <p className="mt-3 text-blue-700 font-semibold text-sm">→ {config.cta}</p>}
                {config.showBrand && <p className="mt-3 text-gray-400 text-xs">{config.brandName}</p>}
              </div>

              <button onClick={reset} className="text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2 transition-colors text-center">
                ← Create another post
              </button>
            </div>
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
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight">{section.heading}</h1>
        {section.subheading && (
          <p className="text-indigo-200 max-w-2xl mx-auto text-lg mb-8 leading-relaxed">{section.subheading}</p>
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
        {section.subheading && <p className="text-gray-500 max-w-2xl mx-auto text-lg">{section.subheading}</p>}
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
        {section.subheading && <p className="text-gray-500 max-w-xl mx-auto text-lg">{section.subheading}</p>}
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
        {section.subheading && <p className="text-indigo-200 text-lg mb-8">{section.subheading}</p>}
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
      .then((data: LandingSection[]) => { if (Array.isArray(data) && data.length > 0) setSections(data); })
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
