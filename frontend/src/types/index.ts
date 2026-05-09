
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
