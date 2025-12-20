
// Enums for Role-Based Access Control
export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  CONTRIBUTOR = 'CONTRIBUTOR'
}

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PUBLISHED = 'PUBLISHED'
}

// Ad Types
export enum AdLocation {
  HEADER_LEADERBOARD = 'HEADER_LEADERBOARD',
  SIDEBAR_SQUARE = 'SIDEBAR_SQUARE',
  SIDEBAR_SKYSCRAPER = 'SIDEBAR_SKYSCRAPER',
}

export enum AdType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  SCRIPT = 'SCRIPT'
}

export interface Ad {
  id: string;
  title: string;
  location: AdLocation;
  type: AdType;
  content: string;
  linkUrl?: string;
  active: boolean;
}

// User Model
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
}

// Category Model
export interface Category {
  id: string;
  name: string;
  slug: string;
}

// Article Model
export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  imageUrl: string;
  videoUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  status: ArticleStatus;
  views: number;
  createdAt: string; 
  updatedAt: string;
}

// Permissions Matrix
export const PERMISSIONS = {
  canDeleteArticle: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR].includes(role),
  canManageUsers: (role: UserRole) => role === UserRole.ADMIN,
  canManageCategories: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR].includes(role),
  canManageAds: (role: UserRole) => role === UserRole.ADMIN,
};
