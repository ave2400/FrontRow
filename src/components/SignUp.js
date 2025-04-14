import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import './Auth.css';

const SignUp = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        
        // Check if passwords match
        if (password !== confirmPassword) {
            setMessage('Passwords do not match');
            setMessageType('error');
            return;
        }

        try {
            setLoading(true);
            setMessage('');
            
            // Sign up with auto-confirm enabled (Supabase dashboard setting must also be configured)
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // This data option lets you attach custom metadata to the user
                    data: {
                        signup_date: new Date().toISOString(),
                    },
                },
            });
            
            if (error) throw error;
            
            // Handle successful signup
            if (data.user) {
                // Check if user needs confirmation (based on Supabase settings)
                if (data.user.identities && data.user.identities.length === 0) {
                    setMessage('Something went wrong with the signup process.');
                    setMessageType('error');
                } else if (data.user.confirmed_at || data.user.email_confirmed_at) {
                    // User is confirmed and should be auto-signed in by Supabase
                    setMessage('Account created successfully! Redirecting...');
                    setMessageType('success');
                } else {
                    // This should not happen if email confirmation is disabled in Supabase
                    setMessage('Account created! You can now sign in.');
                    setMessageType('success');
                }
            }
        } catch (error) {
            setMessage(error.message);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSignUp}>
                <h2>Create Your FrontRow Notes Account</h2>
                <div className="form-group">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="button-group">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-secondary"
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </div>
                {message && <p className={`message ${messageType}`}>{message}</p>}
                <p className="redirect-text">
                    Already have an account? <Link to="/signin">Sign In</Link>
                </p>
            </form>
        </div>
    );
};

export default SignUp;