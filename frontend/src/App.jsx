import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import History from './pages/History';
import Summary from './pages/Summary';
import Layout from './components/Layout';
import api from './utils/api';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Validate token and get user profile on mount
        const validateSession = async () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            
            if (token && userData) {
                try {
                    // Verify token with backend
                    const response = await api.get('/auth/me');
                    if (response.data.success) {
                        setUser(response.data.data);
                    } else {
                        // Token invalid - clear storage
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                    }
                } catch (err) {
                    // Token invalid or expired - clear storage
                    console.error('Session validation failed:', err);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };

        validateSession();
    }, []);

    const handleLogin = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            // Ignore logout endpoint errors - still clear local state
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route 
                    path="/login" 
                    element={
                        user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
                    } 
                />
                <Route 
                    path="/" 
                    element={
                        user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
                    }
                >
                    <Route index element={<Navigate to="/dashboard" />} />
                    <Route path="dashboard" element={<Dashboard user={user} />} />
                    <Route path="checkin" element={<CheckIn user={user} />} />
                    <Route path="history" element={<History user={user} />} />
                    <Route path="summary" element={<Summary user={user} />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
