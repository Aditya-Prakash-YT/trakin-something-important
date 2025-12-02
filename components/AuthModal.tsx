import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, LogIn, ArrowRight } from 'lucide-react';
import { loginUser, registerUser } from '../services/firebaseService';
import clsx from 'clsx';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        if (!name.trim()) throw new Error("Name is required");
        await registerUser(name, email, password);
      } else {
        await loginUser(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let msg = "Authentication failed.";
      if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
      if (err.code === 'auth/user-not-found') msg = "No user found with this email.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-gray-900 w-full max-w-md p-8 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
        {/* Decorative background blob */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-center mb-8 relative z-10">
          <h2 className="text-2xl font-bold text-white">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          
          {isSignup && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                {isSignup ? 'Sign Up' : 'Log In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>

        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            {isSignup ? 'Already have an account?' : "Don't have an account yet?"}
            <button 
              onClick={() => {
                setIsSignup(!isSignup);
                setError(null);
              }}
              className="ml-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              {isSignup ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};