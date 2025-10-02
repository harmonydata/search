"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Firebase modules will be dynamically imported when needed
// This prevents them from being bundled unless actually used

// Dynamic Firebase imports - only loaded when needed
let firebaseAuth: any = null;
let firebaseModules: any = null;

const loadFirebaseModules = async () => {
  if (firebaseModules) return firebaseModules;

  console.log("🔍 Loading Firebase modules dynamically");
  const [
    { auth },
    {
      GithubAuthProvider,
      TwitterAuthProvider,
      GoogleAuthProvider,
      signInWithPopup,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      sendPasswordResetEmail,
      signOut,
      onAuthStateChanged,
    },
  ] = await Promise.all([import("../../firebase"), import("firebase/auth")]);

  firebaseModules = {
    auth,
    GithubAuthProvider,
    TwitterAuthProvider,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
  };

  firebaseAuth = auth;
  return firebaseModules;
};

interface AuthContextType {
  currentUser: any | null;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  signInWithGitHub: () => Promise<any>;
  signInWithTwitter: () => Promise<any>;
  loading: boolean;
}

// Default context value for SSR - no-op functions that don't throw errors
const defaultAuthContext: AuthContextType = {
  currentUser: null,
  login: async () => {
    console.warn("Auth not available on server");
    return null;
  },
  signup: async () => {
    console.warn("Auth not available on server");
    return null;
  },
  logout: async () => {
    console.warn("Auth not available on server");
  },
  resetPassword: async () => {
    console.warn("Auth not available on server");
  },
  signInWithGoogle: async () => {
    console.warn("Auth not available on server");
    return null;
  },
  signInWithGitHub: async () => {
    console.warn("Auth not available on server");
    return null;
  },
  signInWithTwitter: async () => {
    console.warn("Auth not available on server");
    return null;
  },
  loading: false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Only run Firebase auth logic on client side
  useEffect(() => {
    if (typeof window === "undefined") {
      // During SSR, don't load Firebase
      setLoading(false);
      setFirebaseReady(false);
      return;
    }

    // Load Firebase modules dynamically
    const initializeFirebase = async () => {
      try {
        const { auth, onAuthStateChanged } = await loadFirebaseModules();

        if (!auth) {
          console.warn("Firebase auth not available");
          setLoading(false);
          return;
        }

        setFirebaseReady(true);

        const unsubscribe = onAuthStateChanged(auth, (user: any) => {
          console.log("🔄 Auth state changed:", {
            hasUser: !!user,
            uid: user?.uid,
            SSR: typeof window === "undefined",
          });

          setCurrentUser(user);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Failed to load Firebase modules:", error);
        setLoading(false);
      }
    };

    initializeFirebase();
  }, []);

  // Auth functions - only work on client side
  const authFunctions = React.useMemo(() => {
    if (typeof window === "undefined") {
      // Server side - return no-op functions
      return {
        login: async () => {
          console.warn("Auth not available on server");
          return null;
        },
        signup: async () => {
          console.warn("Auth not available on server");
          return null;
        },
        logout: async () => {
          console.warn("Auth not available on server");
        },
        resetPassword: async () => {
          console.warn("Auth not available on server");
        },
        signInWithGoogle: async () => {
          console.warn("Auth not available on server");
          return null;
        },
        signInWithGitHub: async () => {
          console.warn("Auth not available on server");
          return null;
        },
        signInWithTwitter: async () => {
          console.warn("Auth not available on server");
          return null;
        },
      };
    }

    // Client side functions
    const OAuth = async (provider: any) => {
      const { auth, signInWithPopup } = await loadFirebaseModules();
      return signInWithPopup(auth, provider)
        .then((result: any) => {
          return result.user;
        })
        .catch((error: any) => {
          return provider.credentialFromError(error);
        });
    };

    return {
      login: async (email: string, password: string) => {
        const { auth, signInWithEmailAndPassword } =
          await loadFirebaseModules();
        return signInWithEmailAndPassword(auth, email, password);
      },
      signup: async (email: string, password: string) => {
        const { auth, createUserWithEmailAndPassword } =
          await loadFirebaseModules();
        return createUserWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        const { auth, signOut } = await loadFirebaseModules();
        return signOut(auth);
      },
      resetPassword: async (email: string) => {
        const { auth, sendPasswordResetEmail } = await loadFirebaseModules();
        return sendPasswordResetEmail(auth, email);
      },
      signInWithGoogle: async () => {
        const { GoogleAuthProvider } = await loadFirebaseModules();
        return OAuth(new GoogleAuthProvider());
      },
      signInWithGitHub: async () => {
        const { GithubAuthProvider } = await loadFirebaseModules();
        return OAuth(new GithubAuthProvider());
      },
      signInWithTwitter: async () => {
        const { TwitterAuthProvider } = await loadFirebaseModules();
        return OAuth(new TwitterAuthProvider());
      },
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    ...authFunctions,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
