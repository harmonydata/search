"use client";

import { useState, useEffect } from "react";
import { IconButton, CircularProgress } from "@mui/material";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFirebase } from "@/contexts/FirebaseContext";
import { SearchResult } from "@/services/api";

interface BookmarkButtonProps {
  study: SearchResult;
  isDrawerView?: boolean;
}

const BookmarkButton = ({
  study,
  isDrawerView = false,
}: BookmarkButtonProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedResourceId, setSavedResourceId] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const { checkIfResourceSaved, saveResource, unsaveResource } = useFirebase();

  // Check if resource is already saved
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!currentUser || !study.extra_data?.uuid) return;

      try {
        const result = await checkIfResourceSaved(
          currentUser.uid,
          study.extra_data.uuid
        );
        setIsSaved(result.isSaved);
        setSavedResourceId(result.resourceId || null);
      } catch (error) {
        console.error("Error checking if resource is saved:", error);
      }
    };

    checkIfSaved();
  }, [currentUser, study.extra_data?.uuid, checkIfResourceSaved]);

  const toggleSave = async () => {
    if (!currentUser || !study.extra_data?.uuid || saving) return;

    setSaving(true);
    try {
      if (isSaved && savedResourceId) {
        await unsaveResource(savedResourceId);
        setIsSaved(false);
        setSavedResourceId(null);
      } else {
        const title =
          study.dataset_schema?.name ||
          study.extra_data?.name ||
          "Untitled Dataset";
        const description =
          study.extra_data?.ai_summary ||
          study.dataset_schema?.description ||
          study.extra_data?.description ||
          "";
        const image =
          (study.dataset_schema as any)?.image || (study as any).image || null;
        const aiSummary = study.extra_data?.ai_summary || null;

        const resourceData = {
          title: title,
          description: aiSummary || description,
          image: image || null,
          uuid: study.extra_data.uuid,
          slug: study.extra_data.slug || null,
          resourceType: study.extra_data.resource_type || null,
          keywords: study.dataset_schema?.keywords || [],
          variablesCount:
            study.dataset_schema?.variableMeasured?.length ||
            study.dataset_schema?.number_of_variables ||
            0,
          datasetsCount: study.child_datasets?.length || 0,
          hasDataAvailable:
            !!study.dataset_schema?.includedInDataCatalog?.length,
          hasFreeAccess: study.hasFreeAccess || false,
          hasCohortsAvailable: study.hasCohortsAvailable || false,
        };

        const resourceId = await saveResource(currentUser.uid, resourceData);
        setIsSaved(true);
        setSavedResourceId(resourceId);
      }
    } catch (error) {
      console.error("Error saving/unsaving resource:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <IconButton
      onClick={toggleSave}
      disabled={saving}
      sx={{
        color: isSaved ? "primary.main" : "text.secondary",
        "&:hover": {
          color: isSaved ? "primary.dark" : "primary.main",
        },
      }}
      title={isSaved ? "Remove from saved" : "Save to my resources"}
    >
      {saving ? (
        <CircularProgress size={20} />
      ) : (
        <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
      )}
    </IconButton>
  );
};

export default BookmarkButton;
