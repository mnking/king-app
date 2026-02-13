export interface ContainerType {
  id: string;
  code: string;
  size: string;
  description?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContainerTypeCreateForm {
  code: string;
  size: string;
  description?: string;
}

export interface ContainerTypeUpdateForm {
  code?: string;
  size?: string;
  description?: string;
}
