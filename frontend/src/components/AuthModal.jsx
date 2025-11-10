import React, { useState } from 'react';
import { Button } from './ui/button'; // Assuming you have shadcn-ui button
import { Input } from './ui/input';   // Assuming you have shadcn-ui input
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"; // Add for role selection

const AuthModal = ({ isDark, onClose, onAuth, loading, error }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee'); // Default role

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuth({ email, password, name, role, isSignup });
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-black/70' : 'bg-gray-900/70'}`}>
      <div className={`relative w-full max-w-md rounded-lg shadow-xl p-6 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 text-lg font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}
          aria-label="Close" // Added for accessibility
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
              className={isDark ? 'bg-slate-700 border-cyan-400/20 text-white' : 'border-slate-300'}
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={isDark ? 'bg-slate-700 border-cyan-400/20 text-white' : 'border-slate-300'}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={isDark ? 'bg-slate-700 border-cyan-400/20 text-white' : 'border-slate-300'}
          />
          {isSignup && (
            <Select onValueChange={setRole} defaultValue={role}>
              <SelectTrigger className={isDark ? 'bg-slate-700 border-cyan-400/20 text-white' : 'border-slate-300'}>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-slate-700 text-white' : ''}>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="employer">Employer</SelectItem>
              </SelectContent>
            </Select>
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
            type="button" // Explicitly set type to "button"
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