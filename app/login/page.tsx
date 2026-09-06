"use client";

import { useState } from "react";
import { authenticateUser, User } from "@/lib/db";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSync } from "@/hooks/useSync";
import { RefreshCw, User as UserIcon, KeyRound, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [cnic, setCnic] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { status } = useSync();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await authenticateUser(username, cnic);
      if (user) {
        login(user);
      } else {
        setError("Invalid username or CNIC. Please check your credentials.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">ZeestPOS</h1>
          <p className="text-slate-500 dark:text-slate-400">Enter your credentials to continue</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:text-slate-100"
                placeholder="e.g. Admin"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CNIC Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:text-slate-100"
                placeholder="00000-0000000-0"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
        </form>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            Sync Status: 
            <span className={
              status === 'idle' ? 'text-emerald-500 font-medium' :
              status === 'syncing' ? 'text-blue-500 font-medium animate-pulse' :
              'text-red-500 font-medium'
            }>
              {status === 'idle' ? 'Cloud Synced' : status === 'syncing' ? 'Syncing...' : 'Offline'}
            </span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            New employees created by Admin will be synced automatically when online.
          </p>
        </div>
      </div>
    </div>
  );
}
