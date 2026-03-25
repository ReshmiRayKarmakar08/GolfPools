import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function RevenueLineChart({
  data = [],
  height = 220,
  tooltipContent,
  showLegend = false,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fill: '#5a6190', fontSize: 11 }} tickFormatter={(v) => (v ? v.slice(5) : '')} />
        <YAxis tick={{ fill: '#5a6190', fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={tooltipContent} />
        {showLegend && <Legend wrapperStyle={{ color: '#7983a8', fontSize: 12 }} />}
        <Line type="monotone" dataKey="revenue" stroke="#00c6ff" strokeWidth={2} dot={false} name="Revenue" />
        <Line type="monotone" dataKey="charity" stroke="#00E5CC" strokeWidth={2} dot={false} name="Charity" />
        <Line type="monotone" dataKey="prizePool" stroke="#FFD700" strokeWidth={2} dot={false} name="Prize Pool" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RevenuePieChart({ data = [], colors = [], height = 160 }) {
  return (
    <ResponsiveContainer width="60%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [`₹${Number(v || 0).toLocaleString('en-IN')}`, '']}
          contentStyle={{
            background: '#0d1224',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#e8e9f0',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

