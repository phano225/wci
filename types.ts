
// Enums for Role-Based Access Control
export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  CONTRIBUTOR = 'CONTRIBUTOR'
}

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED'
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
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
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  targetUrl?: string;
  active?: boolean;
  isActive?: boolean;
  views?: number;
  clicks?: number;
  createdAt?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  status: 'READ' | 'UNREAD' | 'ARCHIVED';
}


// User Model
export interface Video {
  id: string;
  title: string;
  youtubeId: string;
  category: string;
  duration?: string;
  createdAt: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  iconClass: string;
  bgColor?: string; // e.g. 'bg-blue-600'
  textColor?: string; // e.g. 'text-white'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
  lastLogin?: string;
  active?: boolean;
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
  // Workflow properties
  submittedBy?: string; // ID of the user who submitted for review
  submittedAt?: string; // When it was submitted
  reviewedBy?: string; // ID of the reviewer
  reviewedAt?: string; // When it was reviewed
  reviewComments?: string; // Comments from reviewer
  submissionStatus?: SubmissionStatus;
}

// Permissions Matrix
export const PERMISSIONS = {
  // Articles
  canCreateArticle: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR, UserRole.CONTRIBUTOR].includes(role),
  canEditOwnArticle: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR, UserRole.CONTRIBUTOR].includes(role),
  canDeleteArticle: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR].includes(role),
  canPublishArticle: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR].includes(role),
  canSubmitForReview: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR, UserRole.CONTRIBUTOR].includes(role),
  canReviewSubmissions: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR].includes(role),

  // Users
  canManageUsers: (role: UserRole) => role === UserRole.ADMIN,
  canCreateEditor: (role: UserRole) => role === UserRole.ADMIN,
  canCreateContributor: (role: UserRole) => role === UserRole.ADMIN,
  canEditOwnProfile: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR, UserRole.CONTRIBUTOR].includes(role),
  canDeleteOwnAccount: (role: UserRole) => role === UserRole.ADMIN,

  // Categories
  canManageCategories: (role: UserRole) => [UserRole.ADMIN, UserRole.EDITOR].includes(role),

  // Ads
  canManageAds: (role: UserRole) => role === UserRole.ADMIN,
};
