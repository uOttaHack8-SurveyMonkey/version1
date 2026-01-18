'use client';
import { useEffect, useState } from 'react';
import { Card, Title, BarChart, DonutChart, Text, Grid, Metric } from "@tremor/react";
import axios from 'axios';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch dữ liệu từ JSON file khi vào trang
  useEffect(() => {
    axios.get('/api/analyze')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <div className="p-10">Loading Dashboard...</div>;

  // --- XỬ LÝ DỮ LIỆU ĐỂ VẼ BIỂU ĐỒ ---
  
  // 1. Tính tổng số cuộc gọi
  const totalCalls = data.length;

  // 2. Tính điểm trung bình (chỉ tính những người có rating > 0)
  const ratedCalls = data.filter(item => item.rating_score > 0);
  const avgRating = ratedCalls.length > 0
    ? (ratedCalls.reduce((acc, curr) => acc + curr.rating_score, 0) / ratedCalls.length).toFixed(1)
    : "N/A";

  // 3. Gom nhóm đồ uống (Group by ordered_item)
  const drinkCounts = {};
  data.forEach(item => {
      const drink = item.ordered_item || "Unknown";
      drinkCounts[drink] = (drinkCounts[drink] || 0) + 1;
  });
  const drinkChartData = Object.keys(drinkCounts).map(key => ({
      name: key,
      count: drinkCounts[key]
  }));

  // 4. Gom nhóm tâm trạng (Group by customer_mood)
  const moodCounts = {};
  data.forEach(item => {
      const mood = item.customer_mood || "Neutral";
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });
  const moodChartData = Object.keys(moodCounts).map(key => ({
      name: key,
      value: moodCounts[key]
  }));

  return (
    <main className="p-10 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <Title className="text-3xl">☕ Caffeine Cafe Real-time Dashboard</Title>
        <button onClick={() => window.location.reload()} className="bg-blue-500 text-white px-4 py-2 rounded">
          Refresh Data
        </button>
      </div>

      {/* KPI CARDS */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6 mb-6">
        <Card decoration="top" decorationColor="indigo">
          <Text>Total Surveys</Text>
          <Metric>{totalCalls}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <Text>Avg Rating</Text>
          <Metric>{avgRating} / 5</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Latest Feedback</Text>
          <Text className="truncate mt-2 italic">
            "{data[data.length - 1]?.key_feedback || "No data yet"}"
          </Text>
        </Card>
      </Grid>

      {/* CHARTS */}
      <Grid numItems={1} numItemsLg={2} className="gap-6">
        <Card>
          <Title>Popular Drinks</Title>
          <BarChart
            className="mt-6"
            data={drinkChartData}
            index="name"
            categories={["count"]}
            colors={["blue"]}
            yAxisWidth={48}
          />
        </Card>

        <Card>
          <Title>Customer Mood Sentiment</Title>
          <DonutChart
            className="mt-6"
            data={moodChartData}
            category="value"
            index="name"
            colors={["emerald", "yellow", "rose"]} 
            // Emerald=Positive, Yellow=Neutral, Rose=Negative (Cần map màu đúng thứ tự nếu muốn chuẩn)
          />
        </Card>
      </Grid>

      {/* RAW DATA TABLE (Tùy chọn để debug) */}
      <Card className="mt-6">
        <Title>Recent Logs</Title>
        <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                    <tr>
                        <th className="px-4 py-2">Time</th>
                        <th className="px-4 py-2">Mood</th>
                        <th className="px-4 py-2">Drink</th>
                        <th className="px-4 py-2">Feedback</th>
                    </tr>
                </thead>
                <tbody>
                    {data.slice().reverse().slice(0, 5).map((row) => (
                        <tr key={row.id} className="border-b bg-white">
                            <td className="px-4 py-2">{new Date(row.timestamp).toLocaleTimeString()}</td>
                            <td className="px-4 py-2 font-bold">{row.customer_mood}</td>
                            <td className="px-4 py-2">{row.ordered_item}</td>
                            <td className="px-4 py-2">{row.key_feedback}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Card>
    </main>
  );
}