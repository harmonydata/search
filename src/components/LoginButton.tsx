"use client";

import { useState, useEffect } from "react";
import { Button } from "@mui/material";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "../../firebase"; // Assumes firebase.js exports 'auth'

export default function LoginButton() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return user ? (
    <Button variant="contained" color="secondary" onClick={handleLogout}>
      Logout
    </Button>
  ) : (
    <Button variant="contained" color="primary" onClick={handleLogin}>
      Login with Google
    </Button>
  );
}
