import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UsersIcon, 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface SubscriptionAnalytics {
  totalUsers: number;
  enterpriseUsers: number;
  activeSubscriptions: number;
  expiredThisMonth: number;
  renewedThisMonth: number;
  conversionRate: string;
  upcomingRenewals: number;
  recentCancellations: number;
  pastDueSubscriptions: number;
  trialUsers: number;
  planTypeBreakdown: {
    monthly: number;
    yearly: number;
  };
}

interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  projectedMRR: number;
  newSubscriptions: number;
  averageRevenuePerUser: number;
}

interface Subscription {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  tier: string;
  subscription_status: string;
  subscription_plan_type?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  cancel_at_period_end?: boolean;
}

const SubscriptionDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [revenuePeriod, setRevenuePeriod] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
    fetchRevenueAnalytics();
    fetchSubscriptions();
  }, [currentPage, filterStatus, filterTier, searchTerm, revenuePeriod]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/subscriptions/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchRevenueAnalytics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/subscriptions/revenue-analytics?period=${revenuePeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRevenueData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterTier !== 'all' && { tier: filterTier }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/v1/subscriptions/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.data.subscriptions);
        setTotalPages(data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = async (userId: string, planType: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/subscriptions/renew', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, planType })
      });
      
      if (response.ok) {
        fetchSubscriptions();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Failed to renew subscription:', error);
    }
  };

  const handleCancelSubscription = async (userId: string, immediate = false) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, immediate })
      });
      
      if (response.ok) {
        fetchSubscriptions();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Subscription Management</h1>
        <p className="text-gray-300">Enterprise-grade subscription analytics and management</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {analytics && (
          <>
            {/* Total Users */}
            <div className="bg-white/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-teal-500/20 p-3 rounded-xl">
                  <UsersIcon className="w-6 h-6 text-teal-400" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{analytics.totalUsers.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">Total Users</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm">↗ {analytics.conversionRate}%</span>
                <span className="text-gray-400 text-sm">conversion rate</span>
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-white/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-500/20 p-3 rounded-xl">
                  <CheckCircleIcon className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{analytics.activeSubscriptions.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">Active Subscriptions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm">+{analytics.renewedThisMonth}</span>
                <span className="text-gray-400 text-sm">this month</span>
              </div>
            </div>

            {/* Upcoming Renewals */}
            <div className="bg-white/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-500/20 p-3 rounded-xl">
                  <ClockIcon className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{analytics.upcomingRenewals.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">Upcoming Renewals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm">Next 7 days</span>
              </div>
            </div>

            {/* Past Due */}
            <div className="bg-white/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-red-500/20 p-3 rounded-xl">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{analytics.pastDueSubscriptions.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">Past Due</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-sm">Requires attention</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Revenue Analytics */}
      <div className="mb-8">
        <div className="bg-white/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Revenue Analytics</h2>
            <select
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value)}
              className="bg-white/40 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          
          {revenueData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-400 mb-2">
                  {formatCurrency(revenueData.totalRevenue)}
                </p>
                <p className="text-gray-400">Total Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-400 mb-2">
                  {formatCurrency(revenueData.projectedMRR)}
                </p>
                <p className="text-gray-400">Projected MRR</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-teal-400 mb-2">
                  {formatCurrency(revenueData.averageRevenuePerUser)}
                </p>
                <p className="text-gray-400">Avg Revenue/User</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plan Type Breakdown */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Plan Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Monthly Plans</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 transition-all duration-500"
                      style={{ 
                        width: `${(analytics.planTypeBreakdown.monthly / (analytics.planTypeBreakdown.monthly + analytics.planTypeBreakdown.yearly)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-white font-semibold">{analytics.planTypeBreakdown.monthly}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Yearly Plans</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ 
                        width: `${(analytics.planTypeBreakdown.yearly / (analytics.planTypeBreakdown.monthly + analytics.planTypeBreakdown.yearly)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-white font-semibold">{analytics.planTypeBreakdown.yearly}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Trial Users</span>
                <span className="text-white font-semibold">{analytics.trialUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Recent Cancellations</span>
                <span className="text-red-400 font-semibold">{analytics.recentCancellations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Expired This Month</span>
                <span className="text-yellow-400 font-semibold">{analytics.expiredThisMonth}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Table */}
      <div className="bg-white/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-white">Subscription Management</h2>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/40 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white/40 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
              <option value="past_due">Past Due</option>
            </select>
            
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-4 py-2 bg-white/40 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">User</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Tier</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Plan</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">End Date</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-white font-medium">
                        {subscription.firstName} {subscription.lastName}
                      </p>
                      <p className="text-gray-400 text-sm">{subscription.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      subscription.tier === 'enterprise' 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {subscription.tier}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      subscription.subscription_status === 'active' 
                        ? 'bg-green-500/20 text-green-300'
                        : subscription.subscription_status === 'cancelled'
                        ? 'bg-red-500/20 text-red-300'
                        : subscription.subscription_status === 'past_due'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {subscription.subscription_status || 'inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-300">
                    {subscription.subscription_plan_type || 'N/A'}
                  </td>
                  <td className="py-4 px-4 text-gray-300">
                    {subscription.subscription_end_date ? formatDate(subscription.subscription_end_date) : 'N/A'}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      {subscription.tier === 'enterprise' && subscription.subscription_status === 'active' && (
                        <button
                          onClick={() => handleCancelSubscription(subscription._id)}
                          className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      {(subscription.subscription_status === 'expired' || subscription.subscription_status === 'cancelled') && (
                        <button
                          onClick={() => handleRenewSubscription(subscription._id, 'monthly')}
                          className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-xs hover:bg-green-500/30 transition-colors"
                        >
                          Renew
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/40 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
