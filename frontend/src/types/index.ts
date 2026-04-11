
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
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
