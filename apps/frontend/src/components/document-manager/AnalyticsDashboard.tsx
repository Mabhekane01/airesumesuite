import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  EyeIcon,
  DownloadIcon,
  ClockIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  RefreshIcon,
  CogIcon,
  UserGroupIcon,
  HeartIcon,
  FireIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface AnalyticsData {
  totalViews: number;
  uniqueViewers: number;
  totalDownloads: number;
  averageViewTime: number;
  conversionRate: number;
  engagementScore: number;
  topPages: PageAnalytics[];
  viewerDemographics: ViewerDemographics;
  trafficSources: TrafficSource[];
  timeSeriesData: TimeSeriesPoint[];
  realTime: RealTimeData;
  predictive: PredictiveData;
}

interface PageAnalytics {
  pageNumber: number;
  views: number;
  averageTime: number;
  scrollDepth: number;
  interactions: number;
  bounceRate: number;
}

interface ViewerDemographics {
  countries: { [key: string]: number };
  devices: { [key: string]: number };
  browsers: { [key: string]: number };
  operatingSystems: { [key: string]: number };
}

interface TrafficSource {
  source: string;
  views: number;
  conversionRate: number;
  averageSessionDuration: number;
}

interface TimeSeriesPoint {
  timestamp: string;
  views: number;
  uniqueViewers: number;
  downloads: number;
}

interface RealTimeData {
  currentViewers: number;
  recentViews: number;
  recentDownloads: number;
}

interface PredictiveData {
  predictedViews: number;
  predictedDownloads: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  countries: string[];
  devices: string[];
  browsers: string[];
}

export const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    countries: [],
    devices: [],
    browsers: [],
  });
  const [selectedMetric, setSelectedMetric] = useState<string>('views');
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Mock data for demonstration
  const mockAnalytics: AnalyticsData = {
    totalViews: 15420,
    uniqueViewers: 8920,
    totalDownloads: 1234,
    averageViewTime: 187,
    conversionRate: 8.0,
    engagementScore: 78,
    topPages: [
      { pageNumber: 1, views: 15420, averageTime: 45, scrollDepth: 85, interactions: 234, bounceRate: 12 },
      { pageNumber: 2, views: 12890, averageTime: 67, scrollDepth: 72, interactions: 189, bounceRate: 18 },
      { pageNumber: 3, views: 9870, averageTime: 89, scrollDepth: 65, interactions: 156, bounceRate: 22 },
      { pageNumber: 4, views: 7650, averageTime: 34, scrollDepth: 45, interactions: 98, bounceRate: 35 },
      { pageNumber: 5, views: 5430, averageTime: 23, scrollDepth: 28, interactions: 67, bounceRate: 48 },
    ],
    viewerDemographics: {
      countries: { 'US': 45, 'UK': 18, 'CA': 12, 'AU': 8, 'DE': 6, 'Other': 11 },
      devices: { 'desktop': 65, 'mobile': 28, 'tablet': 7 },
      browsers: { 'Chrome': 58, 'Safari': 22, 'Firefox': 12, 'Edge': 8 },
      operatingSystems: { 'Windows': 45, 'macOS': 32, 'iOS': 15, 'Android': 8 },
    },
    trafficSources: [
      { source: 'Direct', views: 6540, conversionRate: 12.5, averageSessionDuration: 245 },
      { source: 'Google', views: 4320, conversionRate: 6.8, averageSessionDuration: 189 },
      { source: 'LinkedIn', views: 2340, conversionRate: 8.9, averageSessionDuration: 267 },
      { source: 'Email', views: 1890, conversionRate: 15.2, averageSessionDuration: 312 },
      { source: 'Social', views: 1230, conversionRate: 4.2, averageSessionDuration: 156 },
    ],
    timeSeriesData: Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      views: Math.floor(Math.random() * 200) + 300,
      uniqueViewers: Math.floor(Math.random() * 150) + 200,
      downloads: Math.floor(Math.random() * 20) + 30,
    })),
    realTime: {
      currentViewers: 23,
      recentViews: 156,
      recentDownloads: 8,
    },
    predictive: {
      predictedViews: 16800,
      predictedDownloads: 1350,
      trend: 'increasing',
      confidence: 87,
    },
  };

  useEffect(() => {
    loadAnalytics();
    
    if (autoRefresh) {
      const interval = setInterval(loadAnalytics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [filters, autoRefresh, refreshInterval]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      // In production, this would fetch from the API
      // const response = await fetch('/api/analytics/documents/123', { params: filters });
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, format: 'csv' }),
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.data.downloadUrl, '_blank');
        toast.success('Analytics exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export analytics');
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUpIcon className="w-5 h-5 text-green-600" />;
      case 'decreasing':
        return <TrendingDownIcon className="w-5 h-5 text-red-600" />;
      default:
        return <MinusIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-gray-500">
        <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into your document performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadAnalytics}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Refresh Analytics"
          >
            <RefreshIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={exportAnalytics}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto Refresh</label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Every {refreshInterval}s</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Interval</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <EyeIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">vs last period</span>
            <span className="text-sm font-medium text-green-600">+12.5%</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Viewers</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.uniqueViewers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">vs last period</span>
            <span className="text-sm font-medium text-green-600">+8.3%</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Downloads</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalDownloads.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DownloadIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">Conversion Rate</span>
            <span className="text-sm font-medium text-blue-600">{analytics.conversionRate}%</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Engagement Score</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.engagementScore}%</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <HeartIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">vs last period</span>
            <span className="text-sm font-medium text-green-600">+5.2%</span>
          </div>
        </motion.div>
      </div>

      {/* Real-time and Predictive Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FireIcon className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Real-time Activity</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-900">Current Viewers</span>
              <span className="text-2xl font-bold text-red-900">{analytics.realTime.currentViewers}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-900">Views (Last Hour)</span>
              <span className="text-2xl font-bold text-blue-900">{analytics.realTime.recentViews}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-900">Downloads (Last Hour)</span>
              <span className="text-2xl font-bold text-green-900">{analytics.realTime.recentDownloads}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center space-x-2 mb-4">
            <StarIcon className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">Predictive Insights</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-yellow-900">Predicted Views</span>
              <span className="text-2xl font-bold text-yellow-900">{analytics.predictive.predictedViews.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-purple-900">Predicted Downloads</span>
              <span className="text-2xl font-bold text-purple-900">{analytics.predictive.predictedDownloads.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Trend</span>
              <div className="flex items-center space-x-2">
                {getTrendIcon(analytics.predictive.trend)}
                <span className={`text-sm font-medium ${getTrendColor(analytics.predictive.trend)}`}>
                  {analytics.predictive.trend}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-medium text-indigo-900">Confidence</span>
              <span className="text-2xl font-bold text-indigo-900">{analytics.predictive.confidence}%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Pages and Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Pages</h3>
          
          <div className="space-y-3">
            {analytics.topPages.map((page, index) => (
              <div key={page.pageNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-600">#{page.pageNumber}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{page.views.toLocaleString()} views</p>
                    <p className="text-xs text-gray-500">{page.averageTime}s avg time</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{page.scrollDepth}% scroll</p>
                  <p className="text-xs text-gray-500">{page.interactions} interactions</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
          
          <div className="space-y-3">
            {analytics.trafficSources.map((source, index) => (
              <div key={source.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-gray-900">{source.source}</span>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{source.views.toLocaleString()} views</p>
                  <p className="text-xs text-gray-500">{source.conversionRate}% conversion</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Demographics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Viewer Demographics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <GlobeAltIcon className="w-4 h-4" />
              <span>Countries</span>
            </h4>
            <div className="space-y-2">
              {Object.entries(analytics.viewerDemographics.countries).map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{country}</span>
                  <span className="text-sm font-medium text-gray-900">{count}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <DevicePhoneMobileIcon className="w-4 h-4" />
              <span>Devices</span>
            </h4>
            <div className="space-y-2">
              {Object.entries(analytics.viewerDemographics.devices).map(([device, count]) => (
                <div key={device} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{device}</span>
                  <span className="text-sm font-medium text-gray-900">{count}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <ComputerDesktopIcon className="w-4 h-4" />
              <span>Browsers</span>
            </h4>
            <div className="space-y-2">
              {Object.entries(analytics.viewerDemographics.browsers).map(([browser, count]) => (
                <div key={browser} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{browser}</span>
                  <span className="text-sm font-medium text-gray-900">{count}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <CogIcon className="w-4 h-4" />
              <span>Operating Systems</span>
            </h4>
            <div className="space-y-2">
              {Object.entries(analytics.viewerDemographics.operatingSystems).map(([os, count]) => (
                <div key={os} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{os}</span>
                  <span className="text-sm font-medium text-gray-900">{count}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


