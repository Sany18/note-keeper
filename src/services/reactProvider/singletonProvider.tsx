import { createContext, useContext } from 'react';

export const createSingletonProvider = <T,>(useHook: () => T, displayName?: string) => {
  // Create a context for the hook's return value
  const Context = createContext<T | null>(null);

  if (displayName) {
    Context.displayName = displayName;
  }

  // Provider component that will wrap the application or a part of it
  const Provider = ({ children }: { children: React.ReactNode }) => {
    // Execute the hook once in the provider
    const value = useHook();

    return (
      <Context.Provider value={value}>
        {children}
      </Context.Provider>
    );
  };

  // Hook to access the singleton value from the context
  const useValue = () => {
    const value = useContext(Context);

    if (value === null) {
      throw new Error(
        `use${displayName || 'SingletonValue'} must be used within its provider`
      );
    }
    return value;
  };

  return { Provider, useValue };
}
