
export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  organization_id: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  role: Role;
  last_used_at: string | null;
  expires_at: string | null;
}

export type WebhookEvent = 'document.generated' | 'document.failed' | 'member.invited' | 'member.joined';

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  status: 'pending' | 'success' | 'failed';
  response_code: number | null;
  attempts: number;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_members?: number;
}

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  role: Role;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  organization?: Organization;
  role?: Role;
  isSystemAdmin?: boolean;
}

export interface Company {
  id: string;
  name: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  paperFormat: string;
  paperOrientation: string;
  sections: Section[];
}

export interface Section {
  id: string;
  name: string;
  description: string;
  htmlContent: string;
  sectionOrder: number;
  templateId: string;
}

export interface Context {
  id: string;
  name: string;
  description?: string;
}

// 1=Text, 2=Number, 3=Date, 4=Select, 5=Email, 6=Long Text
export type TagType = '1' | '2' | '3' | '4' | '5' | '6';

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  typeName?: string;
  description: string;
  contextId: string;
  context?: Context;
  options?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface CreateTemplateData {
  name: string;
  description: string;
  paperFormat?: string;
  paperOrientation?: string;
}

export interface CreateSectionData {
  name: string;
  description: string;
  htmlContent: string;
  templateId: string;
}

export interface CreateTagData {
  name: string;
  type: TagType;
  description: string;
  contextId: string;
  options?: string[];
}

export interface CreateContextData {
  name: string;
  description?: string;
}

export interface UpdateProfileData {
  email?: string;
  name?: string;
  avatar?: string | File;
  companyId?: string;
  password?: string;
}

export interface TemplatesResponse {
  templates: Template[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GeneratedFile {
  id: string;
  name: string;
  templateId: string;
  userId: string;
  createdAt: string;
  templateName?: string;
  status: 1 | 2 | 3; // 1=processing, 2=ready, 3=error
  readyToDownload: boolean;
  errors?: string | null;
}

export interface GeneratedFilesResponse {
  files: GeneratedFile[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FileEmailLog {
  id: string;
  file_id: string;
  sent_by_user_id: string;
  recipient_email: string;
  message: string | null;
  status: 'sent' | 'failed';
  error_message: string | null;
  sent_at: string;
}

export interface FileDownloadLog {
  id: string;
  file_id: string;
  downloaded_by_user_id: string;
  ip_address: string | null;
  downloaded_at: string;
}

export interface Package {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_api_keys: number;
  max_members: number;
  max_monthly_generations: number;
  max_file_storage_mb: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface PackageUsage {
  api_keys: number;
  members: number;
  monthly_generations: number;
}

export interface KlarnaConfig {
  mode: 'sandbox' | 'production';
  is_configured: boolean;
}

export interface KlarnaSettings {
  mode: 'sandbox' | 'production';
  sandbox_username: string | null;
  sandbox_password_set: boolean;
  production_username: string | null;
  production_password_set: boolean;
  is_configured: boolean;
}

export interface KlarnaSession {
  client_token: string;
  session_id: string;
  payment_method_categories: Array<{ identifier: string; name: string; asset_urls: object }>;
}

export interface PackageUpgradeRequest {
  id: string;
  organization_id: string;
  organization_name?: string;
  current_package_slug: string;
  requested_package_id: string;
  requested_package_name?: string;
  requested_package_slug?: string;
  payment_reference: string | null;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by_user_id: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}
