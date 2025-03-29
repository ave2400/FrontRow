import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Auth.css';

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setMessage('');
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setMessage('');
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            setMessage('Check your email for the confirmation link!');
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            setLoading(true);
            setMessage('');
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-form">
                <h2>Welcome to FrontRow Notes</h2>
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
                <div className="button-group">
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="btn btn-primary"
                    >
                        {loading ? 'Loading...' : 'Login'}
                    </button>
                    <button
                        onClick={handleSignUp}
                        disabled={loading}
                        className="btn btn-secondary"
                    >
                        Sign Up
                    </button>
                </div>
                {message && <p className="message">{message}</p>}
            </form>
        </div>
    );
};

export default Auth; 