import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Tag, Zap, FileSpreadsheet, Code2, Globe,
  ArrowRight, CheckCircle, ChevronRight, Eye, Key, Mail,
  Shield, ScanSearch, UserCheck, LogOut, X, Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import LogoMark from '@/components/LogoMark';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fi', label: 'FI' },
  { code: 'sv', label: 'SV' },
];

const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [showBanner, setShowBanner] = useState(true);

  const whatsNewItems = [
    { icon: <Shield className="w-5 h-5" />, title: t('landing.whatsNewItem1Title'), desc: t('landing.whatsNewItem1Desc'), color: 'bg-indigo-500' },
    { icon: <ScanSearch className="w-5 h-5" />, title: t('landing.whatsNewItem2Title'), desc: t('landing.whatsNewItem2Desc'), color: 'bg-blue-500' },
    { icon: <UserCheck className="w-5 h-5" />, title: t('landing.whatsNewItem3Title'), desc: t('landing.whatsNewItem3Desc'), color: 'bg-teal-500' },
    { icon: <LogOut className="w-5 h-5" />, title: t('landing.whatsNewItem4Title'), desc: t('landing.whatsNewItem4Desc'), color: 'bg-violet-500' },
  ];

  const features = [
    { icon: <FileText className="w-6 h-6" />, title: t('landing.feat1Title'), desc: t('landing.feat1Desc'), bg: 'bg-blue-900' },
    { icon: <Eye className="w-6 h-6" />, title: t('landing.feat7Title'), desc: t('landing.feat7Desc'), bg: 'bg-indigo-600' },
    { icon: <Tag className="w-6 h-6" />, title: t('landing.feat2Title'), desc: t('landing.feat2Desc'), bg: 'bg-sky-600' },
    { icon: <Zap className="w-6 h-6" />, title: t('landing.feat3Title'), desc: t('landing.feat3Desc'), bg: 'bg-orange-500' },
    { icon: <Key className="w-6 h-6" />, title: t('landing.feat8Title'), desc: t('landing.feat8Desc'), bg: 'bg-amber-600' },
    { icon: <Mail className="w-6 h-6" />, title: t('landing.feat9Title'), desc: t('landing.feat9Desc'), bg: 'bg-rose-600' },
    { icon: <FileSpreadsheet className="w-6 h-6" />, title: t('landing.feat4Title'), desc: t('landing.feat4Desc'), bg: 'bg-green-600' },
    { icon: <Code2 className="w-6 h-6" />, title: t('landing.feat5Title'), desc: t('landing.feat5Desc'), bg: 'bg-blue-700' },
    { icon: <Globe className="w-6 h-6" />, title: t('landing.feat6Title'), desc: t('landing.feat6Desc'), bg: 'bg-teal-600' },
  ];

  const steps = [
    { num: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { num: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { num: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Release announcement banner ── */}
      {showBanner && (
        <div className="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <div className="max-w-6xl mx-auto px-4 h-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-yellow-300" />
              <span className="truncate">{t('landing.releaseBanner')}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="#whats-new"
                onClick={() => {/* smooth scroll handled by href */}}
                className="text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2 whitespace-nowrap"
              >
                {t('landing.releaseBannerCta')} ↓
              </a>
              <button
                onClick={() => setShowBanner(false)}
                className="text-white/70 hover:text-white transition-colors p-0.5 rounded"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav
        className={`fixed inset-x-0 z-40 bg-white border-b border-gray-200 shadow-sm transition-all duration-200 ${showBanner ? 'top-10' : 'top-0'}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="font-bold text-blue-900 text-lg">DDoc</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <div className="hidden sm:flex items-center gap-1">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-blue-100 text-blue-900 font-semibold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-blue-900 hover:bg-blue-50">
                {t('landing.ctaSignIn')}
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-blue-900 hover:bg-blue-800 text-white">
                {t('landing.ctaStart')}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={`pb-24 px-4 sm:px-6 text-center bg-blue-50 transition-all duration-200 ${showBanner ? 'pt-44' : 'pt-36'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white border border-indigo-200 px-4 py-1.5 rounded-full text-sm text-indigo-700 mb-8 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('landing.featureBadge')}</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-blue-900">
            {t('landing.heroTitle')}
            <br />
            <span className="text-blue-700">
              {t('landing.heroTitleAccent')}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.heroSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-semibold px-8 py-3 text-base shadow-md">
                {t('landing.ctaStart')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-blue-300 text-blue-900 hover:bg-blue-50 px-8 py-3 text-base">
                {t('landing.ctaSignIn')}
              </Button>
            </Link>
          </div>

          {/* Mini stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm text-gray-600">
            {[
              { label: t('landing.miniStat1'), icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
              { label: t('landing.miniStat2'), icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
              { label: t('landing.miniStat3'), icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
            ].map(item => (
              <span key={item.label} className="flex items-center gap-1.5">
                {item.icon} {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's New (v2.0 release) ── */}
      <section id="whats-new" className="py-24 px-4 sm:px-6 bg-gradient-to-br from-blue-950 via-indigo-950 to-blue-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm text-indigo-200 mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>{t('landing.whatsNewBadge')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing.whatsNewTitle')}</h2>
            <p className="text-indigo-200 max-w-2xl mx-auto leading-relaxed">{t('landing.whatsNewSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {whatsNewItems.map((item) => (
              <div
                key={item.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors duration-200 backdrop-blur-sm"
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-white mb-4 shadow-md`}>
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-indigo-200 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-4">{t('landing.featuresTitle')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('landing.featuresSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div key={feat.title} className="bg-white border border-gray-200 rounded-xl p-6 group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl ${feat.bg} flex items-center justify-center text-white mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                  {feat.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-4 sm:px-6 bg-blue-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-4">{t('landing.howTitle')}</h2>
            <p className="text-gray-500">{t('landing.howSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-blue-200" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-blue-200 flex items-center justify-center mb-5 relative z-10 shadow-sm">
                  <span className="text-2xl font-black text-blue-900">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-blue-900 rounded-2xl p-10 sm:p-14 text-center shadow-lg">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing.ctaBannerTitle')}</h2>
            <p className="text-blue-200 mb-8 text-lg">{t('landing.ctaBannerSubtitle')}</p>
            <Link to="/signup">
              <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-10 py-3 text-base shadow-md">
                {t('landing.ctaBannerButton')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto py-8 px-4 sm:px-6 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span>DDoc — {t('landing.footerBuiltWith')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-blue-900 transition-colors">{t('landing.ctaSignIn')}</Link>
            <Link to="/signup" className="hover:text-blue-900 transition-colors">{t('landing.ctaStart')}</Link>
            <Link to="/api" className="hover:text-blue-900 transition-colors">API</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
