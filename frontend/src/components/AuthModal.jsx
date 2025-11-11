import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const AuthModal = ({ isDark, onClose, onAuth, loading, error }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuth({ email, password, name, role, isSignup });
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setShowRoleDropdown(false);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-black/70' : 'bg-gray-900/70'}`}>
      <div className={`relative w-full max-w-md rounded-lg shadow-xl p-6 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 text-lg font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}
          aria-label="Close"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignup ? 'Sign Up' : 'Login'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <Input
              type="text"
              placeholder="Name (Optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={isDark ? 'bg-slate-700 border-cyan-400/20 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-500'}
            />
          )}

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={isDark ? 'bg-slate-700 border-cyan-400/20 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-500'}
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={isDark ? 'bg-slate-700 border-cyan-400/20 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-500'}
          />

          {isSignup && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className={`w-full px-3 py-2 rounded border text-left flex justify-between items-center ${
                  isDark
                    ? 'bg-slate-700 border-cyan-400/20 text-white'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <span>{role === 'employee' ? 'Employee' : 'Employer'}</span>
                <span className="text-xs">▼</span>
              </button>
              
              {showRoleDropdown && (
                <div className={`absolute top-full left-0 right-0 mt-1 rounded border z-10 ${
                  isDark ? 'bg-slate-700 border-cyan-400/20' : 'bg-white border-slate-300'
                }`}>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('employee')}
                    className={`w-full px-3 py-2 text-left hover:${isDark ? 'bg-slate-600' : 'bg-slate-100'} ${
                      isDark ? 'text-white' : 'text-slate-800'
                    } ${role === 'employee' ? (isDark ? 'bg-slate-600' : 'bg-slate-100') : ''}`}
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('employer')}
                    className={`w-full px-3 py-2 text-left hover:${isDark ? 'bg-slate-600' : 'bg-slate-100'} ${
                      isDark ? 'text-white' : 'text-slate-800'
                    } ${role === 'employer' ? (isDark ? 'bg-slate-600' : 'bg-slate-100') : ''}`}
                  >
                    Employer
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            type="submit"
            className={`w-full ${isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'}`}
            disabled={loading}
          >
            {loading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Login')}
          </Button>
        </form>

        <p className={`mt-4 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className={`font-semibold ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-500'}`}
          >
            {isSignup ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;