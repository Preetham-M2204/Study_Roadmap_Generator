import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './LoginModal.css';

/**
 * LoginModal.tsx - Popup Authentication Interface
 * 
 * LEARNING OBJECTIVES:
 * 1. Modal/Overlay UI pattern
 * 2. Conditional rendering for Login vs Register
 * 3. Integration with Global AuthContext
 * 4. Professional styling with backdrop blur
 * 5. Centralized API calls with error handling
 */

// Debug helper
const DEBUG = import.meta.env.VITE_DEBUG === 'true';
const log = (...args: any[]) => {
  if (DEBUG) console.log('[LoginModal]', ...args);
};

const LoginModal = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    log('Form submitted:', { isLogin, email: formData.email });

    try {
      let response;
      
      if (isLogin) {
        log('Attempting login...');
        response = await authAPI.login(formData.email, formData.password);
      } else {
        log('Attempting registration...');
        response = await authAPI.register(formData.name, formData.email, formData.password);
      }
      
      const { token, user } = response.data;
      log('Authentication successful:', { user });
      
      login(token, user); // Updates global state, closes modal automatically

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Authentication failed';
      log('Authentication error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header Section */}
        <div className="modal-header">
          <div className="logo-area">
            <div className="logo-icon">SB</div>
            <h2>StudyBuddy</h2>
          </div>
          <p className="modal-subtitle">
            {isLogin ? 'Welcome back! Ready to learn?' : 'Create your account to get started.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <User className="input-icon" size={18} />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}

          <div className="input-group">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            <span>{isLogin ? 'Continue' : 'Create Account'}</span>
          </button>
        </form>

        {/* Footer / Toggle */}
        <div className="modal-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
