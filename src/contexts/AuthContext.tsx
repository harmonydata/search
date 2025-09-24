"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  GithubAuthProvider,
  TwitterAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../../firebase";

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  signInWithGitHub: () => Promise<any>;
  signInWithTwitter: () => Promise<any>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const OAuth = async (provider: any) => {
    return signInWithPopup(auth, provider)
      .then((result) => {
        return result.user;
      })
      .catch((error) => {
        return provider.credentialFromError(error);
      });
  };

  function signInWithGoogle() {
    return OAuth(new GoogleAuthProvider());
  }

  function signInWithTwitter() {
    return OAuth(new TwitterAuthProvider());
  }

  function signInWithGitHub() {
    return OAuth(new GithubAuthProvider());
  }

  function signup(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    signInWithGoogle,
    signInWithGitHub,
    signInWithTwitter,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
