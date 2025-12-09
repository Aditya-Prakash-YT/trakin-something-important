
import React, { useState } from 'react';
import { FirebaseConfig, ThemeSettings, BaseTheme, ComponentTheme } from '../types';
import { saveConfig, getStoredConfig, clearConfig, isFirebaseReady, logout } from '../services/firebaseService';
import { User } from 'firebase/auth';
import { Moon, Monitor, Eye, Layout } from 'lucide-react';
import clsx from 'clsx';

interface SettingsProps {
  user: User | null;
  onClose: () => void;
  settings: ThemeSettings;
  onSettingsChange: (settings: Partial<ThemeSettings>) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onClose, settings, onSettingsChange }) => {
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

  const BaseThemeButton = ({ value, label, color }: { value: BaseTheme, label: string, color: string }) => (
    <button
        onClick={() => onSettingsChange({ base: value })}
        className={clsx(
            "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
            settings.base === value 
                ? "bg-gray-900 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
        )}
    >
        <div 
            className="w-full h-8 rounded border border-white/10 relative overflow-hidden" 
            style={{ backgroundColor: color }}
        >
        </div>
        <span className="text-xs font-medium">{label}</span>
    </button>
  );

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

      {/* Theme Customization Section */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-6">
          
          {/* Base Theme */}
          <div>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Monitor size={16} /> Base Theme
            </h3>
            <div className="grid grid-cols-3 gap-2">
                <BaseThemeButton value="default" label="Default" color="#030712" />
                <BaseThemeButton value="medium-dark" label="Medium" color="#0f172a" />
                <BaseThemeButton value="dark" label="Dark" color="#18181b" />
                <BaseThemeButton value="extra-dark" label="Extra Dark" color="#09090b" />
                <BaseThemeButton value="oled" label="OLED" color="#000000" />
            </div>
          </div>

          {/* Component Theme */}
          <div>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Layout size={16} /> Component Style
            </h3>
             <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => onSettingsChange({ component: 'default' })}
                    className={clsx(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        settings.component === 'default' 
                            ? "bg-gray-900 border-indigo-500 text-white" 
                            : "bg-gray-900/50 border-gray-700 text-gray-400"
                    )}
                >
                    <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700"></div>
                    <div>
                        <span className="block text-xs font-bold">Standard</span>
                        <span className="block text-[10px] opacity-70">Balanced look</span>
                    </div>
                </button>
                
                <button
                    onClick={() => onSettingsChange({ component: 'high-contrast' })}
                    className={clsx(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        settings.component === 'high-contrast' 
                            ? "bg-black border-white text-white" 
                            : "bg-gray-950 border-gray-700 text-gray-400"
                    )}
                >
                    <div className="w-8 h-8 rounded-lg bg-black border border-gray-500"></div>
                     <div>
                        <span className="block text-xs font-bold">Contrast</span>
                        <span className="block text-[10px] opacity-70">Darker cards</span>
                    </div>
                </button>
             </div>
          </div>

      </div>

      {/* Firebase Config Section */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Firebase Configuration</h3>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs hover:underline text-indigo-400"
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
              className="w-full h-48 bg-gray-900 text-gray-300 text-xs p-3 rounded-lg font-mono border focus:outline-none border-gray-700 focus:border-indigo-500"
              placeholder='{ "apiKey": "...", ... }'
            />
            <div className="flex gap-2 mt-3">
              <button 
                onClick={handleSave}
                className="flex-1 py-2 rounded-lg transition font-medium text-white bg-indigo-600 hover:bg-indigo-500"
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
        TallyMaster AI v1.0.1
      </div>
    </div>
  );
};
