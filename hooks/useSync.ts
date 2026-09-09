"use client";

import { useState, useEffect, useRef } from "react";
import { syncDatabase } from "@/lib/syncService";

export type SyncInterval = "realtime" | "hourly" | "daily" | "weekly" | "manual";
type SyncStatus = "idle" | "syncing" | "offline" | "error" | "success";

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [syncIntervalPref, setSyncIntervalPref] = useState<SyncInterval>("realtime");
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastSyncedTime(localStorage.getItem('last_synced_timestamp'));
      const pref = (localStorage.getItem('auto_sync_interval') as SyncInterval) || "realtime";
      setSyncIntervalPref(pref);
    }
  }, []);

  const runSync = async (forceFull: boolean = false) => {
    // Prevent concurrent syncs at the hook level
    if (isSyncingRef.current) return;
    
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    
    isSyncingRef.current = true;
    setStatus("syncing");
    setError(null);
    try {
      await syncDatabase(forceFull);
      setStatus("success");
      setLastSyncedTime(localStorage.getItem('last_synced_timestamp'));
      setTimeout(() => {
        setStatus(prev => prev === "success" ? "idle" : prev);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error occurred during sync.");
      setStatus("error");
    } finally {
      isSyncingRef.current = false;
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
    // Run initial sync on mount if not manual
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
        // Debounce by 500ms for ultra-fast sync (previously 2000ms)
        syncTimeout = setTimeout(() => {
          runSync();
        }, 500);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("db-mutation", handleDbMutation);

    let intervalTime = 0;
    if (syncIntervalPref === "hourly") intervalTime = 3600000;
    else if (syncIntervalPref === "daily") intervalTime = 86400000;
    else if (syncIntervalPref === "weekly") intervalTime = 604800000;
    // For realtime, do a periodic background check every 10 seconds (was 2 minutes)
    else if (syncIntervalPref === "realtime") intervalTime = 10000;

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
