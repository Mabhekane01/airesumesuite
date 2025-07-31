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
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { jobApplicationAPI } from "../../services/api";
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
  id?: string; // Keep for backward compatibility
  jobTitle: string;
  companyName: string;
  company?: string; // Keep for backward compatibility
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

const STATUS_CONFIG = {
  applied: {
    label: "Applied",
    color: "bg-blue-500/20 text-blue-400 border-blue-400/30",
    icon: ClockIcon,
  },
  screening: {
    label: "Screening",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-400/30",
    icon: ExclamationTriangleIcon,
  },
  interview: {
    label: "Interview",
    color: "bg-purple-500/20 text-purple-400 border-purple-400/30",
    icon: CalendarIcon,
  },
  offer: {
    label: "Offer",
    color: "bg-green-500/20 text-green-400 border-green-400/30",
    icon: CheckCircleIcon,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500/20 text-red-400 border-red-400/30",
    icon: XCircleIcon,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-gray-500/20 text-gray-400 border-gray-400/30",
    icon: XCircleIcon,
  },
};

const KANBAN_COLUMNS = [
  { id: "applied", title: "Applied", statuses: ["applied"] },
  {
    id: "in_progress",
    title: "In Progress",
    statuses: ["screening", "interview"],
  },
  {
    id: "waiting",
    title: "Waiting Response",
    statuses: ["applied", "interview"],
  },
  { id: "final", title: "Final", statuses: ["offer", "rejected", "withdrawn"] },
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

  // Persist user preferences
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

  // Apply filters to applications
  const applyFilters = useCallback(() => {
    let filtered = [...applications];

    // Status filter
    if (activeFilters.status && activeFilters.status.length > 0) {
      filtered = filtered.filter(app => activeFilters.status!.includes(app.status));
    }

    // Priority filter
    if (activeFilters.priority && activeFilters.priority.length > 0) {
      filtered = filtered.filter(app => activeFilters.priority!.includes(app.priority));
    }

    // Remote filter
    if (activeFilters.remote !== undefined) {
      filtered = filtered.filter(app => {
        const isRemote = app.jobLocation?.remote || (app.location || '').toLowerCase().includes('remote');
        return isRemote === activeFilters.remote;
      });
    }

    // Location filter
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

    // Apply sorting
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

  // Generate stats
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

  // Apply filters when applications, filters, or sort options change
  useEffect(() => {
    applyFilters();
  }, [applyFilters, sortOptions]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      console.log("Loading applications...");

      const response = await jobApplicationAPI.getApplications();
      console.log("Applications response:", response);

      if (response.success && response.data) {
        setApplications(response.data.applications || []);
        console.log(
          `Loaded ${response.data.applications?.length || 0} applications`
        );
      } else {
        console.error("Invalid response format:", response);
        toast.error("Invalid response from server");
      }
    } catch (error) {
      console.error("Failed to load applications:", error);

      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          toast.error("Please log in again to view applications");
        } else if (error.message.includes("Network Error")) {
          toast.error(
            "Cannot connect to server. Please check if the backend is running."
          );
        } else {
          toast.error(`Failed to load applications: ${error.message}`);
        }
      } else {
        toast.error("Failed to load applications");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this application?")) {
      return;
    }

    try {
      const response = await jobApplicationAPI.deleteApplication(id);
      if (response.success) {
        setApplications((prev) => prev.filter((app) => app._id !== id));
        toast.success("Application deleted");
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
      className="card-dark rounded-lg border border-dark-border p-3 sm:p-4 hover:shadow-lg transition-shadow cursor-pointer block"
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-xs sm:text-sm font-semibold text-dark-text-primary truncate">
            {application.jobTitle}
          </h3>
          <p className="text-xs sm:text-sm text-dark-text-secondary truncate">
            {application.companyName || application.company}
          </p>
        </div>
        <div className="flex items-start flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-1">
          <span
            className={`
            inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium border
            ${STATUS_CONFIG[application.status]?.color}
          `}
          >
            {STATUS_CONFIG[application.status]?.label}
          </span>
          <div className="relative hidden sm:block">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle dropdown menu
              }}
              className="p-1 text-dark-text-muted hover:text-dark-text-primary"
            >
              <EllipsisVerticalIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1 sm:space-y-2 text-xs text-dark-text-muted">
        <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            <MapPinIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {application.location ||
                (application.jobLocation?.city && application.jobLocation?.state
                  ? `${application.jobLocation.city}, ${application.jobLocation.state}`
                  : application.jobLocation?.remote
                    ? "Remote"
                    : "Location not specified")}
            </span>
          </div>
          {application.salary && (
            <div className="flex items-center space-x-1">
              <CurrencyDollarIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{application.salary}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <CalendarIcon className="w-3 h-3 flex-shrink-0" />
          <span>
            Applied{" "}
            {new Date(
              application.applicationDate || application.appliedDate
            ).toLocaleDateString()}
          </span>
        </div>
      </div>

      {application.nextAction && (
        <div className="mt-2 sm:mt-3 p-2 bg-yellow-500/10 rounded border border-yellow-400/30">
          <div className="flex items-center space-x-1">
            <ClockIcon className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            <span className="text-xs font-medium text-yellow-400 truncate">
              {application.nextAction.type}
            </span>
            <span className="text-xs text-yellow-400/80 hidden sm:inline">
              - {new Date(application.nextAction.date).toLocaleDateString()}
            </span>
          </div>
          <div className="text-xs text-yellow-400/80 sm:hidden mt-1">
            {new Date(application.nextAction.date).toLocaleDateString()}
          </div>
        </div>
      )}

      <div className="mt-2 sm:mt-3 flex items-center justify-between">
        <div
          className={`
          w-2 h-2 rounded-full flex-shrink-0
          ${
            application.priority === "high"
              ? "bg-red-500"
              : application.priority === "medium"
                ? "bg-yellow-500"
                : "bg-green-500"
          }
        `}
        />
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
          {application.interviews.length > 0 && (
            <span className="text-xs text-purple-400 font-medium truncate">
              {application.interviews.length} interview
              {application.interviews.length > 1 ? "s" : ""}
            </span>
          )}
          {application.jobUrl && (
            <ArrowTopRightOnSquareIcon className="w-3 h-3 text-dark-text-muted flex-shrink-0" />
          )}
        </div>
      </div>
    </Link>
  );

  const renderKanbanView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {KANBAN_COLUMNS.map((column) => {
        const columnApplications = getApplicationsByColumn(column.statuses);
        return (
          <div
            key={column.id}
            className="bg-dark-secondary/20 rounded-lg p-3 sm:p-4 border border-dark-border min-h-[200px]"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-dark-text-primary truncate pr-2">
                {column.title}
              </h3>
              <span className="bg-dark-accent/20 text-dark-accent text-xs font-medium px-2 py-1 rounded-full border border-dark-accent/30 flex-shrink-0">
                {columnApplications.length}
              </span>
            </div>
            <div className="space-y-2 sm:space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
              {columnApplications.map(renderApplicationCard)}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="card-dark rounded-lg border border-dark-border overflow-hidden">
      {/* Mobile-first responsive table */}
      <div className="hidden lg:block">
        <table className="min-w-full divide-y divide-dark-border">
          <thead className="bg-dark-secondary/20">
            <tr>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">
                Position
              </th>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">
                Applied
              </th>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">
                Next Action
              </th>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">
                AI Match
              </th>
              <th className="relative px-4 xl:px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-dark-tertiary divide-y divide-dark-border">
            {filteredApplications.map((application) => (
              <tr key={application._id} className="hover:bg-dark-secondary/20">
                <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-dark-text-primary">
                      {application.jobTitle}
                    </div>
                    <div className="text-sm text-dark-text-muted">
                      {application.location ||
                        (application.jobLocation?.city &&
                        application.jobLocation?.state
                          ? `${application.jobLocation.city}, ${application.jobLocation.state}`
                          : application.jobLocation?.remote
                            ? "Remote"
                            : "Location not specified")}
                    </div>
                  </div>
                </td>
                <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="w-4 h-4 text-dark-text-muted mr-2" />
                    <div className="text-sm text-dark-text-primary">
                      {application.companyName || application.company}
                    </div>
                  </div>
                </td>
                <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                    ${STATUS_CONFIG[application.status]?.color}
                  `}
                  >
                    {STATUS_CONFIG[application.status]?.label}
                  </span>
                </td>
                <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-dark-text-muted">
                  {new Date(
                    application.applicationDate || application.appliedDate
                  ).toLocaleDateString()}
                </td>
                <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-dark-text-muted">
                  {application.nextAction ? (
                    <div>
                      <div className="text-sm text-dark-text-primary">
                        {application.nextAction.type}
                      </div>
                      <div className="text-xs text-dark-text-muted">
                        {new Date(
                          application.nextAction.date
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                  {application.metrics?.applicationScore &&
                  application.metrics.applicationScore > 0 ? (
                    <div className="flex items-center space-x-1">
                      <div
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          application.metrics.applicationScore >= 80
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : application.metrics.applicationScore >= 60
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : application.metrics.applicationScore >= 40
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {application.metrics.applicationScore}%
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            console.log(
                              `🔄 Recalculating match score for application ${application._id}`
                            );
                            toast.loading("🤖 Recalculating AI match score...", {
                              id: `match-recalc-${application._id}`,
                            });

                            const result =
                              await jobApplicationAPI.calculateMatchScore(
                                application._id
                              );

                            if (
                              result.success &&
                              result.data?.matchAnalysis?.matchScore
                            ) {
                              const score = result.data.matchAnalysis.matchScore;
                              toast.success(`✅ Updated score: ${score}%`, {
                                id: `match-recalc-${application._id}`,
                              });

                              setApplications((prevApps) =>
                                prevApps.map((app) =>
                                  app._id === application._id
                                    ? {
                                        ...app,
                                        metrics: {
                                          ...app.metrics,
                                          applicationScore: score,
                                        },
                                      }
                                    : app
                                )
                              );
                            } else {
                              toast.error("Failed to recalculate score", {
                                id: `match-recalc-${application._id}`,
                              });
                            }
                          } catch (error) {
                            const errorMessage =
                              error instanceof Error
                                ? error.message
                                : "Unknown error occurred";
                            toast.error(`Recalculation failed: ${errorMessage}`, {
                              id: `match-recalc-${application._id}`,
                            });
                          }
                        }}
                        className="inline-flex items-center p-1 text-xs text-dark-text-muted hover:text-blue-400 transition-colors"
                        title="Recalculate score"
                      >
                        <ArrowPathIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          toast.loading("🤖 Analyzing job match with AI...", {
                            id: `match-calc-${application._id}`,
                          });

                          const result =
                            await jobApplicationAPI.calculateMatchScore(
                              application._id
                            );

                          if (
                            result.success &&
                            result.data?.matchAnalysis?.matchScore
                          ) {
                            const score = result.data.matchAnalysis.matchScore;
                            toast.success(
                              `✅ AI analysis complete: ${score}%`,
                              { id: `match-calc-${application._id}` }
                            );

                            setApplications((prevApps) =>
                              prevApps.map((app) =>
                                app._id === application._id
                                  ? {
                                      ...app,
                                      metrics: {
                                        ...app.metrics,
                                        applicationScore: score,
                                      },
                                    }
                                  : app
                              )
                            );
                          } else {
                            toast.error("Invalid response from AI service", {
                              id: `match-calc-${application._id}`,
                            });
                          }
                        } catch (error) {
                          const errorMessage =
                            error instanceof Error
                              ? error.message
                              : "Unknown error occurred";
                          toast.error(`AI analysis failed: ${errorMessage}`, {
                            id: `match-calc-${application._id}`,
                          });
                        }
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded border border-blue-500/30 transition-colors"
                    >
                      <SparklesIcon className="w-3 h-3 mr-1" />
                      Calculate
                    </button>
                  )}
                </td>
                <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/dashboard/applications/${application._id}`}
                      className="text-dark-accent hover:text-dark-accent/80"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/dashboard/applications/${application._id}/edit`}
                      className="text-dark-text-secondary hover:text-dark-text-primary"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => deleteApplication(application._id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout for screens smaller than lg */}
      <div className="block lg:hidden space-y-3">
        {filteredApplications.map((application) => (
          <div
            key={application._id}
            className="bg-dark-tertiary/50 rounded-lg border border-dark-border p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/dashboard/applications/${application._id}`}
                  className="block"
                >
                  <h3 className="text-sm font-semibold text-dark-text-primary truncate hover:text-accent-primary transition-colors">
                    {application.jobTitle}
                  </h3>
                  <p className="text-sm text-dark-text-secondary truncate">
                    {application.companyName || application.company}
                  </p>
                </Link>
              </div>
              <span
                className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ml-2
                ${STATUS_CONFIG[application.status]?.color}
              `}
              >
                {STATUS_CONFIG[application.status]?.label}
              </span>
            </div>

            <div className="space-y-2 text-xs text-dark-text-muted mb-3">
              <div className="flex items-center space-x-1">
                <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {application.location ||
                    (application.jobLocation?.city && application.jobLocation?.state
                      ? `${application.jobLocation.city}, ${application.jobLocation.state}`
                      : application.jobLocation?.remote
                        ? "Remote"
                        : "Location not specified")}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                <span>
                  Applied {new Date(application.applicationDate || application.appliedDate).toLocaleDateString()}
                </span>
              </div>
              {application.nextAction && (
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-3 h-3 flex-shrink-0 text-yellow-400" />
                  <span className="text-yellow-400">
                    {application.nextAction.type} - {new Date(application.nextAction.date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {application.metrics?.applicationScore && application.metrics.applicationScore > 0 ? (
                  <div
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      application.metrics.applicationScore >= 80
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : application.metrics.applicationScore >= 60
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : application.metrics.applicationScore >= 40
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}
                  >
                    AI: {application.metrics.applicationScore}%
                  </div>
                ) : (
                  <span className="text-xs text-dark-text-muted">No AI analysis</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  to={`/dashboard/applications/${application._id}`}
                  className="text-dark-accent hover:text-dark-accent/80"
                >
                  <EyeIcon className="w-4 h-4" />
                </Link>
                <Link
                  to={`/dashboard/applications/${application._id}/edit`}
                  className="text-dark-text-secondary hover:text-dark-text-primary"
                >
                  <PencilIcon className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => deleteApplication(application._id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-dark-secondary/20 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-dark-secondary/20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up-soft">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text-dark">
            Job Applications
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary mt-1">
            Track and manage your job applications in one place
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            onClick={async () => {
              try {
                console.log("🔄 Resetting all match scores...");
                toast.loading(
                  "Resetting match scores for fresh AI analysis...",
                  { id: "reset-scores" }
                );

                const result = await jobApplicationAPI.resetMatchScores();
                if (result.success) {
                  toast.success(
                    `Reset complete! ${result.data?.reset?.updated || 0} scores reset`,
                    { id: "reset-scores" }
                  );
                  console.log("✅ Reset result:", result.data);

                  // Refresh the applications list
                  loadApplications();
                } else {
                  toast.error("Failed to reset match scores", {
                    id: "reset-scores",
                  });
                }
              } catch (error) {
                console.error("❌ Reset error:", error);
                toast.error("Failed to reset match scores", {
                  id: "reset-scores",
                });
              }
            }}
            className="btn-secondary-dark flex items-center justify-center px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap hover:bg-dark-secondary/40 transition-all"
          >
            <ArrowPathIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Reset Scores</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <button
            onClick={async () => {
              try {
                console.log("🔧 Fixing missing match scores...");
                toast.loading("🤖 Calculating missing AI match scores...", {
                  id: "fix-scores",
                });

                const result =
                  await jobApplicationAPI.batchCalculateMatchScores(10);

                if (result.success && result.data) {
                  const { processed, updated, errors } = result.data;

                  if (updated > 0) {
                    toast.success(
                      `✅ Fixed ${updated} missing scores! (${processed} processed, ${errors} errors)`,
                      { id: "fix-scores" }
                    );
                    // Refresh the applications to show updated scores
                    loadApplications();
                  } else {
                    toast.success(
                      `✅ All scores are up to date! (${processed} checked)`,
                      { id: "fix-scores" }
                    );
                  }
                } else {
                  toast.error("Failed to fix missing scores", {
                    id: "fix-scores",
                  });
                }
              } catch (error) {
                console.error("❌ Fix scores error:", error);
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : "Unknown error occurred";
                toast.error(`Failed to fix scores: ${errorMessage}`, {
                  id: "fix-scores",
                });
              }
            }}
            className="btn-secondary-dark flex items-center justify-center px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap hover:bg-dark-secondary/40 transition-all"
          >
            <SparklesIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden md:inline">Fix Missing Scores</span>
            <span className="md:hidden">Fix Scores</span>
          </button>
          <Link
            to="/dashboard/applications/new"
            className="btn-primary-dark flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap hover:bg-dark-accent/90 transition-all transform hover:scale-[1.02]"
          >
            <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Add Application</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-text-primary">Filter Applications</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-md transition-all duration-200 ${showFilters ? 'bg-accent-primary/20 text-accent-primary' : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-tertiary/60'}`}
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-dark-tertiary/60 rounded-lg p-3">
            <p className="text-xs text-dark-text-secondary">Total Applications</p>
            <p className="text-lg font-semibold text-dark-text-primary">{stats.totalApplications}</p>
          </div>
          <div className="bg-dark-tertiary/60 rounded-lg p-3">
            <p className="text-xs text-dark-text-secondary">Recent (30 days)</p>
            <p className="text-lg font-semibold text-accent-primary">{stats.recentApplications}</p>
          </div>
          <div className="bg-dark-tertiary/60 rounded-lg p-3">
            <p className="text-xs text-dark-text-secondary">Active Processes</p>
            <p className="text-lg font-semibold text-yellow-400">
              {(stats.statusCounts.under_review || 0) + (stats.statusCounts.phone_screen || 0) + 
               (stats.statusCounts.first_interview || 0) + (stats.statusCounts.second_interview || 0)}
            </p>
          </div>
          <div className="bg-dark-tertiary/60 rounded-lg p-3">
            <p className="text-xs text-dark-text-secondary">Offers</p>
            <p className="text-lg font-semibold text-green-400">
              {(stats.statusCounts.offer_received || 0) + (stats.statusCounts.offer_accepted || 0)}
            </p>
          </div>
        </div>
        
        {showFilters && (
          <div className="bg-dark-tertiary/40 backdrop-blur-sm rounded-lg border border-dark-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text-primary">Filters & Sorting</h3>
              <button
                onClick={() => {
                  setActiveFilters({});
                  setSortOptions({ field: 'appliedDate', direction: 'desc' });
                }}
                className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
              >
                Clear All
              </button>
            </div>
            
            {/* Status Filter */}
            <div>
              <h4 className="text-sm font-medium text-dark-text-primary mb-3">Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { value: 'applied', label: 'Applied', color: 'bg-blue-500' },
                  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-500' },
                  { value: 'phone_screen', label: 'Phone Screen', color: 'bg-purple-500' },
                  { value: 'technical_assessment', label: 'Technical Assessment', color: 'bg-orange-500' },
                  { value: 'first_interview', label: 'First Interview', color: 'bg-indigo-500' },
                  { value: 'second_interview', label: 'Second Interview', color: 'bg-pink-500' },
                  { value: 'final_interview', label: 'Final Interview', color: 'bg-cyan-500' },
                  { value: 'offer_received', label: 'Offer Received', color: 'bg-green-500' },
                  { value: 'offer_accepted', label: 'Offer Accepted', color: 'bg-emerald-500' },
                  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
                  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-500' }
                ].map(status => (
                  <label
                    key={status.value}
                    className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all ${
                      activeFilters.status?.includes(status.value)
                        ? 'bg-accent-primary/20 border border-accent-primary/30'
                        : 'bg-dark-secondary/60 hover:bg-dark-secondary/80 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={activeFilters.status?.includes(status.value) || false}
                      onChange={() => {
                        const currentStatuses = activeFilters.status || [];
                        const newStatuses = currentStatuses.includes(status.value)
                          ? currentStatuses.filter(s => s !== status.value)
                          : [...currentStatuses, status.value];
                        setActiveFilters(prev => ({
                          ...prev,
                          status: newStatuses.length > 0 ? newStatuses : undefined
                        }));
                      }}
                      className="hidden"
                    />
                    <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                    <span className="text-sm text-dark-text-primary">{status.label}</span>
                    {activeFilters.status?.includes(status.value) && (
                      <CheckIcon className="h-4 w-4 text-accent-primary ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Priority Filter */}
            <div>
              <h4 className="text-sm font-medium text-dark-text-primary mb-3">Priority</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'high', label: 'High Priority', color: 'bg-red-500' },
                  { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-500' },
                  { value: 'low', label: 'Low Priority', color: 'bg-green-500' }
                ].map(priority => (
                  <label
                    key={priority.value}
                    className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all ${
                      activeFilters.priority?.includes(priority.value)
                        ? 'bg-accent-primary/20 border border-accent-primary/30'
                        : 'bg-dark-secondary/60 hover:bg-dark-secondary/80 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={activeFilters.priority?.includes(priority.value) || false}
                      onChange={() => {
                        const currentPriorities = activeFilters.priority || [];
                        const newPriorities = currentPriorities.includes(priority.value)
                          ? currentPriorities.filter(p => p !== priority.value)
                          : [...currentPriorities, priority.value];
                        setActiveFilters(prev => ({
                          ...prev,
                          priority: newPriorities.length > 0 ? newPriorities : undefined
                        }));
                      }}
                      className="hidden"
                    />
                    <div className={`w-3 h-3 rounded-full ${priority.color}`}></div>
                    <span className="text-sm text-dark-text-primary">{priority.label}</span>
                    {activeFilters.priority?.includes(priority.value) && (
                      <CheckIcon className="h-4 w-4 text-accent-primary ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Sorting */}
            <div>
              <h4 className="text-sm font-medium text-dark-text-primary mb-3">Sort By</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-text-secondary mb-2">Sort Field</label>
                  <select
                    value={sortOptions.field}
                    onChange={(e) => setSortOptions(prev => ({ ...prev, field: e.target.value as SortOptions['field'] }))}
                    className="input-field-dark w-full text-sm"
                  >
                    <option value="appliedDate">Application Date</option>
                    <option value="jobTitle">Job Title</option>
                    <option value="companyName">Company Name</option>
                    <option value="status">Status</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-dark-text-secondary mb-2">Direction</label>
                  <select
                    value={sortOptions.direction}
                    onChange={(e) => setSortOptions(prev => ({ ...prev, direction: e.target.value as 'asc' | 'desc' }))}
                    className="input-field-dark w-full text-sm"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-dark-text-secondary mb-2">Location</label>
                <input
                  type="text"
                  value={activeFilters.location || ''}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, location: e.target.value || undefined }))}
                  placeholder="City, State, or Remote"
                  className="input-field-dark w-full text-sm"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2 cursor-pointer mt-6">
                  <input
                    type="checkbox"
                    checked={activeFilters.remote || false}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, remote: e.target.checked ? true : undefined }))}
                    className="rounded border-dark-border bg-dark-secondary text-accent-primary focus:ring-accent-primary focus:ring-offset-dark-secondary"
                  />
                  <span className="text-sm text-dark-text-primary">Remote positions only</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-1 bg-dark-secondary/20 rounded-lg p-1 border border-dark-border">
          <button
            onClick={() => updatePreferences({ viewMode: "kanban" })}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-all duration-200 ${
              viewMode === "kanban"
                ? "bg-dark-accent text-white shadow-sm transform scale-[0.98]"
                : "text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-secondary/30"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => updatePreferences({ viewMode: "list" })}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-all duration-200 ${
              viewMode === "list"
                ? "bg-dark-accent text-white shadow-sm transform scale-[0.98]"
                : "text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-secondary/30"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = applications.filter(
            (app) => app.status === status
          ).length;
          return (
            <div
              key={status}
              className="card-dark rounded-lg border border-dark-border p-3 sm:p-4 hover:border-dark-accent/30 transition-all duration-200"
            >
              <div className="flex items-center">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg ${config.color.replace("text-", "bg-").replace("border-", "bg-")} transition-transform hover:scale-110`}
                >
                  <config.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-dark-text-secondary truncate">
                    {config.label}
                  </p>
                  <p className="text-lg sm:text-xl font-semibold text-dark-text-primary">
                    {count}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Debug Info */}
      {import.meta.env.DEV && (
        <div className="bg-dark-secondary/20 p-3 rounded text-xs text-dark-text-secondary space-y-1">
          <div><strong>Debug:</strong> Total Apps: {applications.length} | Filtered: {filteredApplications.length} | Loading: {loading ? 'Yes' : 'No'}</div>
          <div><strong>Active Filters:</strong> {Object.keys(activeFilters).length > 0 ? JSON.stringify(activeFilters) : 'None'}</div>
          <div><strong>Sort:</strong> {sortOptions.field} ({sortOptions.direction})</div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-dark-secondary/20 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-dark-secondary/20 rounded-lg"></div>
            ))}
          </div>
        </div>
      ) : filteredApplications.length === 0 && applications.length > 0 ? (
        <div className="text-center py-12">
          <p className="text-dark-text-secondary mb-4">No applications match your filter criteria.</p>
          <button 
            onClick={() => {
              setActiveFilters({});
              setSortOptions({ field: 'appliedDate', direction: 'desc' });
            }}
            className="btn-secondary-dark px-4 py-2 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-dark-text-secondary">No job applications found. Create your first application to get started!</p>
          <Link 
            to="/dashboard/applications/new"
            className="btn-primary-dark inline-block mt-4 px-6 py-2 rounded-lg"
          >
            Add Application
          </Link>
        </div>
      ) : (
        viewMode === "kanban" ? renderKanbanView() : renderListView()
      )}
    </div>
  );
}
