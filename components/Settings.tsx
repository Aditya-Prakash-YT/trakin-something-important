import React, { useState } from 'react';
import { FirebaseConfig, AppTheme } from '../types';
import { saveConfig, getStoredConfig, clearConfig, isFirebaseReady, logout } from '../services/firebaseService';
import { User } from 'firebase/auth';
import { Moon, Sun, Monitor, Smartphone } from 'lucide-react';
import clsx from 'clsx';

interface SettingsProps {
  user: User | null;
  onClose: () => void;
  currentTheme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  isMonochrome?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ user, onClose, currentTheme = 'default', onThemeChange, isMonochrome = false }) => {
  const [configStr, setConfigStr] = useState<string>(
    JSON.stringify(getStoredConfig() || {}, null, 2)
  );
  const [showConfig, setShowConfig] = useState(!isFirebaseReady());

  const handleSave = () => {
    try {
      const config: FirebaseConfig = JSON.parse(configStr);
      saveConfig(config);
    } catch (e) {
      alert("Invalid JSON format");
    }
  };

  const handleClear = () => {
    if (confirm("Clear configuration and reset?")) {
      clearConfig();
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto pb-24">
      <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>

      {/* User Account Section */}
      {user ? (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            {user.photoURL && (
              <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full" />
            )}
            <div>
              <p className="font-semibold text-white">{user.displayName || "User"}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full bg-red-500/10 text-red-400 py-2 rounded-lg hover:bg-red-500/20 transition"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <p className="text-gray-300 mb-2">Not signed in.</p>
          <p className="text-sm text-gray-500">Sign in on the Dashboard to sync data.</p>
        </div>
      )}

      {/* App Theme Section */}
      {onThemeChange && (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Monitor size={16} /> App Theme
            </h3>
            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => onThemeChange('default')}
                    className={clsx(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        currentTheme === 'default' 
                            ? "bg-gray-900 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                            : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
                    )}
                >
                    <div className="w-full h-8 rounded bg-[#030712] border border-[#1f2937] relative overflow-hidden">
                        <div className="absolute top-1 left-1 w-4 h-4 rounded bg-[#111827]"></div>
                    </div>
                    <span className="text-xs font-medium">Default</span>
                </button>

                <button
                    onClick={() => onThemeChange('dark')}
                    className={clsx(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        currentTheme === 'dark' 
                            ? "bg-gray-900 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                            : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
                    )}
                >
                    <div className="w-full h-8 rounded bg-[#18181b] border border-[#3f3f46] relative overflow-hidden">
                         <div className="absolute top-1 left-1 w-4 h-4 rounded bg-[#27272a]"></div>
                    </div>
                    <span className="text-xs font-medium">Dark</span>
                </button>

                <button
                    onClick={() => onThemeChange('pitch-black')}
                    className={clsx(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        currentTheme === 'pitch-black' 
                            ? "bg-black border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                            : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
                    )}
                >
                    <div className="w-full h-8 rounded bg-black border border-gray-800 relative overflow-hidden">
                         <div className="absolute top-1 left-1 w-4 h-4 rounded bg-black border border-gray-800"></div>
                    </div>
                    <span className="text-xs font-medium">OLED</span>
                </button>
            </div>
        </div>
      )}

      {/* Firebase Config Section */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Firebase Configuration</h3>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={clsx("text-xs hover:underline", isMonochrome ? "text-white" : "text-indigo-400")}
          >
            {showConfig ? 'Hide' : 'Edit'}
          </button>
        </div>
        
        {showConfig && (
          <>
            <p className="text-xs text-gray-400 mb-2">
              Paste your Firebase config JSON object here to enable Cloud Sync & Auth.
            </p>
            <textarea
              value={configStr}
              onChange={(e) => setConfigStr(e.target.value)}
              className={clsx(
                "w-full h-48 bg-gray-900 text-gray-300 text-xs p-3 rounded-lg font-mono border focus:outline-none",
                isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-700 focus:border-indigo-500"
              )}
              placeholder='{ "apiKey": "...", ... }'
            />
            <div className="flex gap-2 mt-3">
              <button 
                onClick={handleSave}
                className={clsx(
                    "flex-1 py-2 rounded-lg transition font-medium text-white",
                    isMonochrome ? "bg-white text-black hover:bg-gray-200" : "bg-indigo-600 hover:bg-indigo-500"
                )}
              >
                Save & Reload
              </button>
              <button 
                onClick={handleClear}
                className="px-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </>
        )}
        {!showConfig && isFirebaseReady() && (
            <div className="text-green-400 text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Configuration Loaded
            </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-600 mt-8">
        TallyMaster AI v1.0.0
      </div>
    </div>
  );
};