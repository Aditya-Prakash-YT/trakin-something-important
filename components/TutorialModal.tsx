
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Copy, Check, ExternalLink, Shield, Database, Settings, Key } from 'lucide-react';
import clsx from 'clsx';

interface TutorialModalProps {
  onClose: () => void;
}

const STEPS = [
  { id: 1, title: 'Project & Auth', icon: Key },
  { id: 2, title: 'Database', icon: Database },
  { id: 3, title: 'Security Rules', icon: Shield },
  { id: 4, title: 'Get Config', icon: Settings },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const RULES_CODE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(RULES_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextStep = () => setCurrentStep(p => Math.min(p + 1, 4));
  const prevStep = () => setCurrentStep(p => Math.max(p - 1, 1));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 w-full max-w-4xl h-[85vh] rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Setup Guide</h2>
            <p className="text-gray-400 text-sm mt-1">Configure your own Firebase backend in 4 steps.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Sidebar Steps (Desktop) */}
          <div className="hidden md:flex flex-col w-64 bg-gray-950/50 border-r border-gray-800 p-6 space-y-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left",
                    isActive ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" : "text-gray-500 hover:bg-gray-900 hover:text-gray-300"
                  )}
                >
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors",
                    isActive ? "bg-indigo-600 text-white border-indigo-500" : 
                    isCompleted ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-gray-800 border-gray-700 text-gray-400"
                  )}>
                    {isCompleted ? <Check size={14} /> : step.id}
                  </div>
                  <span className={clsx("font-medium text-sm", isActive && "font-bold")}>{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-900 relative no-scrollbar">
            
            {/* Step 1: Project & Auth */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                      <Key size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Create Project & Enable Auth</h3>
                      <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 text-sm hover:underline flex items-center gap-1">
                        Go to Firebase Console <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <ol className="space-y-6 text-gray-300 list-decimal list-inside marker:text-gray-600">
                    <li className="pl-2">
                      Click <strong>Create a project</strong> (or Add project). Name it <strong>TallyMaster</strong> (or any name you prefer). 
                      <p className="text-xs text-gray-500 mt-1 ml-4 bg-gray-950 p-2 rounded-lg border border-gray-800 inline-block">Tip: You can disable Google Analytics to make setup faster.</p>
                    </li>
                    <li className="pl-2">
                      Once created, go to <strong>Build</strong> in the sidebar and select <strong>Authentication</strong>.
                    </li>
                    <li className="pl-2">
                      Click <strong>Get Started</strong>.
                    </li>
                    <li className="pl-2">
                      Select <strong>Email/Password</strong> from the Sign-in method list.
                    </li>
                    <li className="pl-2">
                      Enable the <strong>Email/Password</strong> toggle and click <strong>Save</strong>.
                    </li>
                  </ol>
                </div>
                
                <div className="w-full aspect-video bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500 flex-col gap-2">
                   <div className="w-16 h-12 bg-gray-700 rounded-lg"></div>
                   <span className="text-xs uppercase font-bold tracking-widest">Image: Auth Setup Screen</span>
                </div>
              </div>
            )}

            {/* Step 2: Database */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                      <Database size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Create Firestore Database</h3>
                  </div>

                  <ol className="space-y-6 text-gray-300 list-decimal list-inside marker:text-gray-600">
                    <li className="pl-2">
                      In the sidebar, go to <strong>Build</strong> and select <strong>Firestore Database</strong>.
                    </li>
                    <li className="pl-2">
                      Click <strong>Create Database</strong>.
                    </li>
                    <li className="pl-2">
                      Choose a location (e.g., <em>nam5 (us-central)</em> is fine). Click Next.
                    </li>
                    <li className="pl-2">
                      Select <strong>Start in production mode</strong> and click <strong>Create</strong>.
                    </li>
                  </ol>
                </div>

                <div className="w-full aspect-video bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500 flex-col gap-2">
                   <div className="w-16 h-12 bg-gray-700 rounded-lg"></div>
                   <span className="text-xs uppercase font-bold tracking-widest">Image: Firestore Creation</span>
                </div>
              </div>
            )}

            {/* Step 3: Rules */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                      <Shield size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Set Security Rules</h3>
                  </div>

                  <p className="text-gray-300 leading-relaxed">
                    By default, production databases lock everyone out. We need to add a rule so users can only access their own data.
                  </p>

                  <ol className="space-y-4 text-gray-300 list-decimal list-inside marker:text-gray-600">
                    <li className="pl-2">
                      In the Firestore panel, click the <strong>Rules</strong> tab at the top.
                    </li>
                    <li className="pl-2">
                      Delete the existing code and paste the code below:
                    </li>
                  </ol>

                  <div className="relative group">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={handleCopy}
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          copied ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                        )}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="bg-gray-950 border border-gray-800 rounded-xl p-5 overflow-x-auto text-sm font-mono text-gray-300 leading-relaxed">
                      <code>{RULES_CODE}</code>
                    </pre>
                  </div>
                  
                  <p className="text-gray-300 pl-2 border-l-2 border-yellow-500 ml-1">
                    Click <strong>Publish</strong> to save the rules.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Config */}
            {currentStep === 4 && (
              <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                <div className="space-y-4">
                   <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                      <Settings size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Get Configuration</h3>
                  </div>

                  <ol className="space-y-6 text-gray-300 list-decimal list-inside marker:text-gray-600">
                    <li className="pl-2">
                      Click the <strong>Project Settings</strong> (gear icon) in the top left sidebar.
                    </li>
                    <li className="pl-2">
                      Scroll down to the <strong>Your apps</strong> section.
                    </li>
                    <li className="pl-2">
                      Click the <strong>&lt;/&gt;</strong> (Web) icon to add a web app.
                    </li>
                    <li className="pl-2">
                      Enter a nickname (e.g., "Web") and click <strong>Register app</strong>.
                      <span className="text-gray-500 text-xs block mt-1">(You do not need to set up Firebase Hosting)</span>
                    </li>
                    <li className="pl-2">
                      Copy the code object under "SDK setup and configuration".
                    </li>
                    <li className="pl-2 font-bold text-white">
                      Paste the code directly into the TallyMaster configuration box. You do not need to convert it to JSON.
                    </li>
                  </ol>
                  
                   <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-xs text-gray-500">
                     <span className="text-purple-400">const</span> firebaseConfig = <span className="text-yellow-400">{'{'}</span><br/>
                     &nbsp;&nbsp;apiKey: <span className="text-green-400">"..."</span>,<br/>
                     &nbsp;&nbsp;...<br/>
                     <span className="text-yellow-400">{'}'}</span>;
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-gray-800 bg-gray-900 flex justify-between items-center sticky bottom-0 z-20">
          <button 
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-0"
          >
            Back
          </button>
          
          <div className="flex gap-2">
            {STEPS.map(s => (
                <div key={s.id} className={clsx("w-2 h-2 rounded-full transition-all", s.id === currentStep ? "bg-indigo-500 w-6" : "bg-gray-700")} />
            ))}
          </div>

          {currentStep < 4 ? (
            <button 
                onClick={nextStep}
                className="px-6 py-3 rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition flex items-center gap-2"
            >
                Next <ChevronRight size={18} />
            </button>
          ) : (
            <button 
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
                I'm Ready <Check size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
