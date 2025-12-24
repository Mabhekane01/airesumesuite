import { useState, useEffect, useCallback } from "react";
import { useFormPersistence } from "../../hooks/useFormPersistence";
import {
  PlusIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { jobApplicationAPI } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";

// Interfaces for filters and sorting
interface FilterOptions {
  status?: string[];
  priority?: string[];
  remote?: boolean;
  location?: string;
}

interface SortOptions {
  field: 'appliedDate' | 'jobTitle' | 'companyName' | 'status' | 'priority';
  direction: 'asc' | 'desc';
}

interface JobApplication {
  _id: string;
  id?: string;
  jobTitle: string;
  companyName: string;
  company?: string;
  location?: string;
  jobLocation?: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
  };
  salary?: string;
  appliedDate?: string;
  applicationDate: string;
  status:
    | "applied"
    | "under_review"
    | "phone_screen"
    | "technical_assessment"
    | "first_interview"
    | "second_interview"
    | "final_interview"
    | "offer_received"
    | "offer_accepted"
    | "rejected"
    | "withdrawn";
  priority: "high" | "medium" | "low";
  jobUrl?: string;
  notes?: string;
  nextAction?: {
    type: string;
    date: string;
    description: string;
  };
  metrics?: {
    applicationScore?: number;
  };
  interviews: Array<{
    id: string;
    type: string;
    date: string;
    interviewer: string;
    status: "scheduled" | "completed" | "cancelled";
  }>;
  communications: Array<{
    id: string;
    type: "email" | "call" | "message";
    date: string;
    subject: string;
    content: string;
  }>;
}

const STATUS_CONFIG: Record<string, any> = {
  applied: {
    label: "Applied",
    color: "text-brand-blue bg-brand-blue/10 border-brand-blue/20",
    icon: ClockIcon,
  },
  under_review: {
    label: "Review",
    color: "text-brand-orange bg-brand-orange/10 border-brand-orange/20",
    icon: EyeIcon,
  },
  phone_screen: {
    label: "Screening",
    color: "text-brand-orange bg-brand-orange/10 border-brand-orange/20",
    icon: ExclamationTriangleIcon,
  },
  first_interview: {
    label: "Interview",
    color: "text-brand-success bg-brand-success/10 border-brand-success/20",
    icon: CalendarIcon,
  },
  offer_received: {
    label: "Offer",
    color: "text-brand-success bg-brand-success/10 border-brand-success/20",
    icon: CheckCircleIcon,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-500 bg-red-50 border-red-100",
    icon: XCircleIcon,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "text-text-tertiary bg-surface-100 border-surface-200",
    icon: XCircleIcon,
  },
};

const KANBAN_COLUMNS = [
  { id: "applied", title: "Applied", statuses: ["applied"] },
  {
    id: "in_progress",
    title: "In Progress",
    statuses: ["under_review", "phone_screen", "technical_assessment", "first_interview", "second_interview", "final_interview"],
  },
  { id: "final", title: "Success / Closed", statuses: ["offer_received", "offer_accepted", "rejected", "withdrawn"] },
];

export default function ApplicationTracker() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'appliedDate',
    direction: 'desc'
  });

  const { data: preferences, updateData: updatePreferences } =
    useFormPersistence(
      {
        viewMode: "kanban" as "list" | "kanban",
      },
      {
        key: "application_tracker_preferences",
        debounceMs: 300,
        clearOnSubmit: false,
      }
    );

  const { viewMode } = preferences;

  const applyFilters = useCallback(() => {
    let filtered = [...applications];

    if (activeFilters.status && activeFilters.status.length > 0) {
      filtered = filtered.filter(app => activeFilters.status!.includes(app.status));
    }

    if (activeFilters.priority && activeFilters.priority.length > 0) {
      filtered = filtered.filter(app => activeFilters.priority!.includes(app.priority));
    }

    if (activeFilters.remote !== undefined) {
      filtered = filtered.filter(app => {
        const isRemote = app.jobLocation?.remote || (app.location || '').toLowerCase().includes('remote');
        return isRemote === activeFilters.remote;
      });
    }

    if (activeFilters.location && activeFilters.location.trim()) {
      const locationQuery = activeFilters.location.toLowerCase();
      filtered = filtered.filter(app => {
        const location = app.location || 
          (app.jobLocation?.city && app.jobLocation?.state 
            ? `${app.jobLocation.city}, ${app.jobLocation.state}` 
            : '');
        return location.toLowerCase().includes(locationQuery);
      });
    }

    filtered.sort((a, b) => {
      const { field, direction } = sortOptions;
      let aValue: any, bValue: any;
      
      switch (field) {
        case 'appliedDate':
          aValue = new Date(a.appliedDate || a.applicationDate || 0).getTime();
          bValue = new Date(b.appliedDate || b.applicationDate || 0).getTime();
          break;
        case 'jobTitle':
          aValue = a.jobTitle.toLowerCase();
          bValue = b.jobTitle.toLowerCase();
          break;
        case 'companyName':
          aValue = (a.companyName || a.company || '').toLowerCase();
          bValue = (b.companyName || b.company || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    setFilteredApplications(filtered);
  }, [applications, activeFilters, sortOptions]);

  const generateStats = useCallback(() => {
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let recentApplications = 0;

    applications.forEach(app => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      priorityCounts[app.priority] = (priorityCounts[app.priority] || 0) + 1;
      
      const appDate = new Date(app.appliedDate || app.applicationDate || 0);
      if (appDate >= thirtyDaysAgo) {
        recentApplications++;
      }
    });

    return {
      totalApplications: applications.length,
      statusCounts,
      priorityCounts,
      recentApplications
    };
  }, [applications]);

  const stats = generateStats();

  useEffect(() => {
    applyFilters();
  }, [applyFilters, sortOptions]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await jobApplicationAPI.getApplications();
      if (response.success && response.data) {
        setApplications(response.data.applications || []);
      } else {
        toast.error("Invalid response from server");
      }
    } catch (error) {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async (id: string) => {
    if (!window.confirm("Delete this application architecture from system?")) {
      return;
    }

    try {
      const response = await jobApplicationAPI.deleteApplication(id);
      if (response.success) {
        setApplications((prev) => prev.filter((app) => app._id !== id));
        toast.success("Deployment data purged.");
      }
    } catch (error) {
      toast.error("Failed to delete application");
    }
  };

  const getApplicationsByColumn = (columnStatuses: string[]) => {
    return filteredApplications.filter((app) =>
      columnStatuses.includes(app.status)
    );
  };

  const renderApplicationCard = (application: JobApplication) => (
    <Link
      key={application._id}
      to={`/dashboard/applications/${application._id}`}
      className="bg-white border border-surface-200 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:border-brand-blue/30 transition-all duration-300 group block relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/[0.02] rounded-full -mr-12 -mt-12 group-hover:bg-brand-blue/[0.05] transition-colors" />
      
      <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-brand-dark tracking-tight leading-tight truncate group-hover:text-brand-blue transition-colors">
            {application.jobTitle}
          </h3>
          <p className="text-[11px] font-black text-text-tertiary uppercase tracking-widest mt-1">
            {application.companyName || application.company}
          </p>
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_CONFIG[application.status]?.color || 'bg-surface-50 text-text-tertiary border-surface-200'}`}>
          {STATUS_CONFIG[application.status]?.label || application.status.replace('_', ' ')}
        </div>
      </div>

      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-4 text-[11px] font-bold text-text-secondary">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPinIcon className="w-3.5 h-3.5 text-brand-blue flex-shrink-0" />
            <span className="truncate">
              {application.location || (application.jobLocation?.remote ? "Remote" : "Global")}
            </span>
          </div>
          {application.salary && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <CurrencyDollarIcon className="w-3.5 h-3.5 text-brand-success" />
              <span>{application.salary}</span>
            </div>
          )}
        </div>

        {application.nextAction && (
          <div className="p-3 bg-brand-orange/[0.03] border border-brand-orange/10 rounded-xl flex items-center gap-3 group/action hover:bg-brand-orange/5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange group-hover/action:scale-110 transition-transform">
              <ClockIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest leading-none mb-1">Pending Sync</p>
              <p className="text-[11px] font-bold text-text-secondary truncate">{application.nextAction.type}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              application.priority === "high" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
              application.priority === "medium" ? "bg-brand-orange" : "bg-brand-success"
            }`} />
            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{application.priority} Priority</span>
          </div>
          
          {application.metrics?.applicationScore && (
            <div className="flex items-center gap-1">
              <SparklesIcon className="w-3 h-3 text-brand-blue" />
              <span className="text-[10px] font-black text-brand-dark">{application.metrics.applicationScore}%</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-10">
        <div className="h-20 bg-white border border-surface-200 rounded-[2rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-white border border-surface-200 rounded-[2.5rem]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-slide-up-soft pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <BriefcaseIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pipeline Explorer</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-black text-brand-dark tracking-tighter">Job Applications.</h1>
          <p className="text-base md:text-lg text-text-secondary font-bold opacity-70">Unified management system for your active deployments.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button 
            onClick={() => updatePreferences({ viewMode: viewMode === "kanban" ? "list" : "kanban" })}
            className="flex-1 sm:flex-none btn-secondary px-4 md:px-6 py-3 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] border-2 shadow-sm"
          >
            {viewMode === "kanban" ? "Switch to List" : "Switch to Kanban"}
          </button>
          <Link
            to="/dashboard/applications/new"
            className="flex-[1.5] sm:flex-none btn-primary px-6 md:px-8 py-3 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-4 h-4 stroke-[3]" />
            New Application
          </Link>
        </div>
      </div>

      {/* Control Console */}
      <div className="bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-4 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-4 md:gap-6 items-stretch lg:items-center">
          <div className="flex-[1.5] relative group">
            <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-brand-blue transition-colors" />
            <input 
              type="text"
              value={activeFilters.location || ''}
              onChange={(e) => setActiveFilters(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Filter by location, company, or role architecture..."
              className="w-full bg-surface-50 border border-surface-200 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-14 pr-6 text-sm font-bold text-brand-dark focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary placeholder:font-bold shadow-inner"
            />
          </div>

          <div className="flex-1 flex gap-3 md:gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl md:rounded-2xl border-2 py-3.5 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                showFilters ? 'bg-brand-dark border-brand-dark text-white shadow-lg' : 'bg-white border-surface-200 text-brand-dark hover:border-brand-blue/30 shadow-sm'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Advanced Filters
            </button>
            <button
              onClick={() => {
                setActiveFilters({});
                toast.success("Filters Reset.");
              }}
              className="px-5 md:px-6 rounded-xl md:rounded-2xl border border-surface-200 text-text-tertiary hover:text-brand-dark hover:bg-surface-50 transition-all shadow-sm"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <AnimatePresence mode="wait">
        {viewMode === "kanban" ? (
          <motion.div 
            key="kanban"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8"
          >
            {KANBAN_COLUMNS.map((column) => {
              const columnApps = getApplicationsByColumn(column.statuses);
              return (
                <div key={column.id} className="space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between px-2 md:px-4">
                    <h3 className="text-xs md:text-sm font-black text-brand-dark uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                      {column.title}
                    </h3>
                    <span className="px-2.5 py-1 bg-surface-100 text-text-tertiary rounded-lg text-[10px] font-black tracking-widest">
                      {columnApps.length}
                    </span>
                  </div>
                  <div className="space-y-3 md:space-y-4 min-h-[400px] p-2 rounded-[1.5rem] md:rounded-[2rem] bg-brand-dark/[0.01] border border-brand-dark/[0.03] shadow-inner">
                    {columnApps.map(renderApplicationCard)}
                    {columnApps.length === 0 && (
                      <div className="h-40 border-2 border-dashed border-surface-200 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                        Null Cluster
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="px-4 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Architecture</th>
                    <th className="px-4 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Status</th>
                    <th className="px-4 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredApplications.map((app) => (
                    <tr key={app._id} className="group hover:bg-surface-50/50 transition-colors">
                      <td className="px-4 md:px-8 py-4 md:py-6">
                        <div>
                          <p className="text-sm md:text-base font-black text-brand-dark tracking-tight leading-none mb-1 group-hover:text-brand-blue transition-colors">{app.jobTitle}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{app.companyName || app.company}</p>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-4 md:py-6">
                        <span className={`px-2 md:px-2.5 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${STATUS_CONFIG[app.status]?.color || 'bg-surface-50 text-text-tertiary border-surface-200'}`}>
                          {STATUS_CONFIG[app.status]?.label || app.status}
                        </span>
                      </td>
                      <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                        <div className="flex justify-end gap-1.5 md:gap-2">
                          <Link to={`/dashboard/applications/${app._id}`} className="p-2 md:p-2.5 bg-surface-50 rounded-lg md:rounded-xl text-text-tertiary hover:text-brand-blue hover:bg-white border border-transparent hover:border-brand-blue/20 transition-all shadow-sm">
                            <EyeIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Link>
                          <button onClick={() => deleteApplication(app._id)} className="p-2 md:p-2.5 bg-surface-50 rounded-lg md:rounded-xl text-text-tertiary hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100 transition-all shadow-sm">
                            <TrashIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}