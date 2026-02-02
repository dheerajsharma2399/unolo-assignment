const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get daily summary report (Feature B)
// Endpoint: /api/reports/daily-summary
router.get('/daily-summary', authenticateToken, requireManager, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toLocaleDateString('en-CA');

        // Get all team members
        const [employees] = await pool.execute(
            'SELECT id, name, email FROM users WHERE manager_id = ?',
            [req.user.id]
        );

        if (employees.length === 0) {
            return res.json({ 
                success: true, 
                data: { 
                    date: targetDate,
                    team_stats: { total_employees: 0, active_now: 0, total_checkins: 0, total_hours: 0 }, 
                    employee_reports: [] 
                } 
            });
        }

        const employeeIds = employees.map(e => e.id);
        const placeholders = employeeIds.map(() => '?').join(',');

        // Get check-ins for the date with client details
        const [checkins] = await pool.execute(
            `SELECT ch.*, c.name as client_name
             FROM checkins ch
             JOIN clients c ON ch.client_id = c.id
             WHERE ch.employee_id IN (${placeholders})
             AND DATE(ch.checkin_time, 'localtime') = ?
             ORDER BY ch.checkin_time ASC`,
            [...employeeIds, targetDate]
        );

        // Process data for each employee
        const employeeReports = employees.map(emp => {
            const empCheckins = checkins.filter(c => c.employee_id === emp.id);
            
            // Calculate total hours
            let totalHours = 0;
            empCheckins.forEach(c => {
                if (c.checkout_time) {
                    const start = new Date(c.checkin_time);
                    const end = new Date(c.checkout_time);
                    totalHours += (end - start) / (1000 * 60 * 60);
                }
            });

            // Determine status (Active if last check-in has no checkout time)
            const lastCheckin = empCheckins[empCheckins.length - 1];
            const isActive = lastCheckin && !lastCheckin.checkout_time;
            
            return {
                id: emp.id,
                name: emp.name,
                email: emp.email,
                total_checkins: empCheckins.length,
                unique_clients: new Set(empCheckins.map(c => c.client_id)).size,
                total_hours: parseFloat(totalHours.toFixed(2)),
                status: isActive ? 'Active' : 'Offline',
                activities: empCheckins // Include full list for details view
            };
        });

        const teamStats = {
            total_employees: employees.length,
            active_now: employeeReports.filter(e => e.status === 'Active').length,
            total_checkins: checkins.length,
            total_hours: parseFloat(employeeReports.reduce((sum, e) => sum + e.total_hours, 0).toFixed(2))
        };

        res.json({
            success: true,
            data: {
                date: targetDate,
                team_stats: teamStats,
                employee_reports: employeeReports
            }
        });

    } catch (error) {
        console.error('Summary report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

module.exports = router;
