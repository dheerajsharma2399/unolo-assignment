import { useState, useEffect, Fragment } from 'react';
import api from '../utils/api';

function Summary({ user }) {
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);

    useEffect(() => {
        fetchSummary();
    }, [date]);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/dashboard/summary?date=${date}`);
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            setError('Failed to load summary report');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (employeeId) => {
        setExpandedRow(expandedRow === employeeId ? null : employeeId);
    };

    if (loading && !data) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Daily Team Summary</h2>
                <div className="flex items-center gap-2">
                    <label className="text-gray-600 font-medium">Date:</label>
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Team Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm font-medium">Total Employees</h3>
                    <p className="text-2xl font-bold text-gray-800">{data?.team_stats?.total_employees || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-sm font-medium">Active Now</h3>
                    <p className="text-2xl font-bold text-gray-800">{data?.team_stats?.active_now || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                    <h3 className="text-gray-500 text-sm font-medium">Total Check-ins</h3>
                    <p className="text-2xl font-bold text-gray-800">{data?.team_stats?.total_checkins || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
                    <h3 className="text-gray-500 text-sm font-medium">Total Hours</h3>
                    <p className="text-2xl font-bold text-gray-800">{data?.team_stats?.total_hours || 0}h</p>
                </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-ins</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clients</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data?.employee_reports?.length > 0 ? (
                            data.employee_reports.map((emp) => (
                                <Fragment key={emp.id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                            <div className="text-sm text-gray-500">{emp.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {emp.total_checkins}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {emp.unique_clients}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {emp.total_hours}h
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button 
                                                onClick={() => toggleRow(emp.id)}
                                                className="text-blue-600 hover:text-blue-900 focus:outline-none"
                                            >
                                                {expandedRow === emp.id ? 'Hide Details' : 'View Details'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRow === emp.id && (
                                        <tr className="bg-gray-50">
                                            <td colSpan="6" className="px-6 py-4 border-t border-gray-200 inset-shadow">
                                                <h4 className="text-sm font-bold text-gray-700 mb-3">Activity Log for {emp.name}</h4>
                                                {emp.activities.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200 bg-white rounded border">
                                                            <thead>
                                                                <tr className="bg-gray-100">
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Distance</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-200">
                                                                {emp.activities.map((activity) => (
                                                                    <tr key={activity.id}>
                                                                        <td className="px-4 py-2 text-sm text-gray-600">
                                                                            {new Date(activity.checkin_time).toLocaleTimeString()}
                                                                            {activity.checkout_time && ` - ${new Date(activity.checkout_time).toLocaleTimeString()}`}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-sm text-gray-600">{activity.client_name}</td>
                                                                        <td className="px-4 py-2 text-sm text-gray-600">
                                                                            {activity.distance_from_client ? `${Number(activity.distance_from_client).toFixed(2)} km` : '-'}
                                                                            {activity.distance_from_client > 0.5 && (
                                                                                <span className="text-red-500 ml-1 text-xs font-bold">(Far)</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-sm text-gray-600 italic">
                                                                            {activity.notes || <span className="text-gray-400">No notes</span>}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic">No activity recorded for this date.</p>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    No data found for the selected date.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Summary;