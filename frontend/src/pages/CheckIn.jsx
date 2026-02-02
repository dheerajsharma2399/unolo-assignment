import { useState, useEffect } from 'react';
import api from '../utils/api';

function CheckIn({ user }) {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [notes, setNotes] = useState('');
    const [location, setLocation] = useState(null);
    const [activeCheckin, setActiveCheckin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [distance, setDistance] = useState(null);

    useEffect(() => {
        if (user.role === 'employee') {
            fetchData();
            
            // Initial fetch
            getCurrentLocation(false);

            // Real-time tracking
            let watchId;
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        setLocation({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                        setError('');
                    },
                    (err) => console.error('Watch Position Error:', err),
                    {
                        enableHighAccuracy: true,
                        timeout: 20000,
                        maximumAge: 0
                    }
                );
            }

            return () => {
                if (watchId) navigator.geolocation.clearWatch(watchId);
            };
        }
    }, []);

    // Calculate distance when client or location changes
    useEffect(() => {
        if (selectedClient && location && clients.length > 0) {
            const client = clients.find(c => c.id == selectedClient);
            if (client && client.latitude && client.longitude) {
                const dist = calculateDistance(
                    location.latitude,
                    location.longitude,
                    client.latitude,
                    client.longitude
                );
                setDistance(dist);
            } else {
                setDistance(null);
            }
        } else {
            setDistance(null);
        }
    }, [selectedClient, location, clients]);

    const fetchData = async () => {
        try {
            const [clientsRes, activeRes] = await Promise.all([
                api.get('/checkin/clients'),
                api.get('/checkin/active')
            ]);

            if (clientsRes.data.success) {
                setClients(clientsRes.data.data);
            }
            if (activeRes.data.success) {
                setActiveCheckin(activeRes.data.data);
            }
        } catch (err) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = (isBackground = false) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setError('');
                },
                (err) => {
                    console.error('Location error:', err);
                    let msg = 'Location access is required to check in. Please enable location services.';
                    if (err.code === 1) msg = 'Permission denied. Click the lock/info icon in your address bar to allow location access.';
                    else if (err.code === 2) msg = 'Position unavailable. Please check your GPS or network connection.';
                    else if (err.code === 3) msg = 'Location request timed out. Please try again.';
                    
                    setError(msg);
                    if (!isBackground) alert(msg);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                }
            );
        }
    };

    const handleCheckIn = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const response = await api.post('/checkin', {
                        client_id: selectedClient,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        notes: notes
                    });

                    if (response.data.success) {
                        setSuccess(response.data.data.message);
                        setSelectedClient('');
                        setNotes('');
                        fetchData(); // Refresh data
                    } else {
                        setError(response.data.message);
                    }
                } catch (err) {
                    setError(err.response?.data?.message || 'Check-in failed');
                } finally {
                    setSubmitting(false);
                }
            },
            (err) => {
                setError('Failed to retrieve location for check-in.');
                setSubmitting(false);
            }
        );
    };

    const handleCheckOut = async () => {
        setError('');
        setSuccess('');
        setSubmitting(true);

        try {
            const response = await api.put('/checkin/checkout');
            
            if (response.data.success) {
                setSuccess('Checked out successfully!');
                setActiveCheckin(null);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Checkout failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (user.role === 'manager') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <div className="bg-gray-100 p-6 rounded-full mb-6">
                    <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Employee Access Only</h2>
                <p className="text-gray-600 max-w-md">
                    Managers do not need to check in. Please use the Dashboard to view team activities and reports.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Check In / Out</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            {/* Current Location Card */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Your Current Location</h3>
                    <button 
                        onClick={() => getCurrentLocation(false)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Refresh Location
                    </button>
                </div>
                {location ? (
                    <p className="text-gray-600">
                        Lat: {location.latitude.toFixed(6)}, Long: {location.longitude.toFixed(6)}
                    </p>
                ) : (
                    <p className="text-gray-500">Getting location...</p>
                )}
            </div>

            {/* Active Check-in Card */}
            {activeCheckin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-blue-800 mb-2">Active Check-in</h3>
                    <p className="text-blue-700">
                        You are currently checked in at <strong>{activeCheckin.client_name}</strong>
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                        Since: {new Date(activeCheckin.checkin_time).toLocaleString()}
                    </p>
                    {activeCheckin.distance_from_client != null && (
                        <div className="mt-2">
                            <p className="text-sm text-blue-700">
                                Distance: {Number(activeCheckin.distance_from_client).toFixed(2)} km
                            </p>
                            {Number(activeCheckin.distance_from_client) > 0.5 && (
                                <p className="text-xs text-red-600 font-bold mt-1">
                                    Warning: You are far from the client location.
                                </p>
                            )}
                        </div>
                    )}
                    <button
                        onClick={handleCheckOut}
                        disabled={submitting}
                        className="mt-4 bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:bg-red-400"
                    >
                        {submitting ? 'Processing...' : 'Check Out'}
                    </button>
                </div>
            )}

            {/* Check-in Form */}
            {!activeCheckin && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold mb-4">New Check-in</h3>
                    
                    <form onSubmit={handleCheckIn}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                Select Client
                            </label>
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Choose a client...</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name} - {client.address}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {distance !== null && (
                            <div className={`mb-4 p-3 rounded-md ${distance > 0.5 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                                <p className={`text-sm font-medium ${distance > 0.5 ? 'text-yellow-800' : 'text-green-800'}`}>
                                    Distance from client: {distance.toFixed(2)} km
                                </p>
                                {distance > 0.5 && (
                                    <p className="text-xs text-yellow-700 mt-1">
                                        Warning: You are far from the client location.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="3"
                                placeholder="Add any notes about this visit..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !selectedClient || !location}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            {submitting ? 'Checking in...' : 'Check In'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

export default CheckIn;
