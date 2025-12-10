

import React, { useState } from 'react';
import { ThemeSettings, BaseTheme, ComponentTheme } from '../types';
import { isFirebaseReady, logout } from '../services/firebaseService';
import { User } from 'firebase/auth';
import { Monitor, Layout, LogOut, Database } from 'lucide-react';
import clsx from 'clsx';

interface SettingsProps {
  user: User | null;
  onClose: () => void;
  settings: ThemeSettings;
  onSettingsChange: (settings: Partial<ThemeSettings>) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onClose, settings, onSettingsChange }) => {

  const handleLogout = async () => {
    await logout();
    onClose();
    window.location.reload();
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
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xl">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="font-semibold text-white truncate">{user.displayName || "User"}</p>
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          
          <div className="mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 flex items-start gap-3">
             <Database className="text-green-500 shrink-0 mt-0.5" size={16} />
             <div>
                 <p className="text-xs font-bold text-gray-300">Connected to Secondary DB</p>
                 <p className="text-[10px] text-gray-500 mt-1">Your data is stored in your personal Firebase instance. Configuration is synced securely.</p>
             </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full bg-red-500/10 text-red-400 py-2 rounded-lg hover:bg-red-500/20 transition flex items-center justify-center gap-2 font-medium"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <p className="text-gray-300 mb-2 font-medium">Local Mode</p>
          <p className="text-sm text-gray-500 mb-4">Sign in to sync data across devices using your own database.</p>
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
                            ? "bg-gray-900 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                            : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600"
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
                            ? "bg-black border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                            : "bg-gray-950 border-gray-700 text-gray-400 hover:border-gray-600"
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

      <div className="text-center text-xs text-gray-600 mt-8">
        TallyMaster v2.0 &bull; Dual-DB Architecture
      </div>
    </div>
  );
};