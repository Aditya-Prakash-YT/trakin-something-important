import React, { useState } from 'react';
import { FirebaseConfig } from '../types';
import { saveConfig, getStoredConfig, clearConfig, isFirebaseReady, logout } from '../services/firebaseService';
import { User } from 'firebase/auth';

interface SettingsProps {
  user: User | null;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onClose }) => {
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

      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Firebase Configuration</h3>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs text-indigo-400 hover:text-indigo-300"
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
              className="w-full h-48 bg-gray-900 text-gray-300 text-xs p-3 rounded-lg font-mono border border-gray-700 focus:border-indigo-500 focus:outline-none"
              placeholder='{ "apiKey": "...", ... }'
            />
            <div className="flex gap-2 mt-3">
              <button 
                onClick={handleSave}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-500 transition font-medium"
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