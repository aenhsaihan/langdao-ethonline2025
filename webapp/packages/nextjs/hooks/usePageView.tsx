"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

type PageView = 'home' | 'how-it-works';

interface PageViewContextType {
  currentView: PageView;
  setCurrentView: (view: PageView) => void;
  showHowItWorks: () => void;
  showHome: () => void;
}

const PageViewContext = createContext<PageViewContextType | undefined>(undefined);

export const PageViewProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<PageView>('home');

  const showHowItWorks = () => setCurrentView('how-it-works');
  const showHome = () => setCurrentView('home');

  return (
    <PageViewContext.Provider value={{
      currentView,
      setCurrentView,
      showHowItWorks,
      showHome
    }}>
      {children}
    </PageViewContext.Provider>
  );
};

export const usePageView = () => {
  const context = useContext(PageViewContext);
  if (context === undefined) {
    throw new Error('usePageView must be used within a PageViewProvider');
  }
  return context;
};