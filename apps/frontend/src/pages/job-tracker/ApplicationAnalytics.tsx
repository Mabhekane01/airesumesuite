import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  TrendingUpIcon,
  CalendarIcon,
  ClockIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  PresentationChartLineIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

import {
  SimpleLineChart as LineChart,
  SimpleBarChart as BarChart,
  SimplePieChart as PieChart,
  SimpleResponsiveContainer as ResponsiveContainer,
} from '../../components/charts/SimpleCharts';
import { analyticsAPI } from '../../services/api';
import DragonSnakeGame from '../../components/games/DragonSnakeGame';
import { motion } from 'framer-motion';

interface AnalyticsData {
  overview: {
    totalApplications: number;
    activeApplications: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
    averageResponseTime: number;
  };
  trends: {
    applicationsOverTime: Array<{
      date: string;
      applications: number;
      responses: number;
      interviews: number;
    }>;
    statusDistribution: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    applicationsTrend?: number;
    responseRateTrend?: number;
    interviewRateTrend?: number;
    responseTimeTrend?: number;
  };
  insights: {
    topCompanies: Array<{
      company: string;
      applications: number;
      successRate: number;
    }>;
    applicationsBySource: Array<{
      source: string;
      count: number;
      conversionRate: number;
    }>;
    salaryAnalysis: {
      averageMin: number;
      averageMax: number;
      byLocation: Array<{
        location: string;
        averageSalary: number;
        count: number;
      }>;
    };
  };
  performance: {
    monthlyStats: Array<{
      month: string;
      applications: number;
      interviews: number;
      offers: number;
      rejections: number;
    }>;
    conversionFunnel: Array<{
      stage: string;
      count: number;
      percentage: number;
    }>;
  };
}

export default function ApplicationAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('3m');
  const [selectedTrendMetric, setSelectedTrendMetric] = useState('applications');
  const [selectedMonthlyMetric, setSelectedMonthlyMetric] = useState('applications');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getApplicationAnalytics({ timeRange });
      if (response.success && response.data) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-10">
        <div className="h-20 bg-white border border-surface-200 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-surface-200 rounded-[2rem]"></div>
          ))}
        </div>
        <div className="h-96 bg-white border border-surface-200 rounded-[2.5rem]"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-20 bg-white border border-surface-200 rounded-[3rem] shadow-sm">
        <ChartBarIcon className="w-20 h-20 text-text-tertiary mx-auto mb-6 opacity-20" />
        <h2 className="text-2xl font-black text-brand-dark mb-2 tracking-tight">Null Analytics Data.</h2>
        <p className="text-text-secondary font-bold max-w-sm mx-auto">Start your application protocols to generate real-time metrics.</p>
      </div>
    );
  }

  const { overview, trends, insights, performance } = analyticsData;

  return (
    <div className="space-y-10 animate-slide-up-soft pb-20">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <PresentationChartLineIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Performance Console</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-brand-dark tracking-tighter">Application Analytics.</h1>
          <p className="text-lg text-text-secondary font-bold opacity-70">Metric tracking and conversion funnel optimization.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white border border-surface-200 p-2 rounded-2xl shadow-sm">
          <div className="px-4 py-2 text-[10px] font-black text-text-tertiary uppercase tracking-widest border-r border-surface-100">Range</div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-transparent text-xs font-black text-brand-dark uppercase tracking-widest outline-none pr-4 cursor-pointer"
          >
            <option value="1m">1 Month</option>
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="all">Deployment Total</option>
          </select>
        </div>
      </div>

      {/* --- KEY METRICS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Total Deployments", val: overview.totalApplications, icon: BuildingOfficeIcon, color: "text-brand-blue", bg: "bg-brand-blue/10", trend: trends?.applicationsTrend },
          { label: "Response Rate", val: `${overview.responseRate.toFixed(1)}%`, icon: CheckCircleIcon, color: "text-brand-success", bg: "bg-brand-success/10", trend: trends?.responseRateTrend },
          { label: "Interview Index", val: `${overview.interviewRate.toFixed(1)}%`, icon: UserGroupIcon, color: "text-brand-orange", bg: "bg-brand-orange/10", trend: trends?.interviewRateTrend },
          { label: "Latency (Days)", val: overview.averageResponseTime, icon: ClockIcon, color: "text-brand-dark", bg: "bg-brand-dark/5", trend: trends?.responseTimeTrend, inverse: true }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-surface-200 p-8 rounded-[2rem] shadow-sm group hover:shadow-xl transition-all duration-500"
          >
            <div className="flex items-start justify-between mb-6">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500`}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.trend !== undefined && (
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${
                  (stat.inverse ? stat.trend < 0 : stat.trend > 0) ? "text-brand-success" : "text-red-500"
                }`}>
                  {stat.trend > 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                  {Math.abs(stat.trend).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-[11px] font-black text-text-tertiary uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-4xl font-black text-brand-dark tracking-tighter group-hover:text-brand-blue transition-colors">{stat.val}</p>
          </motion.div>
        ))}
      </div>

      {/* --- CHARTS ROW --- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white border border-surface-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-brand-dark tracking-tight leading-none">Deployment Trends.</h3>
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Active nodes over time</p>
            </div>
            <div className="flex bg-surface-50 border border-surface-200 p-1 rounded-xl">
              {['applications', 'responses', 'interviews'].map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedTrendMetric(m)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedTrendMetric === m ? 'bg-white text-brand-blue shadow-sm' : 'text-text-tertiary hover:text-brand-dark'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={trends.applicationsOverTime} 
                dataKey={selectedTrendMetric}
                strokeColor="#1a91f0"
              />
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
          <h3 className="text-2xl font-black text-brand-dark tracking-tight leading-none mb-10 text-center">Status Distribution Cluster.</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart 
                data={trends.statusDistribution}
                dataKey="count"
                nameKey="status"
                colors={['#1a91f0', '#ff9900', '#2ecc71', '#1e2532', '#e74c3c', '#9ca3af']}
              />
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- FUNNEL & INSIGHTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white border border-surface-200 rounded-[2.5rem] p-10 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-brand-dark text-white flex items-center justify-center shadow-lg">
              <FunnelIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-brand-dark tracking-tight leading-none mb-1">Conversion Funnel.</h3>
              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Pipeline transition efficiency</p>
            </div>
          </div>
          
          <div className="space-y-8 px-4">
            {performance.conversionFunnel.map((stage, index) => (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-black text-brand-dark uppercase tracking-widest">{stage.stage}</span>
                  <span className="text-xs font-black text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded-lg border border-brand-blue/10">
                    {stage.count} Nodes ({stage.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-surface-50 rounded-full h-2 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${stage.percentage}%` }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="bg-brand-blue h-full rounded-full shadow-[0_0_15px_rgba(26,145,240,0.3)]"
                  />
                </div>
                {index < performance.conversionFunnel.length - 1 && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-20">
                    <ArrowDownIcon className="w-4 h-4 text-brand-dark" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-surface-200 rounded-[2.5rem] p-10 shadow-sm">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-brand-dark tracking-tight leading-none mb-1">Source Dynamics.</h3>
              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Platform conversion metrics</p>
            </div>
          </div>

          <div className="space-y-4">
            {insights.applicationsBySource.slice(0, 5).map((source, i) => (
              <div key={i} className="p-5 bg-surface-50 border border-surface-200 rounded-2xl hover:border-brand-blue/20 transition-all group shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm font-black text-brand-dark capitalize leading-none mb-1">{source.source.replace('_', ' ')}</p>
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{source.count} Deployments</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${source.conversionRate > 15 ? 'text-brand-success' : 'text-brand-dark'}`}>
                      {source.conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-tighter">Conversion</p>
                  </div>
                </div>
                <div className="h-1 w-full bg-white rounded-full overflow-hidden border border-surface-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(source.conversionRate * 4, 100)}%` }}
                    className={`h-full ${source.conversionRate > 15 ? 'bg-brand-success' : 'bg-brand-blue'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- DRAGON GAME SECTION --- */}
      <div className="bg-brand-dark rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden group border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(26,145,240,0.15),transparent_70%)] animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-10">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-brand-blue font-black uppercase tracking-[0.3em] text-[10px]">
              Module: System Break
            </div>
            <h2 className="text-5xl md:text-6xl font-display font-black tracking-tighter">The Career Dragon.</h2>
            <p className="text-xl text-surface-300 font-bold leading-relaxed opacity-80">
              Initializing neural cooldown protocol. Guide your dragon through the market grid while we process your background deployment.
            </p>
          </div>
          
          <div className="w-full max-w-4xl p-2 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
            <DragonSnakeGame />
          </div>
          
          <div className="flex flex-wrap justify-center gap-10 opacity-60">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="w-2 h-2 rounded-full bg-brand-success shadow-[0_0_10px_rgba(46,204,113,0.8)]" />
              Gems: Career Growth
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              Fire: System Override
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(26,145,240,0.8)]" />
              Boost: Process Speed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}