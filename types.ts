// Enums for Role-Based Access Control
export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  CONTRIBUTOR = 'CONTRIBUTOR'
}

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED', // Soumis à l'admin
  PUBLISHED = 'PUBLISHED'
}

// Ad Types
export enum AdLocation {
  HEADER_LEADERBOARD = 'HEADER_LEADERBOARD', // 728x90 (Desktop Header)
  SIDEBAR_SQUARE = 'SIDEBAR_SQUARE', // 300x250 (Sidebar Top)
  SIDEBAR_SKYSCRAPER = 'SIDEBAR_SKYSCRAPER', // 300x600 (Sidebar Bottom)
}

export enum AdType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  SCRIPT = 'SCRIPT' // HTML/JS custom code (Google Adsense, iframes, etc.)
}

export interface Ad {
  id: string;
  title: string;
  location: AdLocation;
  type: AdType;
  content: string; // URL (img/video) OR Raw HTML (script)
  linkUrl?: string; // Where the click leads (for images/videos)
  active: boolean;
}

// User Model
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Added password field (optional for existing types, but used in logic)
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
  videoUrl?: string; // New field for video
  authorId: string;
  authorName: string;
  authorAvatar?: string; // New field for author avatar display
  status: ArticleStatus;
  createdAt: string; // ISO Date string
  updatedAt: string;
}

// Helper types
export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
};

// Permissions Matrix Helper
export const PERMISSIONS = {
  canDeleteArticle: (role: UserRole) => role === UserRole.ADMIN,
  canPublish: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR].includes(role),
  canEditProfile: (role: UserRole) => role === UserRole.ADMIN, // Only Admin can edit any profile. Editor/Contributor constrained.
  canSubmit: (role: UserRole) => role === UserRole.CONTRIBUTOR,
  canManageUsers: (role: UserRole) => role === UserRole.ADMIN,
  canManageCategories: (role: UserRole) => role === UserRole.ADMIN,
  canManageAds: (role: UserRole) => role === UserRole.ADMIN,
};