import { Company } from '../types';

const KEY = 'dotacion_companies';

export const loadCompanies = (): Company[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveCompanies = (companies: Company[]) => {
  localStorage.setItem(KEY, JSON.stringify(companies));
};

export const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
