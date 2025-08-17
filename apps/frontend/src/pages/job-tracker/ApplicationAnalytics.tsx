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
} from '@heroicons/react/24/outline';

// Simple salary formatter
const formatSalary = (amount: number) => {
  return `$${amount.toLocaleString()}`;
};
import {
  SimpleLineChart as LineChart,
  SimpleBarChart as BarChart,
  SimplePieChart as PieChart,
  SimpleResponsiveContainer as ResponsiveContainer,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from '../../components/charts/SimpleCharts';
import { jobApplicationAPI, analyticsAPI } from '../../services/api';
import DragonSnakeGame from '../../components/games/DragonSnakeGame';

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

const STATUS_COLORS = {
  applied: '#3B82F6',
  under_review: '#F59E0B',
  phone_screen: '#8B5CF6',
  technical_assessment: '#6366F1',
  first_interview: '#8B5CF6',
  second_interview: '#7C3AED',
  final_interview: '#6D28D9',
  offer_received: '#10B981',
  offer_accepted: '#059669',
  rejected: '#EF4444',
  withdrawn: '#6B7280',
};

export default function ApplicationAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('3m'); // 1m, 3m, 6m, 1y, all
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
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-800/20 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/20 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-800/20 rounded-lg"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="w-16 h-16 text-dark-text-muted mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-dark-text-primary mb-2">No Analytics Data</h2>
        <p className="text-dark-text-secondary">Start applying to jobs to see your analytics.</p>
      </div>
    );
  }

  const { overview, trends, insights, performance } = analyticsData;

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up-soft w-full min-w-0 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold gradient-text-dark">Application Analytics</h1>
          <p className="text-sm md:text-base text-dark-text-secondary mt-1">
            Track your job search performance and identify opportunities for improvement
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <FunnelIcon className="w-4 h-4 text-dark-text-muted absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input-field-dark pl-8 pr-3 py-2 rounded-lg text-sm min-w-0 relative z-50 w-auto"
            >
              <option value="1m">1M</option>
              <option value="3m">3M</option>
              <option value="6m">6M</option>
              <option value="1y">1Y</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="px-3 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-xs sm:text-sm flex items-center justify-center space-x-2 min-w-0">
            <span>🐉</span>
            <span className="hidden sm:inline whitespace-nowrap">Dragon Game Below!</span>
            <span className="sm:hidden">Game Below!</span>
          </div>
        </div>
      </div>


      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-dark-text-secondary truncate">Total Applications</p>
              <p className="text-xl sm:text-2xl font-bold text-dark-text-primary">{overview.totalApplications}</p>
            </div>
            <div className="p-2 sm:p-3 bg-teal-500/20 rounded-lg flex-shrink-0">
              <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
            </div>
          </div>
          {analyticsData.trends?.applicationsTrend && (
            <div className="mt-4 flex items-center">
              {analyticsData.trends.applicationsTrend > 0 ? (
                <>
                  <ArrowUpIcon className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-xs sm:text-sm text-green-400">
                    {analyticsData.trends.applicationsTrend.toFixed(1)}% from last period
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownIcon className="w-4 h-4 text-red-400 mr-1" />
                  <span className="text-xs sm:text-sm text-red-400">
                    {Math.abs(analyticsData.trends.applicationsTrend).toFixed(1)}% from last period
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-dark-text-secondary truncate">Response Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-dark-text-primary">{overview.responseRate.toFixed(1)}%</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg flex-shrink-0">
              <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
            </div>
          </div>
          {analyticsData.trends?.responseRateTrend && (
            <div className="mt-4 flex items-center">
              {analyticsData.trends.responseRateTrend > 0 ? (
                <>
                  <ArrowUpIcon className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-xs sm:text-sm text-green-400">
                    {analyticsData.trends.responseRateTrend.toFixed(1)}% improvement
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownIcon className="w-4 h-4 text-red-400 mr-1" />
                  <span className="text-xs sm:text-sm text-red-400">
                    {Math.abs(analyticsData.trends.responseRateTrend).toFixed(1)}% decrease
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-dark-text-secondary truncate">Interview Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-dark-text-primary">{overview.interviewRate.toFixed(1)}%</p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-500/20 rounded-lg flex-shrink-0">
              <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
          </div>
          {analyticsData.trends?.interviewRateTrend && (
            <div className="mt-4 flex items-center">
              {analyticsData.trends.interviewRateTrend > 0 ? (
                <>
                  <ArrowUpIcon className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">
                    {analyticsData.trends.interviewRateTrend.toFixed(1)}% improvement
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownIcon className="w-4 h-4 text-red-400 mr-1" />
                  <span className="text-sm text-red-400">
                    {Math.abs(analyticsData.trends.interviewRateTrend).toFixed(1)}% decrease
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-dark-text-secondary truncate">Avg Response Time</p>
              <p className="text-xl sm:text-2xl font-bold text-dark-text-primary">{overview.averageResponseTime} days</p>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-500/20 rounded-lg flex-shrink-0">
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
            </div>
          </div>
          {analyticsData.trends?.responseTimeTrend && (
            <div className="mt-4 flex items-center">
              {analyticsData.trends.responseTimeTrend < 0 ? (
                <>
                  <ArrowDownIcon className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">
                    {Math.abs(analyticsData.trends.responseTimeTrend)} day{Math.abs(analyticsData.trends.responseTimeTrend) !== 1 ? 's' : ''} faster
                  </span>
                </>
              ) : (
                <>
                  <ArrowUpIcon className="w-4 h-4 text-red-400 mr-1" />
                  <span className="text-sm text-red-400">
                    {analyticsData.trends.responseTimeTrend} day{analyticsData.trends.responseTimeTrend !== 1 ? 's' : ''} slower
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Application Trends */}
        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6 w-full overflow-visible">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary">Application Trends</h3>
              <p className="text-xs sm:text-sm text-dark-text-secondary mt-1">
                Track your job search activity over time
              </p>
            </div>
            <div className="relative">
              <FunnelIcon className="w-4 h-4 text-dark-text-muted absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedTrendMetric}
                onChange={(e) => {
                  setSelectedTrendMetric(e.target.value);
                }}
                className="input-field-dark pl-8 pr-3 py-1 text-xs rounded min-w-0 relative z-50 w-auto"
              >
                <option value="applications">Apps</option>
                <option value="responses">Responses</option>
                <option value="interviews">Interviews</option>
              </select>
            </div>
          </div>
          
          {/* Metric explanation */}
          <div className="mb-4 p-3 bg-gray-800/30 rounded-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <span className="text-dark-text-secondary text-xs sm:text-sm">
                {selectedTrendMetric === 'applications' && 'Total job applications you submitted'}
                {selectedTrendMetric === 'responses' && 'Companies that responded to your applications'}
                {selectedTrendMetric === 'interviews' && 'Interview opportunities you received'}
              </span>
              {trends.applicationsOverTime?.[0] && (
                <span className="text-dark-text-primary font-semibold text-xs sm:text-sm flex-shrink-0">
                  Current: {trends.applicationsOverTime[0][selectedTrendMetric]}
                  {selectedTrendMetric === 'responses' && trends.applicationsOverTime[0]['applications'] && 
                    ` (${Math.round((trends.applicationsOverTime[0]['responses'] / trends.applicationsOverTime[0]['applications']) * 100)}%)`
                  }
                  {selectedTrendMetric === 'interviews' && trends.applicationsOverTime[0]['applications'] && 
                    ` (${Math.round((trends.applicationsOverTime[0]['interviews'] / trends.applicationsOverTime[0]['applications']) * 100)}%)`
                  }
                </span>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            {trends.applicationsOverTime && trends.applicationsOverTime.length > 0 ? (
              <LineChart 
                key={selectedTrendMetric}
                data={trends.applicationsOverTime} 
                dataKey={selectedTrendMetric}
                strokeColor={
                  selectedTrendMetric === 'applications' ? '#3B82F6' :
                  selectedTrendMetric === 'responses' ? '#10B981' : '#8B5CF6'
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full text-dark-text-secondary">
                No trend data available for the selected period
              </div>
            )}
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6 w-full overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary mb-4 sm:mb-6">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart 
              data={trends.statusDistribution}
              dataKey="count"
              nameKey="status"
              colors={['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444', '#6B7280']}
            />
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Performance */}
        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6 w-full overflow-visible">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary">Monthly Performance</h3>
              <p className="text-xs sm:text-sm text-dark-text-secondary mt-1">
                Compare your monthly job search outcomes
              </p>
            </div>
            <div className="relative">
              <FunnelIcon className="w-4 h-4 text-dark-text-muted absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedMonthlyMetric}
                onChange={(e) => setSelectedMonthlyMetric(e.target.value)}
                className="input-field-dark pl-8 pr-3 py-1 text-xs rounded min-w-0 relative z-50 w-auto"
              >
                <option value="applications">Apps</option>
                <option value="interviews">Interviews</option>
                <option value="offers">Offers</option>
                <option value="rejections">Rejections</option>
              </select>
            </div>
          </div>
          
          {/* Performance insight */}
          <div className="mb-4 p-3 bg-gray-800/30 rounded-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <span className="text-dark-text-secondary text-xs sm:text-sm">
                {selectedMonthlyMetric === 'applications' && 'Monthly application volume shows your activity level'}
                {selectedMonthlyMetric === 'interviews' && 'Interview count indicates market response to your profile'}
                {selectedMonthlyMetric === 'offers' && 'Job offers received - your ultimate success metric'}
                {selectedMonthlyMetric === 'rejections' && 'Learning opportunities to improve your approach'}
              </span>
              {performance.monthlyStats?.[0] && (
                <span className="text-dark-text-primary font-semibold text-xs sm:text-sm flex-shrink-0">
                  Latest: {performance.monthlyStats[0][selectedMonthlyMetric] || 0}
                </span>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              key={selectedMonthlyMetric}
              data={performance.monthlyStats}
              dataKey={selectedMonthlyMetric}
              fillColor={
                selectedMonthlyMetric === 'applications' ? '#3B82F6' :
                selectedMonthlyMetric === 'interviews' ? '#8B5CF6' :
                selectedMonthlyMetric === 'offers' ? '#10B981' : '#EF4444'
              }
            />
          </ResponsiveContainer>
        </div>

        {/* Conversion Funnel */}
        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6 w-full overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary mb-4 sm:mb-6">Conversion Funnel</h3>
          <div className="space-y-4">
            {performance.conversionFunnel.map((stage, index) => (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium text-dark-text-primary truncate pr-2">{stage.stage}</span>
                  <span className="text-xs sm:text-sm text-dark-text-secondary flex-shrink-0">
                    {stage.count} ({stage.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-800/20 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
                {index < performance.conversionFunnel.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowDownIcon className="w-4 h-4 text-dark-text-muted" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Companies */}
        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6 w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary">Top Companies Applied</h3>
              <p className="text-xs sm:text-sm text-dark-text-secondary mt-1">
                Your most targeted employers
              </p>
            </div>
            <div className="text-xs text-dark-text-muted text-center sm:text-right flex-shrink-0">
              Success Rate vs {overview.offerRate?.toFixed(1)}% avg
            </div>
          </div>
          
          {insights.topCompanies && insights.topCompanies.length > 0 ? (
            <div className="space-y-4">
              {insights.topCompanies.slice(0, 5).map((company, index) => {
                const successColor = company.successRate >= (overview.offerRate * 1.5) ? 'green' : 
                                   company.successRate >= overview.offerRate ? 'yellow' : 'red';
                const progressWidth = Math.max((company.applications / Math.max(...insights.topCompanies.map(c => c.applications))) * 100, 5);
                
                return (
                  <div key={company.company} className="group hover:bg-gray-800/20 rounded-lg p-3 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          index === 1 ? 'bg-gray-400/20 text-gray-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-teal-500/20 text-teal-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-dark-text-primary group-hover:text-dark-accent transition-colors">
                            {company.company}
                          </p>
                          <p className="text-xs text-dark-text-muted">
                            {company.applications} application{company.applications !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          successColor === 'green' ? 'text-green-400' : 
                          successColor === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {company.successRate?.toFixed(1) || 0}%
                        </span>
                        <p className="text-xs text-dark-text-muted">success rate</p>
                      </div>
                    </div>
                    
                    {/* Progress bar showing relative application volume */}
                    <div className="w-full bg-gray-800/30 rounded-full h-2 mt-2">
                      <div
                        className="bg-dark-accent rounded-full h-2 transition-all duration-500"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BuildingOfficeIcon className="w-12 h-12 text-dark-text-muted mx-auto mb-3" />
              <p className="text-dark-text-secondary">No companies data available</p>
              <p className="text-xs text-dark-text-muted mt-1">Start applying to jobs to see company insights</p>
            </div>
          )}
        </div>

        {/* Application Sources */}
        <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6 w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary">Application Sources</h3>
              <p className="text-xs sm:text-sm text-dark-text-secondary mt-1">
                Which platforms drive your success
              </p>
            </div>
            <div className="text-xs text-dark-text-muted text-center sm:text-right flex-shrink-0">
              Conversion to offers
            </div>
          </div>
          
          {insights.applicationsBySource && insights.applicationsBySource.length > 0 ? (
            <div className="space-y-4">
              {insights.applicationsBySource.map((source, index) => {
                const getSourceInfo = (sourceName) => {
                  const sourceInfo = {
                    'linkedin': { icon: '💼', tip: 'Global professional network' },
                    'indeed': { icon: '🔍', tip: 'Major job search engine' },
                    'glassdoor': { icon: '🏢', tip: 'Company reviews and salaries' },
                    'company_website': { icon: '🌐', tip: 'Direct applications often show initiative' },
                    'referral': { icon: '👥', tip: 'Highest success rate globally' },
                    'recruiter': { icon: '🤝', tip: 'Professional recruitment services' },
                    'manual': { icon: '✍️', tip: 'Personal outreach and networking' }
                  };
                  return sourceInfo[sourceName] || { icon: '📋', tip: 'Job application source' };
                };
                
                const sourceName = source.source.replace('_', ' ').toLowerCase();
                const sourceInfo = getSourceInfo(source.source);
                const icon = sourceInfo.icon;
                const maxApplications = Math.max(...insights.applicationsBySource.map(s => s.count));
                const volumeWidth = (source.count / maxApplications) * 100;
                
                return (
                  <div key={source.source} className="group hover:bg-gray-800/20 rounded-lg p-3 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-800/30 rounded-lg flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-dark-text-primary capitalize group-hover:text-dark-accent transition-colors truncate">
                            {sourceName}
                          </p>
                          <p className="text-xs text-dark-text-muted">
                            {source.count} application{source.count !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-teal-400 mt-1 opacity-75 hidden sm:block">
                            {sourceInfo.tip}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-sm font-bold ${
                          source.conversionRate >= 20 ? 'text-green-400' :
                          source.conversionRate >= 10 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {source.conversionRate?.toFixed(1) || 0}%
                        </span>
                        <p className="text-xs text-dark-text-muted">conversion</p>
                      </div>
                    </div>
                    
                    {/* Volume bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-dark-text-muted mb-1">
                        <span>Volume</span>
                        <span>{((source.count / insights.applicationsBySource.reduce((sum, s) => sum + s.count, 0)) * 100).toFixed(0)}% of total</span>
                      </div>
                      <div className="w-full bg-gray-800/30 rounded-full h-2">
                        <div
                          className="bg-teal-500 rounded-full h-2 transition-all duration-500"
                          style={{ width: `${volumeWidth}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Conversion bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-dark-text-muted mb-1">
                        <span>Success Rate</span>
                        <span>{source.conversionRate?.toFixed(1) || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-800/30 rounded-full h-2">
                        <div
                          className={`rounded-full h-2 transition-all duration-500 ${
                            source.conversionRate >= 20 ? 'bg-green-500' :
                            source.conversionRate >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(source.conversionRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-800/30 rounded-lg flex items-center justify-center text-2xl mx-auto mb-3">
                📊
              </div>
              <p className="text-dark-text-secondary">No application sources data</p>
              <p className="text-xs text-dark-text-muted mt-1">Apply through different platforms to see source performance</p>
            </div>
          )}
        </div>
      </div>

      {/* Dragon Game Section */}
      <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6 w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary">🐉 Take a Break</h3>
            <p className="text-xs sm:text-sm text-dark-text-secondary mt-1">
              Play our dragon snake game while your applications process!
            </p>
          </div>
          <div className="text-xl sm:text-2xl flex-shrink-0">🎮</div>
        </div>
        
        <DragonSnakeGame />
        
        <div className="mt-4 text-center">
          <p className="text-xs text-dark-text-muted">
            Need a mental break from job searching? Guide your dragon to collect gems and grow stronger! 
            <br />
            <span className="text-emerald-400">💎 Collect gems to grow</span> • 
            <span className="text-red-400 ml-2">🔥 Fire power-ups</span> • 
            <span className="text-yellow-400 ml-2">⚡ Speed boosts</span>
          </p>
        </div>
      </div>
    </div>
  );
}
