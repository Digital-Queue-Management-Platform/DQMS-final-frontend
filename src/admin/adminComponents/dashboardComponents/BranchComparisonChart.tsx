//import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
interface BranchData {
  id: number;
  name: string;
  customersServed: number;
  avgWaitingTime: number;
  avgServiceTime: number;
  rating: number;
  trend: string;
}
interface BranchComparisonChartProps {
  data: BranchData[];
}
export function BranchComparisonChart({
  data
}: BranchComparisonChartProps) {
  // Format data for the chart
  const chartData = data.slice(0, 8).map(branch => ({
    name: branch.name,
    customers: branch.customersServed
  }));
  return <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{
      top: 5,
      right: 30,
      left: 20,
      bottom: 70
    }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{
        fontSize: 12
      }} />
        <YAxis />
        <Tooltip formatter={value => [`${value} customers`, 'Volume']} labelStyle={{
        color: '#111827'
      }} contentStyle={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }} />
        <Bar dataKey="customers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>;
}