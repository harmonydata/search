"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Firebase modules will be dynamically imported when needed
// This prevents them from being bundled unless actually used
let firebaseFirestoreModules: any = null;
let firebaseDb: any = null;

const loadFirebaseFirestoreModules = async () => {
  if (firebaseFirestoreModules) return firebaseFirestoreModules;

  console.log("🔍 Loading Firebase Firestore modules dynamically");
  const [
    {
      collection,
      query,
      where,
      getDocs,
      addDoc,
      deleteDoc,
      doc,
      serverTimestamp,
    },
    { db },
  ] = await Promise.all([
    import("firebase/firestore/lite"),
    import("../../firebase"),
  ]);

  firebaseFirestoreModules = {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
  };
  firebaseDb = db;

  return { ...firebaseFirestoreModules, db };
};

interface FirebaseContextType {
  // Firestore operations for saved resources
  checkIfResourceSaved: (
    userId: string,
    uuid: string
  ) => Promise<{ isSaved: boolean; resourceId?: string }>;
  saveResource: (userId: string, resourceData: any) => Promise<string>;
  unsaveResource: (resourceId: string) => Promise<void>;

  // Feedback operations
  submitFeedback: (rating: number, comment?: string) => Promise<any>;

  // Ready state
  firestoreReady: boolean;
}

// Default context value for SSR - no-op functions that don't throw errors
const defaultFirebaseContext: FirebaseContextType = {
  checkIfResourceSaved: async () => ({ isSaved: false }),
  saveResource: async () => {
    throw new Error("Firebase not available on server");
  },
  unsaveResource: async () => {
    throw new Error("Firebase not available on server");
  },
  submitFeedback: async () => {
    throw new Error("Firebase not available on server");
  },
  firestoreReady: false,
};

const FirebaseContext = createContext<FirebaseContextType>(
  defaultFirebaseContext
);

export function useFirebase() {
  const context = useContext(FirebaseContext);
  return context;
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [firestoreReady, setFirestoreReady] = useState(false);

  // Only run Firebase logic on client side
  useEffect(() => {
    if (typeof window === "undefined") {
      // During SSR, don't load Firebase
      setFirestoreReady(false);
      return;
    }

    // Load Firebase modules dynamically
    const initializeFirebase = async () => {
      try {
        await loadFirebaseFirestoreModules();
        setFirestoreReady(true);
      } catch (error) {
        console.error("Failed to load Firebase Firestore modules:", error);
        setFirestoreReady(false);
      }
    };

    initializeFirebase();
  }, []);

  // Firestore functions - only work on client side
  const firebaseFunctions = React.useMemo(() => {
    if (typeof window === "undefined" || !firestoreReady) {
      // Server side or not ready - return no-op functions
      return {
        checkIfResourceSaved: async () => ({ isSaved: false }),
        saveResource: async () => {
          throw new Error("Firebase not available on server");
        },
        unsaveResource: async () => {
          throw new Error("Firebase not available on server");
        },
        submitFeedback: async () => {
          throw new Error("Firebase not available on server");
        },
      };
    }

    return {
      checkIfResourceSaved: async (userId: string, uuid: string) => {
        const { collection, query, where, getDocs } =
          await loadFirebaseFirestoreModules();

        const q = query(
          collection(firebaseDb, "saved_resources"),
          where("uid", "==", userId),
          where("uuid", "==", uuid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          return { isSaved: true, resourceId: doc.id };
        }
        return { isSaved: false };
      },

      saveResource: async (userId: string, resourceData: any) => {
        const { collection, addDoc, serverTimestamp } =
          await loadFirebaseFirestoreModules();

        const dataWithTimestamp = {
          ...resourceData,
          uid: userId,
          created: serverTimestamp(),
        };

        const docRef = await addDoc(
          collection(firebaseDb, "saved_resources"),
          dataWithTimestamp
        );
        return docRef.id;
      },

      unsaveResource: async (resourceId: string) => {
        const { deleteDoc, doc } = await loadFirebaseFirestoreModules();
        await deleteDoc(doc(firebaseDb, "saved_resources", resourceId));
      },

      submitFeedback: async (rating: number, comment?: string) => {
        const { collection, addDoc, serverTimestamp } =
          await loadFirebaseFirestoreModules();

        const feedbackData = {
          uid: "anon", // Anonymous user since this is for general feedback
          rating,
          comment: comment || "",
          created: serverTimestamp(),
          source: "discoverynext", // To distinguish from harmony app feedback
        };

        const docRef = await addDoc(
          collection(firebaseDb, "ratings"),
          feedbackData
        );
        return docRef;
      },
    };
  }, [firestoreReady]);

  const value: FirebaseContextType = {
    ...firebaseFunctions,
    firestoreReady,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}
