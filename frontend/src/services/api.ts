import {
  User,
  Template,
  Section,
  Tag,
  Context,
  Company,
  Organization,
  OrgMember,
  Role,
  ApiKey,
  Webhook,
  WebhookEvent,
  WebhookDelivery,
  Notification,
  LoginCredentials,
  RegisterCredentials,
  CreateTemplateData,
  CreateSectionData,
  CreateTagData,
  CreateContextData,
  UpdateProfileData,
  TemplatesResponse,
  GeneratedFilesResponse,
  FileEmailLog,
  FileDownloadLog,
  Package,
  PackageUsage,
  PackageUpgradeRequest,
  KlarnaConfig,
  KlarnaSettings,
  KlarnaSession,
} from '@/types';

const BASE_URL = '/api';

const api = {
  async login(credentials: LoginCredentials): Promise<{ user: User }> {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer login');
      }
      
      const apiResponse = await response.json();

      const user: User = {
        id: apiResponse.data.id,
        email: apiResponse.data.email,
        name: apiResponse.data.name,
        avatar: undefined,
        role: apiResponse.data.role,
      };

      return { user };

    } catch (error){
      console.log(error.message);
      throw new Error('Invalid credentials');
    }
  },

  async register(credentials: RegisterCredentials): Promise<{ user: User }> {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.errors?.email?.[0] ||
        data?.errors?.password?.[0] ||
        data?.message ||
        'Registration failed';
      throw new Error(message);
    }

    const user: User = {
      id: data.data.id,
      email: data.data.email,
      name: data.data.name,
      avatar: undefined,
      role: data.data.role,
    };

    return { user };
  },

  async logout(): Promise<void> {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async getUser(): Promise<User> {
    const response = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('No active session');
    }

    const apiResponse = await response.json();
    return {
      id: apiResponse.data.id,
      email: apiResponse.data.email,
      name: apiResponse.data.name,
      avatar: undefined,
      role: apiResponse.data.role,
    };
  },

  async getTemplates(page = 1, limit = 10): Promise<TemplatesResponse> {
    try {
      const response = await fetch(`${BASE_URL}/templates/filters`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar templates');
      }
      
      const apiResponse = await response.json();
      const allTemplates = apiResponse.data.map((element: any) => ({
        id: element.id,
        name: element.name,
        description: element.description,
        sections: []
      }));
  
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const templates = allTemplates.slice(startIndex, endIndex);

      return {
        templates,
        total: allTemplates.length,
        page,
        totalPages: Math.ceil(allTemplates.length / limit)
      };

    } catch {
      throw new Error('Erro ao consultar templates');
    }
  },

  async filterTemplates(query: string, page = 1, limit = 10): Promise<TemplatesResponse> {
    try {
      const response = await fetch(`${BASE_URL}/templates/filters`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar templates');
      }
      
      const apiResponse = await response.json();
      const allTemplates = apiResponse.data.map((element: any) => ({
        id: element.id,
        name: element.name,
        description: element.description,
        sections: []
      }));

      const filteredTemplates = allTemplates.filter(template => 
        template.name.toLowerCase().includes(query.toLowerCase())
      );

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const templates = filteredTemplates.slice(startIndex, endIndex);

      return {
        templates,
        total: filteredTemplates.length,
        page,
        totalPages: Math.ceil(filteredTemplates.length / limit)
      };
    } catch {
      throw new Error('Erro ao consultar templates');
    }
  },

  async createTemplate(data: CreateTemplateData): Promise<string> {
    const response = await fetch(`${BASE_URL}/templates`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao cadastrar template');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data.id;
  },

  async updateTemplate(id: string, data: Partial<CreateTemplateData>): Promise<Template> {
    const response = await fetch(`${BASE_URL}/templates/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar template');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/templates/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir template');
    }
  },

  async getSections(templateId: string): Promise<Section[]> {
    const response = await fetch(`${BASE_URL}/sections/filters?templateId=${templateId}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar sections');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data.sort((a: any, b: any) => a.sectionOrder - b.sectionOrder);
  },

  async createSection(data: CreateSectionData): Promise<string> {
    const response = await fetch(`${BASE_URL}/sections`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao cadastrar seção');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data.id;
  },

  async updateSection(id: string, data: Partial<CreateSectionData>): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/sections/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar seção');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data;
  },

  async deleteSection(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/sections/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir seção');
    }
  },

  async getContexts(): Promise<Context[]> {
    const response = await fetch(`${BASE_URL}/contexts/filters`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar contexts');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data;
  },

  async createContext(data: CreateContextData): Promise<string> {
    const response = await fetch(`${BASE_URL}/contexts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao cadastrar context');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data.id;
  },

  async updateContext(id: string, data: CreateContextData): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/contexts/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar context');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data;
  },

  async deleteContext(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/contexts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir context');
    }
  },

  async getTags(): Promise<Tag[]> {
    const response = await fetch(`${BASE_URL}/tags/filters`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar tags');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data;
  },

  async createTag(data: CreateTagData): Promise<string> {
    const response = await fetch(`${BASE_URL}/tags`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao cadastrar tag');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data.id;
  },

  async updateTag(id: string, data: CreateTagData): Promise<Tag> {
    const response = await fetch(`${BASE_URL}/tags/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar tag');
    }
    
    const apiResponse = await response.json();
    return apiResponse.data;
  },

  async deleteTag(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/tags/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir tag');
    }
  },

  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await fetch(`${BASE_URL}/users/profile`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar perfil');
    }

    return response.json();
  },

  async getGeneratedFiles(page = 1, limit = 10): Promise<GeneratedFilesResponse> {
    const response = await fetch(`${BASE_URL}/files/filters`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar arquivos');
    }
    
    const apiResponse = await response.json();
    const allFiles = apiResponse.data;
  
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const files = allFiles.slice(startIndex, endIndex);

    return {
      files,
      total: allFiles.length,
      page,
      totalPages: Math.ceil(allFiles.length / limit)
    };
  },

  async sendFileEmail(fileId: string, email: string, message?: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/files/${fileId}/send-email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, message: message || undefined }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to send email');
    }
  },

  async getFileEmailHistory(fileId: string): Promise<FileEmailLog[]> {
    const res = await fetch(`${BASE_URL}/files/${fileId}/email-history`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch email history');
    const { data } = await res.json();
    return data;
  },

  async getFileDownloadHistory(fileId: string): Promise<FileDownloadLog[]> {
    const res = await fetch(`${BASE_URL}/files/${fileId}/download-history`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch download history');
    const { data } = await res.json();
    return data;
  },

  async deleteFile(fileId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete file');
    }
  },

  async downloadGeneratedFile(fileId: string, fileName: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/files/download/${fileId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('File could not be downloaded');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async forgotPassword(email: string): Promise<{ devToken?: string; devResetUrl?: string }> {
    const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Request failed');
    }

    return {
      devToken: data?.data?.dev_token,
      devResetUrl: data?.data?.dev_reset_url,
    };
  },

  async resetPassword(email: string, token: string, password: string, passwordConfirmation: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, password, password_confirmation: passwordConfirmation }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        data?.errors?.token?.[0] ||
        data?.errors?.password?.[0] ||
        data?.message ||
        'Reset failed';
      throw new Error(msg);
    }
  },

  async asyncGenerate(templateId: string, name: string, payload: Record<string, string>): Promise<void> {
    const response = await fetch(`${BASE_URL}/files/async-generate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, name, payload }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to queue document generation');
    }
  },

  // ─── Organization API ─────────────────────────────────────────────────────

  async getOrganization(): Promise<Organization> {
    const res = await fetch(`${BASE_URL}/organizations/current`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load organization');
    const { data } = await res.json();
    return data;
  },

  async updateOrganization(fields: { name?: string; slug?: string }): Promise<void> {
    const res = await fetch(`${BASE_URL}/organizations/current`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error('Failed to update organization');
  },

  async listMembers(): Promise<OrgMember[]> {
    const res = await fetch(`${BASE_URL}/organizations/current/members`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load members');
    const { data } = await res.json();
    return data;
  },

  async inviteMember(email: string, role: Role): Promise<{ token: string }> {
    const res = await fetch(`${BASE_URL}/organizations/current/invitations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to invite member');
    return data.data;
  },

  async updateMemberRole(userId: string, role: Role): Promise<void> {
    const res = await fetch(`${BASE_URL}/organizations/current/members/${userId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Failed to update role');
  },

  async removeMember(userId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/organizations/current/members/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to remove member');
  },

  async getInvitation(token: string): Promise<{ organization_name: string; organization_slug: string; email: string; role: Role }> {
    const res = await fetch(`${BASE_URL}/invitations/${token}`);
    if (!res.ok) throw new Error('Invitation not found or expired');
    const { data } = await res.json();
    return data;
  },

  async acceptInvitation(token: string): Promise<{ user: User }> {
    const res = await fetch(`${BASE_URL}/invitations/${token}/accept`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to accept invitation');
    return { user: { id: data.data.id, name: data.data.name, email: data.data.email } };
  },

  async switchOrganization(orgId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/organizations/switch/${orgId}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to switch organization');
  },

  // ─── API Keys ─────────────────────────────────────────────────────────────

  async listApiKeys(): Promise<ApiKey[]> {
    const res = await fetch(`${BASE_URL}/api-keys`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load API keys');
    const { data } = await res.json();
    return data;
  },

  async createApiKey(name: string, role: Role, expiresAt?: string): Promise<{ key: string } & ApiKey> {
    const res = await fetch(`${BASE_URL}/api-keys`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, expires_at: expiresAt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create API key');
    return data.data;
  },

  async revokeApiKey(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api-keys/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to revoke API key');
  },

  // ─── Webhooks ─────────────────────────────────────────────────────────────

  async listWebhooks(): Promise<Webhook[]> {
    const res = await fetch(`${BASE_URL}/webhooks`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load webhooks');
    const { data } = await res.json();
    return data;
  },

  async createWebhook(url: string, events: WebhookEvent[]): Promise<Webhook> {
    const res = await fetch(`${BASE_URL}/webhooks`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, events }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create webhook');
    return data.data;
  },

  async deleteWebhook(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/webhooks/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete webhook');
  },

  async listWebhookDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    const res = await fetch(`${BASE_URL}/webhooks/${webhookId}/deliveries`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load deliveries');
    const { data } = await res.json();
    return data;
  },

  // ─── Notifications ────────────────────────────────────────────────────────

  async listNotifications(limit = 15, offset = 0): Promise<Notification[]> {
    const res = await fetch(`${BASE_URL}/notifications?limit=${limit}&offset=${offset}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to load notifications');
    const { data } = await res.json();
    return data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await fetch(`${BASE_URL}/notifications/unread-count`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get unread count');
    const { data } = await res.json();
    return data.count;
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      credentials: 'include',
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async getPackages(): Promise<Package[]> {
    const res = await fetch(`${BASE_URL}/packages`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch packages');
    const { data } = await res.json();
    return data;
  },

  async getCurrentPackage(): Promise<{ package: Package; usage: PackageUsage }> {
    const res = await fetch(`${BASE_URL}/organizations/current/package`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch current package');
    const { data } = await res.json();
    return data;
  },

  async submitUpgradeRequest(packageId: string, paymentReference?: string): Promise<PackageUpgradeRequest> {
    const res = await fetch(`${BASE_URL}/organizations/current/upgrade-request`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId, payment_reference: paymentReference }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to submit upgrade request');
    }
    const { data } = await res.json();
    return data.request;
  },

  async getAdminPackages(): Promise<Package[]> {
    const res = await fetch(`${BASE_URL}/admin/packages`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch packages');
    const { data } = await res.json();
    return data;
  },

  async createAdminPackage(pkg: Partial<Package>): Promise<Package> {
    const res = await fetch(`${BASE_URL}/admin/packages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pkg),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create package');
    }
    const { data } = await res.json();
    return data;
  },

  async updateAdminPackage(id: string, pkg: Partial<Package>): Promise<Package> {
    const res = await fetch(`${BASE_URL}/admin/packages/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pkg),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update package');
    }
    const { data } = await res.json();
    return data;
  },

  async deleteAdminPackage(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/admin/packages/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete package');
  },

  async getUpgradeRequests(): Promise<PackageUpgradeRequest[]> {
    const res = await fetch(`${BASE_URL}/admin/upgrade-requests`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch upgrade requests');
    const { data } = await res.json();
    return data;
  },

  async processUpgradeRequest(id: string, action: 'approve' | 'reject', reason?: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/admin/upgrade-requests/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to process request');
    }
  },

  // ── Klarna ──────────────────────────────────────────────────────────────────

  async getKlarnaConfig(): Promise<KlarnaConfig> {
    const res = await fetch(`${BASE_URL}/klarna/config`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch Klarna config');
    const { data } = await res.json();
    return data;
  },

  async createKlarnaSession(packageId: string, billingPeriod: 'monthly' | 'yearly'): Promise<KlarnaSession> {
    const res = await fetch(`${BASE_URL}/klarna/sessions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId, billing_period: billingPeriod }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || 'Failed to create payment session');
    }
    const { data } = await res.json();
    return data;
  },

  async completeKlarnaPayment(
    authorizationToken: string,
    packageId: string,
    billingPeriod: 'monthly' | 'yearly',
  ): Promise<PackageUpgradeRequest> {
    const res = await fetch(`${BASE_URL}/klarna/complete`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorization_token: authorizationToken, package_id: packageId, billing_period: billingPeriod }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || 'Payment failed');
    }
    const { data } = await res.json();
    return data.request;
  },

  async getKlarnaSettings(): Promise<KlarnaSettings> {
    const res = await fetch(`${BASE_URL}/admin/klarna-settings`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch Klarna settings');
    const { data } = await res.json();
    return data;
  },

  async updateKlarnaSettings(settings: Partial<KlarnaSettings & {
    sandbox_password?: string;
    production_password?: string;
  }>): Promise<void> {
    const res = await fetch(`${BASE_URL}/admin/klarna-settings`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || 'Failed to save Klarna settings');
    }
  },
};

export default api;
