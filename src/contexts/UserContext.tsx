import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  // Add other user properties as needed
}

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

// Note: This context is wired for client-side role gating.
// It reads role from localStorage (dq_role or legacy 'officer').

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (): Promise<void> => {
    try {
      const stored = localStorage.getItem('dq_user');
      const role = (localStorage.getItem('dq_role') || '').toLowerCase();
      if (stored) {
        const user = JSON.parse(stored) as Partial<User>;
        setCurrentUser({ id: user.id || 'local', email: user.email || '', role: (user.role || role || 'admin') });
      } else if (role) {
        setCurrentUser({ id: 'local', email: '', role });
      }
    } catch (e) {
      // ignore malformed localStorage
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, _password: string): Promise<{ success: boolean; message?: string }> => {
    // Client-only stub: persist basic identity; real auth not wired here.
    const role = (localStorage.getItem('dq_role') || '').toLowerCase() || 'admin'
    const user: User = { id: 'local', email, role }
    localStorage.setItem('dq_user', JSON.stringify(user))
    setCurrentUser(user)
    return { success: true }
  };

  const logout = (): void => {
    setCurrentUser(null);
    localStorage.removeItem('dq_user');
    localStorage.removeItem('dq_role');
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        loading,
        login,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  );
};