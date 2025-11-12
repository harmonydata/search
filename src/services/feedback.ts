// Dynamic Firebase loading for feedback submission
// Only loads Firebase when feedback is actually submitted to avoid SEO issues

let firebaseModules: any = null;

const loadFirebaseModules = async () => {
  if (firebaseModules) return firebaseModules;

  console.log("🔍 Loading Firebase modules dynamically for feedback");
  const [{ collection, addDoc, serverTimestamp }, { db }] = await Promise.all([
    import("firebase/firestore/lite"),
    import("../firebase"),
  ]);

  firebaseModules = {
    collection,
    addDoc,
    serverTimestamp,
    db,
  };

  return firebaseModules;
};

export const submitFeedback = async (rating: number, comment?: string) => {
  try {
    const { db, collection, addDoc, serverTimestamp } =
      await loadFirebaseModules();

    const feedbackData = {
      uid: "anon", // Anonymous user since this is for general feedback
      rating,
      comment: comment || "",
      created: serverTimestamp(),
      source: "discoverynext", // To distinguish from harmony app feedback
    };

    const docRef = await addDoc(collection(db, "ratings"), feedbackData);
    console.log("Feedback submitted with ID: ", docRef.id);
    return docRef;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw error;
  }
};
