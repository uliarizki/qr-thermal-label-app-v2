import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsCharts({ history }) {

    // 1. Prepare Data: Activity per Day (Last 7 days)
    const dailyData = useMemo(() => {
        const days = {};
        // Init last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString();
            days[key] = { name: key, scan: 0, search: 0 };
        }

        history.forEach(item => {
            const d = new Date(item.timestamp).toLocaleDateString();
            if (days[d]) {
                if (item.activity === 'SCAN') days[d].scan++;
                if (item.activity.includes('SEARCH')) days[d].search++;
            }
        });

        return Object.values(days);
    }, [history]);

    // 2. Prepare Data: User Activity Share
    const userData = useMemo(() => {
        const counts = {};
        history.forEach(item => {
            counts[item.user] = (counts[item.user] || 0) + 1;
        });
        return Object.keys(counts).map((user, idx) => ({
            name: user,
            value: counts[user]
        }));
    }, [history]);

    if (!history || history.length === 0) return null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' }}>

            {/* CHART 1: TRENDS */}
            <div className="page-card" style={{ padding: '20px' }}>
                <h3>📈 Activity Trends (7 Days)</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} tick={{ fill: '#666' }} />
                            <YAxis />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend />
                            <Bar dataKey="scan" name="QR Scans" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="search" name="Searches" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* CHART 2: TOP USERS */}
            <div className="page-card" style={{ padding: '20px' }}>
                <h3>🏆 Top Users</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={userData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {userData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
