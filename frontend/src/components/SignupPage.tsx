import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import LogoMark from '@/components/LogoMark';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const SignupPage: React.FC = () => {
  const { register, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/documents" replace />;
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = t('signup.nameRequired');
    if (!formData.email.trim()) {
      newErrors.email = t('signup.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('signup.emailInvalid');
    }
    if (!formData.password) {
      newErrors.password = t('signup.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('signup.passwordMinLength');
    }
    if (!formData.password_confirmation) {
      newErrors.password_confirmation = t('signup.confirmRequired');
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = t('signup.passwordsMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await register(formData);
    } catch {
      // error handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="glass-card border-gray-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-fit">
              <LogoMark size={64} />
            </div>
            <CardTitle className="text-2xl gradient-text">{t('signup.title')}</CardTitle>
            <CardDescription className="text-gray-700">{t('signup.tagline')}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('signup.fullName')}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('signup.fullNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="bg-white border-gray-300 focus:border-blue-700"
                />
                {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('signup.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="bg-white border-gray-300 focus:border-blue-700"
                />
                {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('signup.passwordPlaceholder')}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="bg-white border-gray-300 focus:border-blue-700 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation">{t('signup.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="password_confirmation"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder={t('signup.confirmPasswordPlaceholder')}
                    value={formData.password_confirmation}
                    onChange={(e) => handleChange('password_confirmation', e.target.value)}
                    className="bg-white border-gray-300 focus:border-blue-700 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.password_confirmation && (
                  <p className="text-red-400 text-sm">{errors.password_confirmation}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800 text-white transition-all duration-200"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('signup.creatingAccount')}
                  </>
                ) : (
                  t('signup.createAccount')
                )}
              </Button>

              <p className="text-center text-sm text-gray-400">
                {t('signup.alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-blue-700 hover:text-blue-900 transition-colors">
                  {t('signup.signIn')}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
