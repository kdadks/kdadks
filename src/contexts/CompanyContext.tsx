import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoiceService } from '../services/invoiceService';
import type { CompanySettings } from '../types/invoice';

interface CompanyContextType {
  companies: CompanySettings[];
  selectedCompany: CompanySettings | null;
  loading: boolean;
  error: string | null;
  selectCompany: (id: string) => void;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<CompanySettings[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoiceService.getCompanySettings();
      setCompanies(data);
      setSelectedCompany(prev => {
        if (prev && data.some(c => c.id === prev.id)) return prev;
        const def = data.find(c => c.is_default) || data[0] || null;
        return def;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCompanies(); }, []);

  const selectCompany = (id: string) => {
    const found = companies.find(c => c.id === id) || null;
    setSelectedCompany(found);
  };

  return (
    <CompanyContext.Provider value={{ companies, selectedCompany, loading, error, selectCompany, refreshCompanies: loadCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanyContext = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompanyContext must be used within CompanyProvider');
  return ctx;
};
