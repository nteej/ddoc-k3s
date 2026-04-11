import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import LogoMark from '@/components/LogoMark';
import api from '@/services/api';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = t('forgotPassword.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('forgotPassword.emailInvalid');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await api.forgotPassword(email.trim());
      setDevResetUrl(result.devResetUrl ?? null);
      setSubmitted(true);
    } catch {
      // Still show success — never reveal whether the email exists
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="glass-card border-gray-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-fit">
              <LogoMark size={64} />
            </div>
            <CardTitle className="text-2xl text-blue-900">{t('forgotPassword.title')}</CardTitle>
            <CardDescription className="text-gray-600">{t('forgotPassword.subtitle')}</CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {submitted ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-14 h-14 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t('forgotPassword.successTitle')}</h3>
                <p className="text-sm text-gray-600">{t('forgotPassword.successDesc')}</p>

                {devResetUrl && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                    <p className="text-xs font-medium text-amber-800 mb-2">{t('forgotPassword.devNotice')}</p>
                    <a
                      href={devResetUrl}
                      className="text-xs text-blue-700 hover:text-blue-900 break-all underline"
                    >
                      {devResetUrl}
                    </a>
                  </div>
                )}

                <Link to="/login">
                  <Button variant="outline" className="mt-2 border-gray-200 w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('forgotPassword.backToLogin')}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('forgotPassword.emailPlaceholder')}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                      className="pl-10 bg-white border-gray-300 focus:border-blue-700"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('forgotPassword.submitting')}</>
                  ) : (
                    t('forgotPassword.submit')
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t('forgotPassword.backToLogin')}
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
