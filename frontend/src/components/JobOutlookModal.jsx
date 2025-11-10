import React, { useEffect, useState } from "react";
import { X, TrendingUp, TrendingDown, Minus, Globe, DollarSign, Briefcase, Award, Zap } from "lucide-react";
import * as api from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

const JobOutlookModal = ({ jobs, isOpen, onClose, isDark }) => {
  const [outlooks, setOutlooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("in"); // Default to India

  useEffect(() => {
    if (isOpen && jobs.length > 0) {
      setLoading(true);
      Promise.all(
        jobs.slice(0, 5).map((job) =>
          api
            .postEmployerJobOutlook(job.title || job.job)
            .then((res) => ({ ...res.data, title: job.title || job.job }))
            .catch((error) => {
                console.error(`Error fetching outlook for ${job.title || job.job}:`, error);
                return null;
            })
        )
      ).then((results) => {
        setOutlooks(results.filter(Boolean));
        setLoading(false);
      });
    }
  }, [isOpen, jobs]);

  const COLORS = ["#06b6d4", "#0ea5e9", "#38bdf8", "#67e8f9", "#818cf8", "#f97316", "#fb923c"];

  const getTrendIcon = (growth) => {
    if (growth > 5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (growth < -5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-yellow-500" />;
  };

  const getTrendColor = (growth) => {
    if (growth > 5) return "text-green-500";
    if (growth < -5) return "text-red-500";
    return "text-yellow-500";
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { INR: "₹", GBP: "£", USD: "$" };
    return symbols[currency] || "";
  };

  // Extract country-specific data
  const getCountryData = (outlook, countryCode) => {
    return outlook?.countries?.[countryCode] || {};
  };

  // Prepare comparison data for charts
  const getComparisonData = () => {
    if (!outlooks.length) return [];
    
    return outlooks.map(outlook => {
      const inData = getCountryData(outlook, "in");
      const gbData = getCountryData(outlook, "gb");
      
      return {
        title: outlook.title,
        india_demand: inData.demand || 0,
        uk_demand: gbData.demand || 0,
        india_jobs: inData.total_jobs_found || 0,
        uk_jobs: gbData.total_jobs_found || 0,
        india_salary: inData.salary || 0,
        uk_salary: gbData.salary || 0,
        india_growth: inData.trends?.job_growth_12m || 0,
        uk_growth: gbData.trends?.job_growth_12m || 0
      };
    });
  };

  // Prepare historical trend data
  const getTrendData = (outlook, countryCode) => {
    const countryData = getCountryData(outlook, countryCode);
    if (!countryData.historical) return [];
    
    return [
      { month: "12 mo ago", jobs: countryData.historical["12_months_ago"]?.total_jobs || 0, salary: countryData.historical["12_months_ago"]?.avg_salary || 0 },
      { month: "6 mo ago", jobs: countryData.historical["6_months_ago"]?.total_jobs || 0, salary: countryData.historical["6_months_ago"]?.avg_salary || 0 },
      { month: "Current", jobs: countryData.historical.current?.total_jobs || 0, salary: countryData.historical.current?.avg_salary || 0 }
    ];
  };

  // Prepare data for Radar Chart
  const getRadarChartData = () => {
    if (!outlooks.length) return [];

    const processedData = outlooks.map(outlook => {
        const inData = getCountryData(outlook, "in");
        const gbData = getCountryData(outlook, "gb");

        // Normalize data for radar chart (e.g., to a 0-100 scale)
        const normalize = (value, min, max) => (value - min) / (max - min) * 100;

        // Find global min/max for normalization across all jobs/countries for radar
        // This is a simplified approach, for production you'd want more robust min/max calculation
        const maxDemand = Math.max(...outlooks.flatMap(o => [getCountryData(o, "in").demand || 0, getCountryData(o, "gb").demand || 0]));
        const maxJobs = Math.max(...outlooks.flatMap(o => [getCountryData(o, "in").total_jobs_found || 0, getCountryData(o, "gb").total_jobs_found || 0]));
        const maxSalary = Math.max(...outlooks.flatMap(o => [getCountryData(o, "in").salary || 0, getCountryData(o, "gb").salary || 0]));
        const maxGrowth = Math.max(...outlooks.flatMap(o => [getCountryData(o, "in").trends?.job_growth_12m || 0, getCountryData(o, "gb").trends?.job_growth_12m || 0]));

        return {
            subject: outlook.title,
            india_demand: normalize(inData.demand || 0, 0, maxDemand || 100),
            uk_demand: normalize(gbData.demand || 0, 0, maxDemand || 100),
            india_salary: normalize(inData.salary || 0, 0, maxSalary || 1), // Salary needs careful normalization
            uk_salary: normalize(gbData.salary || 0, 0, maxSalary || 1),
            india_growth: normalize(inData.trends?.job_growth_12m || 0, -50, maxGrowth || 50), // Growth can be negative
            uk_growth: normalize(gbData.trends?.job_growth_12m || 0, -50, maxGrowth || 50),
            fullMark: 100, // Max value for radar axis
        };
    });
    return processedData;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`rounded-2xl p-8 w-[95%] max-w-7xl shadow-2xl relative overflow-y-auto max-h-[90vh] ${
              isDark ? "bg-slate-900 text-cyan-100" : "bg-white text-slate-800"
            }`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-400 z-10"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl font-bold mb-2 text-center">
              Global Job Outlook Dashboard
            </h2>
            <p className="text-center text-sm text-slate-500 mb-6">
              Multi-Country Market Analysis • Real-time Data from Adzuna
            </p>

            {/* Country Tabs */}
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={() => setSelectedCountry("in")}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedCountry === "in"
                    ? "bg-orange-500 text-white shadow-lg"
                    : isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                🇮🇳 India
              </button>
              <button
                onClick={() => setSelectedCountry("gb")}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedCountry === "gb"
                    ? "bg-blue-600 text-white shadow-lg"
                    : isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                🇬🇧 United Kingdom
              </button>
              <button
                onClick={() => setSelectedCountry("all")}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedCountry === "all"
                    ? "bg-purple-600 text-white shadow-lg"
                    : isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Globe className="w-4 h-4 inline mr-1" />
                Compare All
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                <p className="text-lg">Fetching global insights...</p>
              </div>
            ) : outlooks.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No job outlook data found for these roles.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Single Country View */}
                {selectedCountry !== "all" && (
                  <>
                    {/* Trend Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {outlooks.map((outlook, idx) => {
                        const countryData = getCountryData(outlook, selectedCountry);
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border ${
                              isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <h4 className="font-semibold text-sm mb-3 truncate">{outlook.title}</h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span>12-mo Growth:</span>
                                <div className="flex items-center gap-1">
                                  {getTrendIcon(countryData.trends?.job_growth_12m || 0)}
                                  <span className={getTrendColor(countryData.trends?.job_growth_12m || 0)}>
                                    {countryData.trends?.job_growth_12m > 0 ? "+" : ""}
                                    {countryData.trends?.job_growth_12m || 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Jobs Found:</span>
                                <span className="font-semibold">{countryData.total_jobs_found || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Avg Salary:</span>
                                <span className="font-semibold">
                                  {getCurrencySymbol(countryData.currency)}
                                  {(countryData.salary || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Remote:</span>
                                <span className={countryData.is_remote_friendly ? "text-green-500" : "text-slate-400"}>
                                  {countryData.is_remote_friendly ? "✓ Yes" : "✗ No"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Demand Bar Chart */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Job Demand Score (0-100)
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={outlooks.map(o => ({
                          title: o.title,
                          demand: getCountryData(o, selectedCountry).demand || 0
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="title" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="demand" fill={selectedCountry === "in" ? "#f97316" : "#2563eb"} radius={8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Salary Bar Chart */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Average Salary ({outlooks[0]?.countries?.[selectedCountry]?.currency || ""})
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={outlooks.map(o => ({
                          title: o.title,
                          salary: getCountryData(o, selectedCountry).salary || 0
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="title" />
                          <YAxis tickFormatter={(value) => `${getCurrencySymbol(outlooks[0]?.countries?.[selectedCountry]?.currency)}${value.toLocaleString()}`} />
                          <Tooltip formatter={(value) => `${getCurrencySymbol(outlooks[0]?.countries?.[selectedCountry]?.currency)}${value.toLocaleString()}`} />
                          <Legend />
                          <Bar dataKey="salary" fill="#818cf8" radius={8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Job Growth Trends */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Job Market Trends (Past 12 Months)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {outlooks.slice(0, 2).map((outlook, idx) => (
                          <div key={idx}>
                            <h4 className="text-sm font-medium mb-2">{outlook.title}</h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={getTrendData(outlook, selectedCountry)}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line
                                  type="monotone"
                                  dataKey="jobs"
                                  stroke={selectedCountry === "in" ? "#f97316" : "#2563eb"}
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                  name="Total Jobs"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="salary"
                                  stroke="#818cf8"
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                  name="Avg Salary"
                                  yAxisId={0} // Can add a second YAxis if scales differ wildly
                                />
                                <Legend />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Comparison View */}
                {selectedCountry === "all" && (
                  <>
                    {/* Comparison Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {outlooks[0]?.comparison?.highest_demand && (
                        <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-gradient-to-br from-orange-50 to-blue-50 border-orange-200"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-5 h-5 text-orange-500" />
                            <h4 className="font-semibold">Highest Demand</h4>
                          </div>
                          <p className="text-2xl font-bold">{outlooks[0].comparison.highest_demand.country}</p>
                          <p className="text-sm text-slate-500">Score: {outlooks[0].comparison.highest_demand.value}</p>
                        </div>
                      )}
                      {outlooks[0]?.comparison?.highest_salary && (
                        <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            <h4 className="font-semibold">Highest Salary</h4>
                          </div>
                          <p className="text-2xl font-bold">{outlooks[0].comparison.highest_salary.country}</p>
                          <p className="text-sm text-slate-500">
                            {getCurrencySymbol(outlooks[0].comparison.highest_salary.currency)}
                            {outlooks[0].comparison.highest_salary.value.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {outlooks[0]?.comparison?.best_growth && (
                        <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                            <h4 className="font-semibold">Best Growth</h4>
                          </div>
                          <p className="text-2xl font-bold">{outlooks[0].comparison.best_growth.country}</p>
                          <p className="text-sm text-slate-500">+{outlooks[0].comparison.best_growth.value}% (12mo)</p>
                        </div>
                      )}
                    </div>

                    {/* Side-by-Side Demand Comparison */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Demand Score Comparison (India vs UK)
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={getComparisonData()}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="title" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="india_demand" fill="#f97316" name="India Demand" radius={8} />
                          <Bar dataKey="uk_demand" fill="#2563eb" name="UK Demand" radius={8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Jobs Found Comparison */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Total Jobs Available (India vs UK)
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={getComparisonData()}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="title" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="india_jobs" fill="#fb923c" name="India Jobs" radius={8} />
                          <Bar dataKey="uk_jobs" fill="#60a5fa" name="UK Jobs" radius={8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Growth Rate Comparison */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        12-Month Job Growth Comparison
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={getComparisonData()}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="title" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="india_growth" fill="#22c55e" name="India Growth %" radius={8} />
                          <Bar dataKey="uk_growth" fill="#3b82f6" name="UK Growth %" radius={8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Salary Comparison */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Average Salary Comparison (India vs UK)
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={getComparisonData()}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="title" />
                          <YAxis tickFormatter={(value) => `${getCurrencySymbol("INR")}${value.toLocaleString()}`} /> {/* Assuming INR for India and GBP for UK here for display simplicity */}
                          <Tooltip formatter={(value, name, props) => [`${getCurrencySymbol(name.includes('india') ? 'INR' : 'GBP')}${value.toLocaleString()}`, name.replace('india_', 'India ').replace('uk_', 'UK ').replace('_salary', ' Salary')]} />
                          <Legend />
                          <Bar dataKey="india_salary" fill="#818cf8" name="India Salary" radius={8} />
                          <Bar dataKey="uk_salary" fill="#c084fc" name="UK Salary" radius={8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Radar Chart for Multi-Metric Comparison */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">
                            Multi-Metric Job Outlook (Normalized)
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Compares demand, salary, and growth for top roles across India and UK (normalized to 0-100 scale).
                        </p>
                        <ResponsiveContainer width="100%" height={400}>
                            <RadarChart outerRadius={150} data={getRadarChartData()}>
                                <PolarGrid strokeOpacity={0.2}/>
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} strokeOpacity={0.2}/>
                                <Radar name="India Demand" dataKey="india_demand" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
                                <Radar name="UK Demand" dataKey="uk_demand" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
                                {/* Add salary and growth to radar if appropriate for visualization */}
                                {/* <Radar name="India Salary" dataKey="india_salary" stroke="#818cf8" fill="#818cf8" fillOpacity={0.3} />
                                <Radar name="UK Salary" dataKey="uk_salary" stroke="#c084fc" fill="#c084fc" fillOpacity={0.3} /> */}
                                <Tooltip />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                  </>
                )}

                {/* Remote Work Distribution (shown for all views) */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Remote Work Distribution
                    {selectedCountry !== "all" && ` - ${selectedCountry === "in" ? "India" : "UK"}`}
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={
                          selectedCountry === "all"
                            ? [
                                {
                                  name: "India Remote",
                                  value: outlooks.filter(o => getCountryData(o, "in").is_remote_friendly).length
                                },
                                {
                                  name: "India On-site",
                                  value: outlooks.filter(o => !getCountryData(o, "in").is_remote_friendly).length
                                },
                                {
                                  name: "UK Remote",
                                  value: outlooks.filter(o => getCountryData(o, "gb").is_remote_friendly).length
                                },
                                {
                                  name: "UK On-site",
                                  value: outlooks.filter(o => !getCountryData(o, "gb").is_remote_friendly).length
                                }
                              ]
                            : [
                                {
                                  name: "Remote/Hybrid",
                                  value: outlooks.filter(o => getCountryData(o, selectedCountry).is_remote_friendly).length
                                },
                                {
                                  name: "On-site",
                                  value: outlooks.filter(o => !getCountryData(o, selectedCountry).is_remote_friendly).length
                                }
                              ]
                        }
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobOutlookModal;