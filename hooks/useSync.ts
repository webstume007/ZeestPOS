"use client";

import { useState, useEffect } from "react";
import { syncDatabase } from "@/lib/syncService";

type SyncStatus = "idle" | "syncing" | "offline" | "error";

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");

  const runSync = async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    
    setStatus("syncing");
    try {
      await syncDatabase();
      setStatus("idle");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  useEffect(() => {
    // Initial sync
    runSync();

    // Event listeners
    const handleOnline = () => {
      runSync();
    };
    const handleOffline = () => setStatus("offline");
    
    let syncTimeout: any = null;
    const handleDbMutation = () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        runSync();
      }, 500); // Debounce sync by 500ms
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("db-mutation", handleDbMutation);

    // 1 hour interval
    const interval = setInterval(runSync, 3600000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("db-mutation", handleDbMutation);
      if (syncTimeout) clearTimeout(syncTimeout);
      clearInterval(interval);
    };
  }, []);

  return { status, runSync, triggerManualSync: runSync };
}
