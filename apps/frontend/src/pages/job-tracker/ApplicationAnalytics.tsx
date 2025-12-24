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
import { analyticsAPI, advancedAnalyticsAPI } from '../../services/api';
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
  documentEngagement?: {
    totalViews: number;
    totalDownloads: number;
    uniqueViewers: number;
    engagementRate: number;
    topDocuments: Array<{
      title: string;
      views: number;
      status: string;
    }>;
    viewsOverTime: Array<{
      date: string;
      views: number;
    }>;
    recentViews?: Array<{
      documentTitle: string;
      viewedAt: string;
      ipAddress: string;
      userAgent: string;
      location?: string;
    }>;
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

import { 
  EyeIcon, 
  ArrowDownTrayIcon, 
  FingerPrintIcon, 
  SignalIcon, 
  GlobeAltIcon as GlobeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function ApplicationAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('3m');
  const [selectedTrendMetric, setSelectedTrendMetric] = useState('applications');
  const [selectedMonthlyMetric, setSelectedMonthlyMetric] = useState('applications');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      let loaded = false;

      // Try advanced analytics first (Premium)
      try {
        const response = await advancedAnalyticsAPI.getComprehensiveAnalytics();
        console.log('Advanced Analytics Response:', response);
        if (response.success && response.data && response.data.analytics) {
          console.log('Analytics Data to set (Advanced):', response.data.analytics);
          setAnalyticsData(response.data.analytics);
          loaded = true;
        }
      } catch (advancedError: any) {
        console.warn('Advanced analytics failed, attempting fallback:', advancedError?.message || advancedError);
      }

      // Fallback to standard analytics (Free)
      if (!loaded) {
        console.log('Falling back to standard analytics API...');
        try {
          const response = await analyticsAPI.getApplicationAnalytics({ timeRange });
          console.log('Standard Analytics Response:', response);
          if (response.success && response.data) {
            // Standard API returns the data directly, not wrapped in 'analytics' property
            console.log('Analytics Data to set (Standard):', response.data);
            setAnalyticsData(response.data);
            loaded = true;
          } else {
            console.warn('Standard Analytics API returned success=false or no data');
            setError('Standard analytics returned no data.');
          }
        } catch (standardError: any) {
          console.error('Standard analytics also failed:', standardError);
          setError(standardError?.message || 'Failed to load analytics data.');
        }
      }
    } catch (error: any) {
      console.error('Failed to load analytics (all attempts):', error);
      setError(error?.message || 'An unexpected error occurred.');
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

  if (!analyticsData || !analyticsData.overview) {
    return (
      <div className="text-center py-20 bg-white border border-surface-200 rounded-[3rem] shadow-sm">
        <ChartBarIcon className="w-20 h-20 text-text-tertiary mx-auto mb-6 opacity-20" />
        <h2 className="text-2xl font-black text-brand-dark mb-2 tracking-tight">Null Analytics Data.</h2>
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl max-w-md mx-auto">
            <p className="font-bold text-sm">System Error:</p>
            <p className="text-xs font-mono mt-1">{error}</p>
          </div>
        )}
        <p className="text-text-secondary font-bold max-w-sm mx-auto mt-4">Start your application protocols to generate real-time metrics.</p>
      </div>
    );
  }

  const { 
    overview = {
      totalApplications: 0,
      activeApplications: 0,
      responseRate: 0,
      interviewRate: 0,
      offerRate: 0,
      averageResponseTime: 0
    }, 
    trends = {
      applicationsOverTime: [],
      statusDistribution: [],
      applicationsTrend: 0,
      responseRateTrend: 0,
      interviewRateTrend: 0,
      responseTimeTrend: 0
    }, 
    insights = {
      topCompanies: [],
      applicationsBySource: [],
      salaryAnalysis: { averageMin: 0, averageMax: 0, byLocation: [] }
    }, 
    performance = {
      monthlyStats: [],
      conversionFunnel: []
    }, 
    documentEngagement 
  } = analyticsData;

  return (
    <div className="space-y-6 md:space-y-12 animate-slide-up-soft pb-24">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8 pb-6 border-b border-surface-200/60">
        <div className="space-y-3 md:space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-brand-blue/5 text-brand-blue border border-brand-blue/10 shadow-sm backdrop-blur-sm">
            <PresentationChartLineIcon className="w-4 h-4" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Performance Intelligence Console</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-6xl font-display font-black text-brand-dark tracking-tighter">
              Deployment <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">Analytics.</span>
            </h1>
            <p className="text-base md:text-xl text-text-secondary font-medium max-w-2xl leading-relaxed opacity-80">
              Synthesize tracking signals and conversion metrics into actionable career intelligence.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 bg-white border border-surface-200 p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm w-full sm:w-auto">
          <div className="px-3 md:px-4 py-2 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest border-r border-surface-100">Range</div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="flex-1 bg-transparent text-[10px] md:text-xs font-black text-brand-dark uppercase tracking-widest outline-none pr-4 cursor-pointer"
          >
            <option value="1m">1 Month</option>
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="all">Deployment Total</option>
          </select>
        </div>
      </div>

      {/* --- DOCUMENT INTELLIGENCE --- */}
      {documentEngagement && (
        <div className="space-y-6 md:space-y-8">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" />
            <h2 className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Document Tracking Grid (Live)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { label: "Total Document Views", val: documentEngagement.totalViews, icon: EyeIcon, color: "text-brand-purple", bg: "bg-brand-purple/5" },
              { label: "Unique Viewers", val: documentEngagement.uniqueViewers, icon: UserGroupIcon, color: "text-brand-blue", bg: "bg-brand-blue/5" },
              { label: "Asset Downloads", val: documentEngagement.totalDownloads, icon: ArrowDownTrayIcon, color: "text-brand-success", bg: "bg-brand-success/5" },
              { label: "Engagement Rate", val: `${documentEngagement.engagementRate.toFixed(1)}%`, icon: SignalIcon, color: "text-brand-orange", bg: "bg-brand-orange/5" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-surface-200 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm group hover:shadow-xl hover:border-brand-purple/20 transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                  <stat.icon className="w-16 h-16 md:w-20 md:h-20" />
                </div>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current/20 mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <p className="text-[10px] md:text-[11px] font-black text-text-tertiary uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl md:text-4xl font-black text-brand-dark tracking-tighter group-hover:text-brand-purple transition-colors">{stat.val}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-8 bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
              <div className="relative z-10 flex items-center justify-between mb-6 md:mb-10 pb-4 md:pb-6 border-b border-surface-100">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-display font-black text-brand-dark tracking-tight leading-none uppercase">High-Engagement Architectures.</h3>
                  <p className="text-[10px] md:text-xs font-bold text-text-tertiary uppercase tracking-widest">Performance by deployment node</p>
                </div>
                <FingerPrintIcon className="w-6 h-6 md:w-8 md:h-8 text-brand-purple opacity-20" />
              </div>
              
              <div className="relative z-10 space-y-3 md:space-y-4">
                {documentEngagement.topDocuments.length === 0 ? (
                  <div className="py-16 md:py-20 text-center border-2 border-dashed border-surface-100 rounded-[1.5rem] md:rounded-3xl">
                    <p className="text-sm font-bold text-text-tertiary italic">Waiting for tracking signals...</p>
                  </div>
                ) : (
                  documentEngagement.topDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 md:p-6 bg-surface-50 border border-surface-200 rounded-xl md:rounded-2xl hover:bg-white hover:border-brand-purple/20 hover:shadow-xl transition-all duration-300 group/item">
                      <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-white border border-surface-100 flex items-center justify-center text-brand-purple shadow-sm group-hover/item:scale-110 transition-transform">
                          <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-black text-brand-dark group-hover/item:text-brand-purple transition-colors truncate max-w-[150px] md:max-w-none">{doc.title}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${doc.status === 'active' ? 'bg-brand-success' : 'bg-surface-300'}`} />
                            <span className="hidden sm:inline">Node Status:</span> {doc.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl md:text-2xl font-black text-brand-dark tracking-tighter">{doc.views}</p>
                        <p className="text-[8px] md:text-[9px] font-black text-text-tertiary uppercase tracking-widest">Total Hits</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-4 bg-brand-dark rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.3),transparent_60%)]" />
              <div className="relative z-10 space-y-6 md:space-y-8">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-brand-purple backdrop-blur-md">
                  <CpuChipIcon className="w-6 h-6 md:w-7 md:h-7 stroke-[1.5px]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl md:text-3xl font-display font-black tracking-tight leading-tight">Document <br className="hidden md:block" />Intelligence.</h3>
                  <p className="text-xs md:text-sm font-medium text-white/60 leading-relaxed">
                    AI-driven analysis of recruiter interactions with your nodes. 
                  </p>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                  <div className="p-4 md:p-5 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl hover:bg-white/10 transition-colors">
                    <p className="text-[10px] md:text-xs font-black text-brand-purple uppercase tracking-[0.2em] mb-1.5 md:mb-2">Real-Time Sync</p>
                    <p className="text-xs md:text-sm font-medium text-surface-200">Documents are sending signals from 12+ external platforms.</p>
                  </div>
                  <div className="p-4 md:p-5 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl hover:bg-white/10 transition-colors">
                    <p className="text-[10px] md:text-xs font-black text-brand-success uppercase tracking-[0.2em] mb-1.5 md:mb-2">Optimal Engagement</p>
                    <p className="text-xs md:text-sm font-medium text-surface-200">Most views occur within 48 hours of initial deployment.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {documentEngagement.recentViews && documentEngagement.recentViews.length > 0 && (
            <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-lg relative overflow-hidden mt-6 md:mt-8">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-display font-black text-brand-dark tracking-tight leading-none uppercase">Signal Access Logs.</h3>
                  <p className="text-[10px] md:text-xs font-bold text-text-tertiary uppercase tracking-widest">Real-time recruiter interactions</p>
                </div>
              </div>
              
              <div className="overflow-x-auto -mx-6 md:mx-0">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-surface-100 text-left">
                      <th className="pb-4 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-6 md:pl-4">Document Node</th>
                      <th className="pb-4 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Source IP / Location</th>
                      <th className="pb-4 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Client Signature</th>
                      <th className="pb-4 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest text-right pr-6 md:pr-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {documentEngagement.recentViews.map((view, idx) => (
                      <tr key={idx} className="group hover:bg-surface-50 transition-colors">
                        <td className="py-4 pl-6 md:pl-4">
                          <div className="font-bold text-brand-dark text-sm">{view.documentTitle}</div>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] md:text-xs text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded w-fit mb-1">{view.ipAddress}</span>
                            {view.location && typeof view.location === 'string' && (
                              <span className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{view.location}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="text-[10px] md:text-xs text-text-secondary max-w-[150px] md:max-w-xs truncate" title={view.userAgent}>{view.userAgent}</div>
                        </td>
                        <td className="py-4 text-right pr-6 md:pr-4">
                          <div className="font-bold text-brand-dark text-[10px] md:text-xs">{new Date(view.viewedAt).toLocaleDateString()}</div>
                          <div className="text-[9px] md:text-[10px] text-text-tertiary font-mono">{new Date(view.viewedAt).toLocaleTimeString()}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- CORE PIPELINE METRICS --- */}
      <div className="space-y-6 md:space-y-8 pt-6 md:pt-8 border-t border-surface-200/60">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
          <h2 className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Pipeline Execution Metrics</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
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
              className="bg-white border border-surface-200 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm group hover:shadow-xl transition-all duration-500"
            >
              <div className="flex items-start justify-between mb-4 md:mb-6">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500 shadow-sm`}>
                  <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                {stat.trend !== undefined && (
                  <div className={`flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest ${
                    (stat.inverse ? stat.trend < 0 : stat.trend > 0) ? "text-brand-success" : "text-red-500"
                  }`}>
                    {stat.trend > 0 ? <ArrowUpIcon className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <ArrowDownIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                    {Math.abs(stat.trend).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-[10px] md:text-[11px] font-black text-text-tertiary uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl md:text-4xl font-black text-brand-dark tracking-tighter group-hover:text-brand-blue transition-colors">{stat.val}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- CHARTS ROW --- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-10 gap-4">
            <div className="space-y-1">
              <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none">Deployment Trends.</h3>
              <p className="text-[10px] md:text-xs font-bold text-text-tertiary uppercase tracking-widest">Active nodes over time</p>
            </div>
            <div className="flex bg-surface-50 border border-surface-200 p-1 rounded-xl w-fit">
              {['applications', 'responses', 'interviews'].map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedTrendMetric(m)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedTrendMetric === m ? 'bg-white text-brand-blue shadow-sm' : 'text-text-tertiary hover:text-brand-dark'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={trends.applicationsOverTime} 
                dataKey={selectedTrendMetric}
                fillColor="#3B82F6"
              />
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
          <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none mb-8 md:mb-10 text-center">Status Distribution Cluster.</h3>
          <div className="h-[250px] md:h-[300px] w-full">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-7 bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 mb-10 md:mb-12">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-brand-dark text-white flex items-center justify-center shadow-lg">
              <FunnelIcon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none mb-1">Conversion Funnel.</h3>
              <p className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Pipeline transition efficiency</p>
            </div>
          </div>
          
          <div className="space-y-6 md:space-y-8 px-2 md:px-4">
            {performance.conversionFunnel.map((stage, index) => (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-2 md:mb-3 px-1">
                  <span className="text-[10px] md:text-xs font-black text-brand-dark uppercase tracking-widest">{stage.stage}</span>
                  <span className="text-[10px] md:text-xs font-black text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded-lg border border-brand-blue/10">
                    {stage.count} <span className="hidden sm:inline">Nodes</span> ({stage.percentage}%)
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
                  <div className="absolute -bottom-5 md:-bottom-6 left-1/2 -translate-x-1/2 opacity-20">
                    <ArrowDownIcon className="w-3 h-3 md:w-4 md:h-4 text-brand-dark" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none mb-1">Source Dynamics.</h3>
              <p className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Platform conversion metrics</p>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xs md:text-sm font-black text-brand-dark mb-4 uppercase tracking-wider">Top Target Companies</h4>
            <div className="h-[180px] md:h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={insights.topCompanies.map(c => ({ name: c.company, applications: c.applications }))}
                  dataKey="applications"
                  fillColor="#8B5CF6"
                />
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3 md:space-y-4">
            {insights.applicationsBySource.slice(0, 5).map((source, i) => (
              <div key={i} className="p-4 md:p-5 bg-surface-50 border border-surface-200 rounded-xl md:rounded-2xl hover:border-brand-blue/20 transition-all group shadow-sm">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <div>
                    <p className="text-xs md:text-sm font-black text-brand-dark capitalize leading-none mb-1">{source.source.replace('_', ' ')}</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{source.count} Deployments</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs md:text-sm font-black ${source.conversionRate > 15 ? 'text-brand-success' : 'text-brand-dark'}`}>
                      {source.conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-[8px] md:text-[9px] font-bold text-text-tertiary uppercase tracking-tighter">Conversion</p>
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
      <div className="bg-brand-dark rounded-[2rem] md:rounded-[3rem] p-8 md:p-20 text-white relative overflow-hidden group border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(26,145,240,0.15),transparent_70%)] animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-8 md:space-y-10">
          <div className="space-y-3 md:space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 md:px-5 py-1.5 md:py-2 rounded-full bg-white/10 border border-white/20 text-brand-blue font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px]">
              Module: System Break
            </div>
            <h2 className="text-3xl md:text-6xl font-display font-black tracking-tighter leading-tight">The Career Dragon.</h2>
            <p className="text-base md:text-xl text-surface-300 font-bold leading-relaxed opacity-80">
              Initializing neural cooldown protocol. Guide your dragon through the market grid.
            </p>
          </div>
          
          <div className="w-full max-w-4xl p-1.5 md:p-2 bg-white/5 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
            <DragonSnakeGame />
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 opacity-60">
            <div className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand-success shadow-[0_0_10px_rgba(46,204,113,0.8)]" />
              Gems: Growth
            </div>
            <div className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              Fire: Override
            </div>
            <div className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(26,145,240,0.8)]" />
              Boost: Speed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}