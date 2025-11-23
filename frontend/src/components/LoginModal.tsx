import React, { useState } from 'react';
import axios from 'axios';
import { X, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginModal.css';

/**
 * LoginModal.tsx - Popup Authentication Interface
 * 
 * LEARNING OBJECTIVES:
 * 1. Modal/Overlay UI pattern
 * 2. Conditional rendering for Login vs Register
 * 3. Integration with Global AuthContext
 * 4. Professional styling with backdrop blur
 */

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

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      // Note: In production, use environment variable for base URL
      const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
      
      const { token, user } = response.data;
      login(token, user); // Updates global state, which closes modal automatically via App logic

    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
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
            <div className="logo-icon">AI</div>
            <h2>Roadmap.ai</h2>
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
