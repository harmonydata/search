"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

// Firebase modules will be dynamically imported when needed
// This prevents them from being bundled unless actually used
let firebaseFirestoreModules: any = null;
let firebaseDb: any = null;

// Cache for saved resources: userId -> Map<uuid, { isSaved: boolean, resourceId?: string }>
type SavedResourceCache = Map<
  string,
  { isSaved: boolean; resourceId?: string }
>;
const SAVED_RESOURCES_CACHE_KEY = "discoverynext_saved_resources_cache";

// Load cache from localStorage
const loadCacheFromStorage = (): Map<string, SavedResourceCache> => {
  if (typeof window === "undefined") return new Map();

  try {
    const stored = localStorage.getItem(SAVED_RESOURCES_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const cache = new Map<string, SavedResourceCache>();
      for (const [userId, userCache] of Object.entries(parsed)) {
        cache.set(userId, new Map(Object.entries(userCache as any)));
      }
      return cache;
    }
  } catch (error) {
    console.error(
      "Error loading saved resources cache from localStorage:",
      error
    );
  }
  return new Map();
};

// Save cache to localStorage
const saveCacheToStorage = (cache: Map<string, SavedResourceCache>) => {
  if (typeof window === "undefined") return;

  try {
    const serializable: Record<string, Record<string, any>> = {};
    for (const [userId, userCache] of cache.entries()) {
      serializable[userId] = Object.fromEntries(userCache);
    }
    localStorage.setItem(
      SAVED_RESOURCES_CACHE_KEY,
      JSON.stringify(serializable)
    );
  } catch (error) {
    console.error("Error saving saved resources cache to localStorage:", error);
  }
};

const loadFirebaseFirestoreModules = async () => {
  if (firebaseFirestoreModules) return firebaseFirestoreModules;

  console.log("🔍 Loading Firebase Firestore modules dynamically");
  const [
    {
      collection,
      query,
      where,
      getDocs,
      getDoc,
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
    getDoc,
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
  
  // Cache for saved resources: userId -> Map<uuid, { isSaved, resourceId }>
  const savedResourcesCacheRef = useRef<Map<string, SavedResourceCache>>(
    loadCacheFromStorage()
  );

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
        // Check cache first
        const userCache = savedResourcesCacheRef.current.get(userId);
        if (userCache) {
          const cached = userCache.get(uuid);
          if (cached !== undefined) {
            return cached;
          }
        }

        // Cache miss - fetch from Firebase
        const { collection, query, where, getDocs } =
          await loadFirebaseFirestoreModules();

        const q = query(
          collection(firebaseDb, "saved_resources"),
          where("uid", "==", userId),
          where("uuid", "==", uuid)
        );
        const querySnapshot = await getDocs(q);

        const result = querySnapshot.empty
          ? { isSaved: false }
          : { isSaved: true, resourceId: querySnapshot.docs[0].id };

        // Update cache
        if (!savedResourcesCacheRef.current.has(userId)) {
          savedResourcesCacheRef.current.set(userId, new Map());
        }
        savedResourcesCacheRef.current.get(userId)!.set(uuid, result);
        saveCacheToStorage(savedResourcesCacheRef.current);

        return result;
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
        
        // Update cache
        if (!savedResourcesCacheRef.current.has(userId)) {
          savedResourcesCacheRef.current.set(userId, new Map());
        }
        const uuid = resourceData.uuid;
        savedResourcesCacheRef.current.get(userId)!.set(uuid, {
          isSaved: true,
          resourceId: docRef.id,
        });
        saveCacheToStorage(savedResourcesCacheRef.current);

        return docRef.id;
      },

      unsaveResource: async (resourceId: string) => {
        const { deleteDoc, doc, getDoc } =
          await loadFirebaseFirestoreModules();
        
        // First, get the document to find userId and uuid for cache update
        const docRef = doc(firebaseDb, "saved_resources", resourceId);
        const docSnapshot = await getDoc(docRef);
        
        if (docSnapshot.exists()) {
          const docData = docSnapshot.data();
          const userId = docData.uid;
          const uuid = docData.uuid;
          
          // Delete from Firebase
          await deleteDoc(docRef);
          
          // Update cache
          const userCache = savedResourcesCacheRef.current.get(userId);
          if (userCache && uuid) {
            userCache.set(uuid, { isSaved: false });
            saveCacheToStorage(savedResourcesCacheRef.current);
          }
        } else {
          // Document doesn't exist, just try to delete anyway
          await deleteDoc(docRef);
        }
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
