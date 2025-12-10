
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, Database, Check, Loader2, BookOpen } from 'lucide-react';
import { loginUser, registerUser } from '../services/firebaseService';
import { FirebaseConfig } from '../types';
import { TutorialModal } from './TutorialModal';
import clsx from 'clsx';

interface AuthModalProps {
  onClose: () => void;
}

type Step = 'credentials' | 'database';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ElementType;
}

const InputField: React.FC<InputFieldProps> = ({ label, icon: Icon, className, ...props }) => (
  <div className="space-y-1.5 group">
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-indigo-400 transition-colors duration-300">
      {label}
    </label>
    <div className="relative transform transition-all duration-300 group-focus-within:-translate-y-0.5">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors duration-300">
        <Icon size={18} />
      </div>
      <input 
        {...props}
        className={clsx(
          "w-full bg-gray-950/50 border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:bg-gray-950 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      />
    </div>
  </div>
);

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [step, setStep] = useState<Step>('credentials');
  const [showTutorial, setShowTutorial] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [dbConfigStr, setDbConfigStr] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Reset step when toggling mode
  useEffect(() => {
    setStep('credentials');
    setError(null);
  }, [isSignup]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (isSignup && step === 'credentials') {
        if (!name.trim()) { setError("Name required"); return; }
        if (!email.trim() || !password.trim()) { setError("Email and Password required"); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
        setError(null);
        setStep('database');
    } else {
        handleSubmit();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        // Validation for JSON
        let config: FirebaseConfig;
        try {
            config = JSON.parse(dbConfigStr);
            if (!config.apiKey || !config.projectId) throw new Error("Invalid config");
        } catch (err) {
            throw new Error("Invalid JSON Configuration. Please copy directly from Firebase Console.");
        }

        setLoadingText("Creating Account...");
        // Registration Flow
        await registerUser(name, email, password, config);
        
      } else {
        setLoadingText("Authenticating...");
        // Login Flow
        await loginUser(email, password);
      }
      // Brief success state before closing
      setTimeout(onClose, 500);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Authentication failed.";
      if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
      if (err.code === 'auth/user-not-found') msg = "No user found with this email.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use in the primary system.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <>
    {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
      <div 
        className="bg-gray-900 w-full max-w-md p-8 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 scale-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Animated Background Elements */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
                {isSignup ? (step === 'credentials' ? 'Create Account' : 'Connect Database') : 'Welcome Back'}
            </h2>
            <div className="h-1 w-12 bg-indigo-500 rounded-full mt-2 transition-all duration-500" style={{ width: isSignup && step === 'database' ? '100px' : '48px' }}></div>
            {isSignup && step === 'database' && (
                <p className="text-xs text-gray-400 mt-2 animate-in fade-in slide-in-from-left-2">Step 2 of 2: Configuration</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3 shrink-0 animate-in slide-in-from-top-2 fade-in">
            <div className="mt-0.5 p-1 bg-red-500/20 rounded-full">
                <X size={12} strokeWidth={3} />
            </div>
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleNext} className="relative z-10 flex-1 overflow-y-auto pr-1 no-scrollbar -mr-1">
          
          {step === 'credentials' && (
            <div className="space-y-5 animate-in slide-in-from-right-8 fade-in duration-300 fill-mode-forwards pb-2">
                {isSignup && (
                    <InputField 
                        label="Full Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        icon={UserIcon}
                        autoFocus
                        disabled={loading}
                    />
                )}

                <InputField 
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    icon={Mail}
                    disabled={loading}
                />

                <InputField 
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    icon={Lock}
                    disabled={loading}
                />
            </div>
          )}

          {step === 'database' && (
              <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300 fill-mode-forwards pb-2">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl relative">
                      <h4 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                          <Database size={16} /> Data Sovereignty
                      </h4>
                      <p className="text-xs text-indigo-200/70 leading-relaxed mb-4">
                          TallyMaster separates authentication from data. We authenticate you, but <strong>you own the database</strong>. 
                          Please paste your Firebase Project configuration below.
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => setShowTutorial(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border border-indigo-500/20 ml-auto"
                      >
                         <BookOpen size={12} />
                         Tutorial
                      </button>
                  </div>
                  
                  <div className="space-y-2 group">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider group-focus-within:text-indigo-400 transition-colors">
                            Configuration JSON
                        </label>
                        <a 
                            href="https://console.firebase.google.com/" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline transition-colors flex items-center gap-1"
                        >
                             Get from Console <ArrowRight size={10} />
                        </a>
                    </div>
                    <textarea 
                        value={dbConfigStr}
                        onChange={(e) => setDbConfigStr(e.target.value)}
                        placeholder='{ "apiKey": "AIza...", "authDomain": "...", "projectId": "..." }'
                        disabled={loading}
                        className="w-full h-40 bg-gray-950/50 border border-gray-800 rounded-xl p-4 text-xs font-mono text-gray-300 placeholder-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:bg-gray-950 focus:outline-none transition-all duration-300 resize-none disabled:opacity-50"
                    />
                  </div>
              </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="mt-8 space-y-4 shrink-0 relative z-10">
            <button 
                onClick={handleNext}
                disabled={loading}
                className={clsx(
                    "w-full py-4 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group",
                    loading 
                        ? "bg-gray-800 text-gray-400 cursor-wait" 
                        : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
                )}
            >
                <span className={clsx("flex items-center gap-2 transition-all duration-300", loading ? "opacity-0 scale-90" : "opacity-100 scale-100")}>
                    {isSignup ? (step === 'credentials' ? 'Next Step' : 'Create Account') : 'Log In'}
                    {isSignup && step === 'credentials' ? <ArrowRight size={18} /> : <Check size={18} />}
                </span>
                
                {/* Loading Overlay */}
                <div className={clsx("absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300", loading ? "opacity-100 scale-100" : "opacity-0 scale-110")}>
                     <Loader2 size={20} className="animate-spin" />
                     <span className="text-sm font-medium">{loadingText}</span>
                </div>
            </button>

            <div className="text-center">
                <p className="text-gray-500 text-sm">
                    {isSignup ? 'Already have an account?' : "Don't have an account yet?"}
                    <button 
                        onClick={() => {
                            if (!loading) {
                                setIsSignup(!isSignup);
                            }
                        }}
                        disabled={loading}
                        className="ml-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors hover:underline disabled:opacity-50"
                    >
                    {isSignup ? 'Log In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>

      </div>
    </div>
    </>
  );
};
