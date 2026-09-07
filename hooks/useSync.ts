"use client";

import { useState, useEffect } from "react";
import { syncDatabase } from "@/lib/syncService";

export type SyncInterval = "realtime" | "hourly" | "daily" | "weekly" | "manual";
type SyncStatus = "idle" | "syncing" | "offline" | "error" | "success";

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [syncIntervalPref, setSyncIntervalPref] = useState<SyncInterval>("realtime");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastSyncedTime(localStorage.getItem('last_synced_timestamp'));
      const pref = (localStorage.getItem('auto_sync_interval') as SyncInterval) || "realtime";
      setSyncIntervalPref(pref);
    }
  }, []);

  const runSync = async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    
    setStatus("syncing");
    setError(null);
    try {
      await syncDatabase();
      setStatus("success");
      setLastSyncedTime(localStorage.getItem('last_synced_timestamp'));
      setTimeout(() => {
        setStatus(prev => prev === "success" ? "idle" : prev);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error occurred during sync.");
      setStatus("error");
    }
  };

  useEffect(() => {
    const handlePrefChange = () => {
      const pref = (localStorage.getItem('auto_sync_interval') as SyncInterval) || "realtime";
      setSyncIntervalPref(pref);
    };
    window.addEventListener('sync-pref-change', handlePrefChange);
    return () => window.removeEventListener('sync-pref-change', handlePrefChange);
  }, []);

  useEffect(() => {
    // We only run initial sync on mount if not manual
    if (syncIntervalPref !== "manual") {
      runSync();
    }

    // Event listeners
    const handleOnline = () => {
      if (syncIntervalPref !== "manual") runSync();
    };
    const handleOffline = () => setStatus("offline");
    
    let syncTimeout: any = null;
    const handleDbMutation = () => {
      if (syncIntervalPref === "realtime") {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          runSync();
        }, 500); // Debounce sync by 500ms
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("db-mutation", handleDbMutation);

    let intervalTime = 0;
    if (syncIntervalPref === "hourly") intervalTime = 3600000;
    else if (syncIntervalPref === "daily") intervalTime = 86400000;
    else if (syncIntervalPref === "weekly") intervalTime = 604800000;
    // For realtime we can still do a periodic check every 1h just in case
    else if (syncIntervalPref === "realtime") intervalTime = 3600000;

    let interval: any = null;
    if (intervalTime > 0) {
      interval = setInterval(runSync, intervalTime);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("db-mutation", handleDbMutation);
      if (syncTimeout) clearTimeout(syncTimeout);
      if (interval) clearInterval(interval);
    };
  }, [syncIntervalPref]);

  return { status, error, lastSyncedTime, runSync, triggerManualSync: runSync, syncIntervalPref };
}
