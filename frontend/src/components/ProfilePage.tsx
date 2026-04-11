
import React, { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Lock, Save, Loader2, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Company, UpdateProfileData } from '@/types';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<UpdateProfileData>({
    email: '',
    password: '',
    companyId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setFormData({
        email: user.email,
        password: '',
        companyId: user.company?.id || ''
      });
    } catch (error) {
      toast({
        title: t('profile.errorLoadingData'),
        description: t('profile.errorLoadingDataDesc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email?.trim()) {
      newErrors.email = t('profile.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('profile.emailInvalid');
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = t('profile.passwordMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UpdateProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('profile.invalidFile'),
          description: t('profile.invalidFileDesc'),
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('profile.fileTooLarge'),
          description: t('profile.fileTooLargeDesc'),
          variant: 'destructive',
        });
        return;
      }

      setFormData(prev => ({ ...prev, avatar: file }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);
      const updatedUser = await api.updateProfile(formData);
      updateUser(updatedUser);

      setFormData(prev => ({ ...prev, password: '' }));
      setAvatarPreview(null);

      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdatedDesc'),
      });
    } catch (error) {
      toast({
        title: t('profile.errorSaving'),
        description: t('profile.errorSavingDesc'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-700">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">{t('profile.title')}</h1>
        <p className="text-gray-700 mt-2">{t('profile.subtitle')}</p>
      </div>

      <Card className="glass-card border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserIcon className="w-6 h-6" />
            <span>{t('profile.personalInfo')}</span>
          </CardTitle>
          <CardDescription>
            {t('profile.personalInfoDesc')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarPreview || user?.avatar} />
                  <AvatarFallback className="bg-blue-900 text-white text-2xl">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="sm"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-blue-900 text-white"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  <Camera className="w-4 h-4" />
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-gray-500">{t('profile.changePhotoHint')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('profile.photoFormats')}</p>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{t('login.emailLabel')}</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="glass bg-gray-50 border-gray-200 focus:border-blue-400"
              />
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>{t('profile.newPassword')}</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('profile.newPasswordPlaceholder')}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="glass bg-gray-50 border-gray-200 focus:border-blue-400"
              />
              {errors.password && (
                <p className="text-red-400 text-sm">{errors.password}</p>
              )}
              <p className="text-xs text-gray-500">
                {t('profile.passwordHint')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={loadData}
                className="border-gray-200"
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-900 hover:bg-blue-800 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('common.save')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
