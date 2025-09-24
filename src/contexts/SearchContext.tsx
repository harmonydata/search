"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface SearchSettings {
  query: string;
  selectedFilters: Record<string, string[]>;
  useSearch2: boolean;
  hybridWeight: number;
  maxDistance: number;
  selectedCategory: string | null;
  resourceType: string | null;
  similarUid: string | null;
}

interface SearchContextType {
  searchSettings: SearchSettings;
  updateSearchSettings: (settings: Partial<SearchSettings>) => void;
  resetSearchSettings: () => void;
  loadSearchFromSaved: (savedSearch: {
    query: string;
    filters?: Record<string, string[]>;
  }) => void;
}

const defaultSearchSettings: SearchSettings = {
  query: "",
  selectedFilters: {},
  useSearch2: false,
  hybridWeight: 0.5,
  maxDistance: 0.4,
  selectedCategory: null,
  resourceType: null,
  similarUid: null,
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchSettings, setSearchSettings] = useState<SearchSettings>(
    defaultSearchSettings
  );

  const updateSearchSettings = useCallback(
    (newSettings: Partial<SearchSettings>) => {
      setSearchSettings((prev) => ({
        ...prev,
        ...newSettings,
      }));
    },
    []
  );

  const resetSearchSettings = useCallback(() => {
    setSearchSettings(defaultSearchSettings);
  }, []);

  const loadSearchFromSaved = useCallback(
    (savedSearch: { query: string; filters?: Record<string, string[]> }) => {
      setSearchSettings({
        ...defaultSearchSettings,
        query: savedSearch.query,
        selectedFilters: savedSearch.filters || {},
      });
    },
    []
  );

  return (
    <SearchContext.Provider
      value={{
        searchSettings,
        updateSearchSettings,
        resetSearchSettings,
        loadSearchFromSaved,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}

