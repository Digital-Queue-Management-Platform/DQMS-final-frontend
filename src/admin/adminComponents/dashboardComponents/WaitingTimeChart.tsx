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
  [outletName: string]: string | number;
}

interface WaitingTimeChartProps {
  data: ChartDataPoint[];
}

const WaitingTimeChart: React.FC<WaitingTimeChartProps> = ({ data }) => {
  // Extract outlet names from data (excluding 'day' key)
  const outletNames = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'day') : [];
  
  // Define colors for up to 6 outlets
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

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
        {outletNames.map((outletName, index) => (
          <Line 
            key={outletName}
            type="monotone" 
            dataKey={outletName} 
            stroke={colors[index % colors.length]} 
            activeDot={{ r: 8 }} 
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WaitingTimeChart;