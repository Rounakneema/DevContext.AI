import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignUp,
} from "aws-amplify/auth";

interface User {
  email: string;
  userId: string;
  groups?: string[];
  emailVerified?: boolean;
  onboardingComplete?: boolean;
  profileComplete?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  confirmSignup: (email: string, code: string) => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  checkProfileCompletion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      // Extract groups from JWT token
      const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
      const adminStatus = groups.includes('Admins');
      
      // Check email verification
      const emailVerified = session.tokens?.idToken?.payload['email_verified'] === true;
      
      setUser({
        email: currentUser.signInDetails?.loginId || "",
        userId: currentUser.userId,
        groups: groups,
        emailVerified: emailVerified,
        onboardingComplete: false, // Will be checked separately
        profileComplete: false, // Will be checked separately
      });
      setIsAdmin(adminStatus);
      
      // Check profile completion after setting user
      await checkProfileCompletionInternal();
    } catch (error) {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const checkProfileCompletionInternal = async () => {
    try {
      // Import getUserProfile dynamically to avoid circular dependency
      const { getUserProfile } = await import('../services/api');
      const profile = await getUserProfile();
      
      // Check if profile is complete
      const isComplete = !!(
        profile.displayName &&
        profile.targetRole &&
        profile.language
      );
      
      setUser(prev => prev ? {
        ...prev,
        profileComplete: isComplete,
        onboardingComplete: isComplete,
      } : null);
    } catch (error) {
      // Profile doesn't exist yet
      setUser(prev => prev ? {
        ...prev,
        profileComplete: false,
        onboardingComplete: false,
      } : null);
    }
  };

  const checkProfileCompletion = async () => {
    await checkProfileCompletionInternal();
  };

  const login = async (email: string, password: string) => {
    try {
      const { isSignedIn } = await signIn({
        username: email,
        password: password,
      });

      if (isSignedIn) {
        await checkUser();
      }
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Failed to login");
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const { isSignUpComplete } = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
          },
        },
      });

      if (!isSignUpComplete) {
        // User needs to confirm email
        throw new Error("CONFIRMATION_REQUIRED");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const confirmSignup = async (email: string, code: string) => {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (error: any) {
      console.error("Confirmation error:", error);
      throw new Error(error.message || "Failed to confirm signup");
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        signup,
        logout,
        confirmSignup,
        getAuthToken,
        checkProfileCompletion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
