import type { SubjectCategory, SubjectCategoryInput } from '@/types/masters/subject';
import CAxios from '../index';
import { SUBJECT_CATEGORIES_API_BASE } from '@/constants/api/masters/subjects';

export const fetchSubjectCategories = async (
  skip = 0,
  limit = 10,
  params?: {
    active_only?: boolean;
  }
): Promise<{ items: SubjectCategory[]; total: number }> => {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${SUBJECT_CATEGORIES_API_BASE}?${queryString}` : SUBJECT_CATEGORIES_API_BASE;

  const { data } = await CAxios.get(url);

  // Handle different response formats from backend
  if (Array.isArray(data)) {
    // Backend returns array directly
    return {
      items: data,
      total: data.length
    };
  } else if (data && typeof data === 'object') {
    // Backend returns paginated format
    return {
      items: data.items || data.data || [],
      total: data.total || data.total_count || data.count || 0
    };
  }

  // Fallback
  return {
    items: [],
    total: 0
  };
};

export const fetchSubjectCategoryById = async (id: string): Promise<SubjectCategory> => {
  const { data } = await CAxios.get(`${SUBJECT_CATEGORIES_API_BASE}/${id}`);
  return data;
};

export const createSubjectCategory = async (category: SubjectCategoryInput): Promise<SubjectCategory> => {
  const { data } = await CAxios.post(SUBJECT_CATEGORIES_API_BASE, category);
  return data;
};

export const updateSubjectCategory = async ({ id, category }: { id: string; category: SubjectCategoryInput }): Promise<SubjectCategory> => {
  const { data } = await CAxios.put(`${SUBJECT_CATEGORIES_API_BASE}/${id}`, category);
  return data;
};

export const deleteSubjectCategory = async (id: string): Promise<void> => {
  await CAxios.delete(`${SUBJECT_CATEGORIES_API_BASE}/${id}`);
};

// Paginated subject categories for hooks compatibility
export const fetchPaginatedSubjectCategories = async (
  skip: number,
  limit: number,
  params?: { active_only?: boolean }
): Promise<{ data: SubjectCategory[]; hasMore: boolean; total: number }> => {
  const result = await fetchSubjectCategories(skip, limit, params);
  const items = result.items || [];

  // Try to get total from response
  let total = result.total || 0;

  // If no total is provided by backend, estimate conservatively
  if (total === 0 && items.length > 0) {
    if (items.length === limit) {
      // Got a full page, assume at least one more page exists
      total = skip + items.length + limit;
    } else {
      // Got a partial page, this might be the last page
      total = skip + items.length;
    }
  }

  return {
    data: items,
    hasMore: items.length === limit,
    total: total
  };
};