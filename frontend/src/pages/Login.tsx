/**
 * Login.tsx - Authentication Page (Modern Split-Screen Design)
 * 
 * LEARNING OBJECTIVES:
 * 1. Split-screen layout implementation
 * 2. Responsive design patterns (Stack on mobile, Split on desktop)
 * 3. Form state management with React Hooks
 * 4. Interactive UI feedback (loading states, error handling)
 * 
 * DESIGN UPDATE:
 * - Fullscreen split layout
 * - Left side: Branding & Value Proposition (Blue Theme)
 * - Right side: Clean Authentication Form
 * - Typography: Roboto
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();

  // State Management
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form Data State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error on typing
  };

  // Form Validation
  const validateForm = () => {
    const { name, email, password } = formData;
    
    if (!email) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email';
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (!isLogin && !name) return 'Name is required';
    
    return null;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const dataToSend = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(
        `http://localhost:5000${endpoint}`,
        dataToSend
      );

      const { token, user } = response.data;

      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (err: any) {
      console.error('Auth Error:', err);
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className="login-page">
      {/* Left Section - Branding (Visible on Desktop) */}
      <div className="login-brand-section">
        <div className="brand-content">
          <div className="brand-logo">
            <div className="logo-icon">AI</div>
            <h1>Roadmap.ai</h1>
          </div>
          
          <div className="brand-hero">
            <h2>Master Any Skill with<br />AI-Powered Guidance</h2>
            <p>
              Generate personalized learning paths, track your progress, 
              and achieve your goals faster with our intelligent mentor.
            </p>
            
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">🚀</span>
                <span>Custom Roadmaps</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🤖</span>
                <span>AI Chat Mentor</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📈</span>
                <span>Progress Tracking</span>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <p>© 2025 AI Roadmap Platform</p>
          </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="brand-bg-circle circle-1"></div>
        <div className="brand-bg-circle circle-2"></div>
      </div>

      {/* Right Section - Form */}
      <div className="login-form-section">
        <div className="form-container">
          <div className="form-header">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="form-subtitle">
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Start your learning journey today'}
            </p>
          </div>

          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="input-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="input-field"
                  disabled={loading}
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="input-field"
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input-field"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-text">Processing...</span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="form-footer">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                onClick={toggleMode}
                className="link-btn"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

