import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import LogoMark from '@/components/LogoMark';
import api from '@/services/api';

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({});

  const missingParams = !token || !email;

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!password) next.password = t('resetPassword.passwordRequired');
    else if (password.length < 8) next.password = t('resetPassword.passwordMinLength');
    if (!confirm) next.confirm = t('resetPassword.confirmRequired');
    else if (password !== confirm) next.confirm = t('resetPassword.passwordsMismatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.resetPassword(email, token, password, confirm);
      setDone(true);
    } catch (err: any) {
      setErrors({ general: err.message ?? t('resetPassword.invalidToken') });
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
            <CardTitle className="text-2xl text-blue-900">{t('resetPassword.title')}</CardTitle>
            <CardDescription className="text-gray-600">{t('resetPassword.subtitle')}</CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {missingParams ? (
              <div className="text-center space-y-4">
                <AlertCircle className="w-14 h-14 text-red-400 mx-auto" />
                <p className="text-sm text-gray-600">{t('resetPassword.missingParams')}</p>
                <Link to="/forgot-password">
                  <Button variant="outline" className="border-gray-200 w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('forgotPassword.backToLogin')}
                  </Button>
                </Link>
              </div>
            ) : done ? (
              <div className="text-center space-y-4">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-900">{t('resetPassword.successTitle')}</h3>
                <p className="text-sm text-gray-600">{t('resetPassword.successDesc')}</p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white"
                >
                  {t('resetPassword.signIn')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.general && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {errors.general}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('resetPassword.newPasswordPlaceholder')}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); }}
                      className="pr-10 bg-white border-gray-300 focus:border-blue-700"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">{t('resetPassword.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setErrors(prev => ({ ...prev, confirm: undefined })); }}
                      className="pr-10 bg-white border-gray-300 focus:border-blue-700"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-sm text-red-600">{errors.confirm}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('resetPassword.submitting')}</>
                  ) : (
                    t('resetPassword.submit')
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

export default ResetPasswordPage;
