"use client";

import React, { useMemo, useEffect, useState } from "react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

export default function DashboardPage() {
  // ✅ surveyRecords giờ là state, không import local nữa
  const [surveyRecords, setSurveyRecords] = useState([]);

  // ✅ auto refresh để demo “live”
  useEffect(() => {
    async function load() {
      const r = await fetch("/api/feedback", { cache: "no-store" });
      const data = await r.json();
      const items = data.items || [];

      // Map items -> surveyRecords format mà dashboard của bạn kỳ vọng
      const mapped = items.map((it) => {
        const analysis = it.analysis || {};

        const s = String(analysis.overall_sentiment || "").toLowerCase();
        const overallServiceSentiment =
          s === "positive"
            ? "Positive"
            : s === "negative"
            ? "Negative"
            : s === "mixed"
            ? "Negative" // MVP: mixed coi như negative để cảnh báo
            : "Neutral";

        const productRatings = (analysis.product_mentions || []).map((p) => ({
          menuProductName: p.name || "Unknown",
          sentiment:
            String(p.sentiment || "").toLowerCase() === "positive"
              ? "Positive"
              : String(p.sentiment || "").toLowerCase() === "negative"
              ? "Negative"
              : "Neutral",
        }));

        return {
          surveyConsent: { given: true },
          surveyCompleted: true,
          overallServiceRating: { sentiment: overallServiceSentiment },
          productRatings,
        };
      });

      setSurveyRecords(mapped);
    }

    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  /* =========================
     BUILD MENU LIST (include all products from surveys)
  ========================== */
  const menuItems = useMemo(() => {
    const set = new Set([
      "Cookies and Creme Waffle",
      "Berry Bliss",
      "Matcha Latte",
      "Hot Coffee",
      "Chocolate Foam Coffee",
      "Hot Chocolate",
      "Strawberry Lemonade",
      "Ube Coffee",
      "Pina Colada",
      "Dalgona Coffee",
      "Berry Bliss Waffle",
    ]);

    surveyRecords.forEach((s) => {
      (s.productRatings || []).forEach((pr) => {
        if (pr?.menuProductName) set.add(pr.menuProductName);
      });
    });

    return Array.from(set);
  }, [surveyRecords]);

  const [selectedProduct, setSelectedProduct] = useState("ALL");

  // Demo counter (optional)
  const [todaySurveys, setTodaySurveys] = useState(0);
  useEffect(() => {
    // todaySurveys = số records hiện có (cho đúng dữ liệu)
    setTodaySurveys(surveyRecords.length);
  }, [surveyRecords.length]);

  /* =========================
     AGGREGATE DATA FROM surveyRecords
  ========================== */
  const { overall, rawProductCounts, totalReviews } = useMemo(() => {
    const counts = {};
    let satisfied = 0;
    let dissatisfied = 0;

    const valid = surveyRecords.filter(
      (s) => s?.surveyConsent?.given && s?.surveyCompleted
    );

    for (const s of valid) {
      if (s?.overallServiceRating?.sentiment === "Positive") satisfied += 1;
      if (s?.overallServiceRating?.sentiment === "Negative") dissatisfied += 1;

      for (const pr of s?.productRatings || []) {
        const name = pr?.menuProductName;
        if (!name) continue;

        if (!counts[name]) counts[name] = { good: 0, bad: 0 };

        if (pr.sentiment === "Positive") counts[name].good += 1;
        if (pr.sentiment === "Negative") counts[name].bad += 1;
      }
    }

    return {
      overall: { satisfied, dissatisfied },
      rawProductCounts: counts,
      totalReviews: valid.length,
    };
  }, [surveyRecords]);

  /* =========================
     CHART DATA (PERCENT)
  ========================== */
  const chartData = useMemo(() => {
    return menuItems.map((name) => {
      const c = rawProductCounts[name] || { good: 0, bad: 0 };
      const total = c.good + c.bad;

      return {
        fullName: name,
        goodPct: total ? Math.round((c.good / total) * 100) : 0,
        badPct: total ? -Math.round((c.bad / total) * 100) : 0,
        total,
        isSelected: selectedProduct !== "ALL" && selectedProduct === name,
      };
    });
  }, [menuItems, rawProductCounts, selectedProduct]);

  /* =========================
     DONUT DATA
  ========================== */
  const servicePercent = useMemo(() => {
    const denom = overall.satisfied + overall.dissatisfied;
    return denom ? Math.round((overall.satisfied / denom) * 100) : 0;
  }, [overall]);

  const donutData = useMemo(
    () => [
      { name: "Positive", value: overall.satisfied },
      { name: "Negative", value: overall.dissatisfied },
    ],
    [overall]
  );

  /* =========================
     INSIGHT
  ========================== */
  const monkeyMessage = useMemo(() => {
    const focus =
      selectedProduct === "ALL"
        ? [...chartData].sort((a, b) => a.badPct - b.badPct)[0]
        : chartData.find((p) => p.fullName === selectedProduct);

    if (!focus || focus.total === 0) {
      return "No valid feedback yet. Collect a few surveys to unlock insights.";
    }

    if (Math.abs(focus.badPct) >= 50) {
      return `Some concerns detected with ${focus.fullName}. Worth a closer look.`;
    }

    if (Math.abs(focus.badPct) >= 25) {
      return `${focus.fullName} is getting mixed reactions.`;
    }

    return `${focus.fullName} is a customer favorite based on recent surveys.`;
  }, [chartData, selectedProduct]);

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.brandLeft}>
          {/* ✅ logo từ /public */}
          <img src="/monkey-logo.png" alt="Chatter Monkey" style={styles.logo} />
          <div>
            <div style={styles.title}>Café Feedback Dashboard</div>
            <div style={styles.subtitle}>
              Live insights from QR voice assistant (Chatter Monkey)
            </div>
          </div>
        </div>

        <div style={styles.kpis}>
          <div style={styles.kpi}>Surveys Today {todaySurveys}</div>
          <div style={styles.kpi}>Total Reviews {totalReviews}</div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.h2}>Chatter Monkey Insight</h2>
        <p style={styles.insight}>{monkeyMessage}</p>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Overall Service Rating</h2>

          <div style={styles.donutRow}>
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  innerRadius={90}
                  outerRadius={135}
                  stroke="none"
                >
                  <Cell fill="#16A34A" />
                  <Cell fill="#DC2626" />
                  <Label
                    value={`${servicePercent}%`}
                    position="center"
                    style={{ fontSize: 40, fontWeight: 900 }}
                  />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div style={styles.stats}>
              <div style={styles.statLine}>
                <span style={styles.dotGreen} /> Positive:{" "}
                <b>{overall.satisfied}</b>
              </div>
              <div style={styles.statLine}>
                <span style={styles.dotRed} /> Negative:{" "}
                <b>{overall.dissatisfied}</b>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.h2}>Product Sentiment</h2>

          <div style={styles.chartLayout}>
            <div style={styles.selector}>
              <button
                onClick={() => setSelectedProduct("ALL")}
                style={{
                  ...styles.btn,
                  ...(selectedProduct === "ALL" ? styles.active : {}),
                }}
              >
                All Products
              </button>

              {menuItems.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProduct(p)}
                  style={{
                    ...styles.btn,
                    ...(selectedProduct === p ? styles.active : {}),
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={470}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                barCategoryGap={0}
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  type="number"
                  domain={[-100, 100]}
                  ticks={[-100, -50, 0, 50, 100]}
                  tickFormatter={(v) => `${Math.abs(v)}%`}
                  tick={{ fontSize: 14, fontWeight: 800 }}
                />

                <YAxis
                  type="category"
                  dataKey="fullName"
                  width={260}
                  interval={0}
                  tick={{ fontWeight: 900, fontSize: 14 }}
                />

                <Tooltip
                  formatter={(v) => `${Math.abs(v)}%`}
                  labelFormatter={(label) => label}
                />

                <ReferenceLine x={0} stroke="#111827" />

                <Bar dataKey="goodPct" barSize={14}>
                  {chartData.map((d) => (
                    <Cell
                      key={d.fullName + "g"}
                      fill={
                        selectedProduct === "ALL"
                          ? "#16A34A"
                          : d.isSelected
                          ? "#16A34A"
                          : "#E5E7EB"
                      }
                    />
                  ))}
                </Bar>

                <Bar dataKey="badPct" barSize={14}>
                  {chartData.map((d) => (
                    <Cell
                      key={d.fullName + "b"}
                      fill={
                        selectedProduct === "ALL"
                          ? "#DC2626"
                          : d.isSelected
                          ? "#DC2626"
                          : "#E5E7EB"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#F1F5F9",
    minHeight: "100vh",
    padding: 22,
    fontFamily: "system-ui",
    fontSize: 16,
    color: "#0F172A",
  },
  topBar: {
    background: "linear-gradient(90deg,#0EA5E9,#0369A1)",
    color: "white",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 14,
  },
  brandLeft: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 62,
    height: 62,
    objectFit: "contain",
    borderRadius: 14,
    background: "rgba(255,255,255,0.18)",
    padding: 8,
  },
  title: { fontSize: 24, fontWeight: 900 },
  subtitle: { fontSize: 14, opacity: 0.95, fontWeight: 600 },
  kpis: { display: "flex", gap: 10 },
  kpi: {
    background: "rgba(255,255,255,0.25)",
    padding: "10px 16px",
    borderRadius: 14,
    fontWeight: 900,
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.6fr",
    gap: 18,
  },
  card: {
    background: "white",
    padding: 22,
    borderRadius: 18,
    boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
    marginBottom: 18,
  },
  h2: { fontSize: 20, fontWeight: 900, marginBottom: 10 },
  insight: { fontWeight: 800, fontSize: 16 },

  chartLayout: { display: "flex", gap: 16 },
  selector: {
    width: 200,
    height: 470,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    paddingRight: 8,
  },
  btn: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    background: "#F8FAFC",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left",
  },
  active: { background: "#DBEAFE", border: "2px solid #60A5FA" },

  donutRow: { display: "flex", gap: 18, alignItems: "center" },
  stats: { display: "flex", flexDirection: "column", gap: 12 },
  statLine: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 16,
    fontWeight: 700,
  },
  dotGreen: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#16A34A",
  },
  dotRed: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#DC2626",
  },
};


