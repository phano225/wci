import { Article, ArticleStatus, Category, User, UserRole, Ad, AdLocation, AdType } from '../types';
import { supabase } from '../supabase-config';

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data || [];
};

export const saveUser = async (user: User) => {
  const { error } = await supabase.from('users').upsert(user);
  if (error) throw error;
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
};

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;
  return data || [];
};

export const saveCategory = async (category: Category) => {
  const { error } = await supabase.from('categories').upsert(category);
  if (error) throw error;
};

export const deleteCategory = async (id: string) => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
};

export const getArticles = async (): Promise<Article[]> => {
  try {
    console.log('Tentative de récupération des articles...');
    const { data, error } = await supabase.from('articles').select('*').order('createdAt', { ascending: false });
    if (error) {
      console.error('Erreur Supabase getArticles:', error);
      throw new Error(`Erreur de récupération: ${error.message}`);
    }
    console.log('Articles récupérés:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des articles:', error);
    throw error;
  }
};

export const getArticleById = async (id: string): Promise<Article | undefined> => {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const saveArticle = async (article: Article) => {
  try {
    console.log('Tentative de sauvegarde d\'article:', article);
    const { error } = await supabase.from('articles').upsert(article);
    if (error) {
      console.error('Erreur Supabase saveArticle:', error);
      throw new Error(`Erreur de sauvegarde: ${error.message}`);
    }
    console.log('Article sauvegardé avec succès');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'article:', error);
    throw error;
  }
};

export const deleteArticle = async (id: string) => {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
};

export const incrementArticleViews = async (id: string) => {
  const { error } = await supabase.rpc('increment_views', { article_id: id });
  if (error) throw error;
};

export const getAds = async (): Promise<Ad[]> => {
  const { data, error } = await supabase.from('ads').select('*');
  if (error) throw error;
  return data || [];
};

export const getActiveAdByLocation = async (location: AdLocation): Promise<Ad | undefined> => {
  const { data, error } = await supabase.from('ads').select('*').eq('active', true).eq('location', location).single();
  if (error) throw error;
  return data;
};

export const saveAd = async (ad: Ad) => {
  const { error } = await supabase.from('ads').upsert(ad);
  if (error) throw error;
};

export const deleteAd = async (id: string) => {
  const { error } = await supabase.from('ads').delete().eq('id', id);
  if (error) throw error;
};