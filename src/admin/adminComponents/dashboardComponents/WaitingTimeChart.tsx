import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartDataPoint {
  day: string;
  Colombo: number;
  Kandy: number;
  Galle: number;
  Jaffna: number;
}

interface WaitingTimeChartProps {
  data: ChartDataPoint[];
}

const WaitingTimeChart: React.FC<WaitingTimeChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" />
        <YAxis
          label={{
            value: 'Minutes',
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle' }
          }}
        />
        <Tooltip
          formatter={(value) => [`${value} min`, 'Avg. Wait Time']}
          labelStyle={{ color: '#111827' }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
        <Legend verticalAlign="bottom" height={36} />
        <Line type="monotone" dataKey="Colombo" stroke="#3b82f6" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="Kandy" stroke="#10b981" />
        <Line type="monotone" dataKey="Galle" stroke="#f59e0b" />
        <Line type="monotone" dataKey="Jaffna" stroke="#8b5cf6" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WaitingTimeChart;