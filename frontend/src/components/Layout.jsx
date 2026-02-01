import { Outlet, Link, useLocation } from 'react-router-dom';

function Layout({ user, onLogout }) {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? 'bg-blue-700' : '';
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="font-bold text-xl">Field Force Tracker</span>
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link
                                    to="/dashboard"
                                    className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/dashboard')}`}
                                >
                                    Dashboard
                                </Link>
                                
                                {user.role === 'employee' && (
                                    <Link
                                        to="/checkin"
                                        className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/checkin')}`}
                                    >
                                        Check In
                                    </Link>
                                )}

                                <Link
                                    to="/history"
                                    className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/history')}`}
                                >
                                    History
                                </Link>

                                {user.role === 'manager' && (
                                    <Link
                                        to="/summary"
                                        className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/summary')}`}
                                    >
                                        Summary
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="mr-4 text-sm">{user.name} ({user.role})</span>
                            <button
                                onClick={onLogout}
                                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;