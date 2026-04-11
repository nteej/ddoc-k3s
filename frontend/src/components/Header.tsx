
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, User, Menu, X, Zap, Globe } from 'lucide-react';
import LogoMark from '@/components/LogoMark';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fi', label: 'Suomi' },
  { code: 'sv', label: 'Svenska' },
];

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/documents" className="flex items-center space-x-2">
            <LogoMark size={32} />
            <span className="text-xl font-bold text-blue-900 hidden sm:block">
              DDoc
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              to="/documents"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActiveRoute('/documents') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t('nav.myTemplates')}
            </Link>
            <Link
              to="/files"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActiveRoute('/files') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t('nav.generatedFiles')}
            </Link>
            <Link
              to="/generate"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                isActiveRoute('/generate') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              {t('nav.generate')}
            </Link>
            <Link
              to="/api"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActiveRoute('/api') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t('nav.api')}
            </Link>
            <Link
              to="/settings"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActiveRoute('/settings') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t('nav.settings')}
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 hover:text-gray-900">
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">{currentLang.code}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-md">
                {LANGUAGES.map(lang => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={i18n.language === lang.code ? 'text-blue-900 font-medium' : ''}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-2 h-auto">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-blue-900 text-white text-sm">
                        {user?.name ? getInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden lg:block text-gray-700">
                      {user?.name}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-md">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>{t('nav.myProfile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>{t('nav.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-1">
              <Link
                to="/documents"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActiveRoute('/documents') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.myTemplates')}
              </Link>
              <Link
                to="/files"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActiveRoute('/files') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.generatedFiles')}
              </Link>
              <Link
                to="/generate"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  isActiveRoute('/generate') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Zap className="w-4 h-4" />
                {t('nav.generate')}
              </Link>
              <Link
                to="/api"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActiveRoute('/api') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.api')}
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActiveRoute('/settings') ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.settings')}
              </Link>
              <Link
                to="/profile"
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.myProfile')}
              </Link>

              {/* Mobile language switcher */}
              <div className="flex gap-2 px-3 pt-2 border-t border-gray-200">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setMobileMenuOpen(false); }}
                    className={`text-xs px-2 py-1 rounded border ${
                      i18n.language === lang.code
                        ? 'border-blue-900 text-blue-900 bg-blue-50 font-semibold'
                        : 'border-gray-300 text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                onClick={handleLogout}
                className="justify-start px-3 py-2 text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('nav.signOut')}
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
