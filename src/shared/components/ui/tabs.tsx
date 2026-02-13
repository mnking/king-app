import React, { createContext, useContext, ReactNode } from 'react';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
};

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  children,
  className = '',
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: ReactNode;
  className?: string;
  variant?: 'pill' | 'underline';
}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  className = '',
  variant = 'pill',
}) => {
  const baseClass =
    variant === 'underline'
      ? 'flex items-center gap-6 h-11 bg-transparent p-0 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 rounded-none shadow-none'
      : 'inline-flex h-11 items-center justify-center rounded-lg bg-white dark:bg-gray-800 p-1 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm';

  return (
    <div className={`${baseClass} ${className}`}>
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  variant?: 'pill' | 'underline';
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className = '',
  variant = 'pill',
}) => {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isActive = selectedValue === value;

  const pillClasses = `inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ring-offset-white dark:ring-offset-gray-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
    isActive
      ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-500 shadow-sm'
      : 'text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
  }`;

  const underlineClasses = `relative inline-flex items-center justify-center whitespace-nowrap px-1 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
    isActive
      ? 'text-blue-600 dark:text-blue-300'
      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
  } after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full ${
    isActive
      ? 'after:bg-blue-600 dark:after:bg-blue-400'
      : 'after:bg-transparent'
  }`;

  const composed =
    variant === 'underline'
      ? underlineClasses
      : pillClasses;

  return (
    <button
      onClick={() => onValueChange(value)}
      data-state={isActive ? 'active' : 'inactive'}
      className={`${composed} ${className}`}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className = '',
}) => {
  const { value: selectedValue } = useTabsContext();

  if (selectedValue !== value) {
    return null;
  }

  return (
    <div
      className={`mt-2 ring-offset-white dark:ring-offset-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </div>
  );
};
