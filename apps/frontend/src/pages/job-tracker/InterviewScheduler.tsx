import { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  VideoCameraIcon,
  PhoneIcon,
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { jobApplicationAPI } from '../../services/api';

interface Interview {
  id: string;
  applicationId: string;
  jobTitle: string;
  companyName: string;
  type: 'phone' | 'video' | 'on_site' | 'technical' | 'behavioral' | 'case_study' | 'presentation' | 'panel';
  round: number;
  scheduledDate: string;
  duration: number;
  timezone?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  
  interviewers: {
    name: string;
    title: string;
    email?: string;
    linkedinUrl?: string;
    department?: string;
  }[];
  
  location?: string;
  meetingLink?: string;
  meetingId?: string;
  dialInInfo?: string;
  
  preparationNotes?: string;
  questionsToAsk?: string[];
  
  feedback?: string;
  rating?: number;
  technicalPerformance?: number;
  culturalFit?: number;
  communicationSkills?: number;
  
  thankYouSent?: boolean;
  followUpNotes?: string;
  nextSteps?: string;
}

interface JobApplication {
  _id: string;
  jobTitle: string;
  companyName: string;
  status: string;
}

const INTERVIEW_TYPES = [
  { value: 'phone', label: 'Phone Screen', icon: PhoneIcon },
  { value: 'video', label: 'Video Call', icon: VideoCameraIcon },
  { value: 'on_site', label: 'On-site', icon: MapPinIcon },
  { value: 'technical', label: 'Technical', icon: ClockIcon },
  { value: 'behavioral', label: 'Behavioral', icon: UserGroupIcon },
  { value: 'case_study', label: 'Case Study', icon: ClockIcon },
  { value: 'presentation', label: 'Presentation', icon: ClockIcon },
  { value: 'panel', label: 'Panel', icon: UserGroupIcon },
];

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400 border-blue-400/30' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-400/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-400/30' },
  rescheduled: { label: 'Rescheduled', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30' },
  no_show: { label: 'No Show', color: 'bg-gray-500/20 text-gray-400 border-gray-400/30' },
};

export default function InterviewScheduler() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [interviewsResponse, applicationsResponse] = await Promise.all([
        jobApplicationAPI.getUpcomingInterviews({ days: 30 }),
        jobApplicationAPI.getApplications()
      ]);

      if (interviewsResponse.success) {
        setInterviews(interviewsResponse.data.upcomingInterviews || []);
      }

      if (applicationsResponse.success) {
        setApplications(applicationsResponse.data.applications || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const createInterview = async (interviewData: Partial<Interview>) => {
    try {
      const response = await jobApplicationAPI.addInterview(
        interviewData.applicationId!,
        interviewData
      );
      
      if (response.success) {
        toast.success('Interview scheduled successfully');
        setShowCreateModal(false);
        loadData();
      }
    } catch (error) {
      toast.error('Failed to schedule interview');
    }
  };

  const updateInterviewStatus = async (interviewId: string, status: string) => {
    try {
      const interview = interviews.find(i => i.id === interviewId);
      if (!interview) return;

      const response = await jobApplicationAPI.updateInterview(
        interview.applicationId,
        interviewId,
        { status }
      );
      
      if (response.success) {
        toast.success('Interview status updated');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to update interview status');
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    if (filterStatus === 'all') return true;
    return interview.status === filterStatus;
  });

  const upcomingInterviews = interviews.filter(interview => 
    interview.status === 'scheduled' && new Date(interview.scheduledDate) >= new Date()
  );

  const todayInterviews = upcomingInterviews.filter(interview =>
    new Date(interview.scheduledDate).toDateString() === new Date().toDateString()
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-dark-secondary/20 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-dark-secondary/20 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-dark-secondary/20 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up-soft">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex-1">
          <h1 className="text-xl xs:text-2xl font-bold gradient-text-dark">Interview Scheduler</h1>
          <p className="text-dark-text-secondary text-sm xs:text-base">
            Manage and track your upcoming interviews
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary-dark flex items-center justify-center px-4 py-2 rounded-lg w-full sm:w-auto"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          <span className="hidden xs:inline">Schedule Interview</span>
          <span className="xs:hidden">Schedule</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
        <div className="card-dark rounded-lg border border-dark-border p-3 xs:p-4">
          <div className="flex items-center">
            <CalendarIcon className="w-6 h-6 xs:w-8 xs:h-8 text-blue-400 flex-shrink-0" />
            <div className="ml-2 xs:ml-3 min-w-0">
              <p className="text-xs xs:text-sm font-medium text-dark-text-secondary truncate">Today's Interviews</p>
              <p className="text-base xs:text-lg font-semibold text-dark-text-primary">{todayInterviews.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card-dark rounded-lg border border-dark-border p-3 xs:p-4">
          <div className="flex items-center">
            <ClockIcon className="w-6 h-6 xs:w-8 xs:h-8 text-yellow-400 flex-shrink-0" />
            <div className="ml-2 xs:ml-3 min-w-0">
              <p className="text-xs xs:text-sm font-medium text-dark-text-secondary truncate">This Week</p>
              <p className="text-base xs:text-lg font-semibold text-dark-text-primary">
                {upcomingInterviews.filter(i => {
                  const interviewDate = new Date(i.scheduledDate);
                  const weekFromNow = new Date();
                  weekFromNow.setDate(weekFromNow.getDate() + 7);
                  return interviewDate <= weekFromNow;
                }).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card-dark rounded-lg border border-dark-border p-3 xs:p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-6 h-6 xs:w-8 xs:h-8 text-green-400 flex-shrink-0" />
            <div className="ml-2 xs:ml-3 min-w-0">
              <p className="text-xs xs:text-sm font-medium text-dark-text-secondary truncate">Completed</p>
              <p className="text-base xs:text-lg font-semibold text-dark-text-primary">
                {interviews.filter(i => i.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card-dark rounded-lg border border-dark-border p-3 xs:p-4">
          <div className="flex items-center">
            <UserGroupIcon className="w-6 h-6 xs:w-8 xs:h-8 text-purple-400 flex-shrink-0" />
            <div className="ml-2 xs:ml-3 min-w-0">
              <p className="text-xs xs:text-sm font-medium text-dark-text-secondary truncate">Total</p>
              <p className="text-base xs:text-lg font-semibold text-dark-text-primary">{interviews.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between space-y-3 xs:space-y-0">
        <div className="flex items-center space-x-3 xs:space-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field-dark px-3 py-2 rounded-lg text-sm xs:text-base flex-1 xs:flex-none"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1 bg-dark-secondary/20 rounded-lg p-1 border border-dark-border w-full xs:w-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 xs:flex-none px-3 py-1 text-sm font-medium rounded transition-colors ${
              viewMode === 'list' ? 'bg-dark-accent text-white shadow-sm' : 'text-dark-text-secondary'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 xs:flex-none px-3 py-1 text-sm font-medium rounded transition-colors ${
              viewMode === 'calendar' ? 'bg-dark-accent text-white shadow-sm' : 'text-dark-text-secondary'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Interview List */}
      <div className="space-y-3 xs:space-y-4">
        {filteredInterviews.length === 0 ? (
          <div className="card-dark rounded-lg border border-dark-border p-6 xs:p-8 text-center">
            <CalendarIcon className="w-10 h-10 xs:w-12 xs:h-12 text-dark-text-muted mx-auto mb-3 xs:mb-4" />
            <h3 className="text-base xs:text-lg font-medium text-dark-text-primary mb-2">No interviews scheduled</h3>
            <p className="text-dark-text-secondary mb-3 xs:mb-4 text-sm xs:text-base">
              Schedule your first interview to start tracking your progress.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary-dark"
            >
              Schedule Interview
            </button>
          </div>
        ) : (
          filteredInterviews.map((interview) => {
            const interviewType = INTERVIEW_TYPES.find(t => t.value === interview.type);
            const statusConfig = STATUS_CONFIG[interview.status];
            const isUpcoming = new Date(interview.scheduledDate) >= new Date();
            const isToday = new Date(interview.scheduledDate).toDateString() === new Date().toDateString();

            return (
              <div
                key={interview.id}
                className={`card-dark rounded-lg border border-dark-border p-4 xs:p-5 sm:p-6 ${
                  isToday ? 'ring-2 ring-blue-500/50' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0 mb-4">
                  <div className="flex items-start space-x-3 xs:space-x-4 flex-1 min-w-0">
                    <div className="p-2 bg-dark-secondary/20 rounded-lg flex-shrink-0">
                      {interviewType && <interviewType.icon className="w-4 h-4 xs:w-5 xs:h-5 text-dark-accent" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base xs:text-lg font-medium text-dark-text-primary line-clamp-2">
                        {interview.jobTitle} - {interviewType?.label} (Round {interview.round})
                      </h3>
                      <p className="text-dark-text-secondary truncate">{interview.companyName}</p>
                      <div className="flex flex-col xs:flex-row xs:items-center xs:space-x-4 mt-2 text-xs xs:text-sm text-dark-text-muted space-y-1 xs:space-y-0">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="w-3 h-3 xs:w-4 xs:h-4" />
                          <span>{new Date(interview.scheduledDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3 xs:w-4 xs:h-4" />
                          <span>{new Date(interview.scheduledDate).toLocaleTimeString()}</span>
                        </div>
                        <span>({interview.duration} min)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                      ${statusConfig.color}
                    `}>
                      {statusConfig.label}
                    </span>
                    {isToday && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-400/30">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {/* Interviewers */}
                {interview.interviewers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-dark-text-secondary mb-2">Interviewers</h4>
                    <div className="space-y-1">
                      {interview.interviewers.map((interviewer, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <UserGroupIcon className="w-4 h-4 text-dark-text-muted" />
                          <span className="text-dark-text-primary">{interviewer.name}</span>
                          {interviewer.title && (
                            <span className="text-dark-text-muted">- {interviewer.title}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meeting Details */}
                <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4 mb-4">
                  {interview.meetingLink && (
                    <div className="flex items-center space-x-2">
                      <VideoCameraIcon className="w-4 h-4 text-dark-text-muted flex-shrink-0" />
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-dark-accent hover:text-dark-accent/80 text-sm truncate"
                      >
                        Join Meeting
                      </a>
                    </div>
                  )}
                  
                  {interview.location && (
                    <div className="flex items-center space-x-2 min-w-0">
                      <MapPinIcon className="w-4 h-4 text-dark-text-muted flex-shrink-0" />
                      <span className="text-sm text-dark-text-primary truncate">{interview.location}</span>
                    </div>
                  )}
                </div>

                {/* Preparation Notes */}
                {interview.preparationNotes && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-dark-text-secondary mb-2">Preparation Notes</h4>
                    <p className="text-sm text-dark-text-primary bg-dark-secondary/20 rounded p-3">
                      {interview.preparationNotes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between pt-4 border-t border-dark-border space-y-3 xs:space-y-0">
                  <div className="flex flex-wrap items-center gap-2 xs:gap-3">
                    {interview.status === 'scheduled' && isUpcoming && (
                      <>
                        <button
                          onClick={() => updateInterviewStatus(interview.id, 'completed')}
                          className="text-green-400 hover:text-green-300 text-xs xs:text-sm flex items-center space-x-1 touch-target"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          <span className="hidden xs:inline">Mark Complete</span>
                          <span className="xs:hidden">Complete</span>
                        </button>
                        <button
                          onClick={() => updateInterviewStatus(interview.id, 'cancelled')}
                          className="text-red-400 hover:text-red-300 text-xs xs:text-sm flex items-center space-x-1 touch-target"
                        >
                          <XMarkIcon className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedInterview(interview)}
                      className="text-dark-accent hover:text-dark-accent/80 p-2 rounded-md hover:bg-dark-accent/10 touch-target"
                      title="Edit Interview"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Interview Modal */}
      {showCreateModal && (
        <CreateInterviewModal
          applications={applications}
          onClose={() => setShowCreateModal(false)}
          onSave={createInterview}
        />
      )}

      {/* Interview Detail Modal */}
      {selectedInterview && (
        <InterviewDetailModal
          interview={selectedInterview}
          onClose={() => setSelectedInterview(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

// Create Interview Modal Component
function CreateInterviewModal({
  applications,
  onClose,
  onSave
}: {
  applications: JobApplication[];
  onClose: () => void;
  onSave: (data: Partial<Interview>) => void;
}) {
  const [formData, setFormData] = useState({
    applicationId: '',
    type: 'phone' as const,
    round: 1,
    scheduledDate: '',
    duration: 60,
    interviewers: [{ name: '', title: '' }],
    meetingLink: '',
    location: '',
    preparationNotes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card-dark rounded-lg border border-dark-border p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-dark-text-primary">Schedule Interview</h2>
          <button
            onClick={onClose}
            className="text-dark-text-muted hover:text-dark-text-primary"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 xs:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Job Application
              </label>
              <select
                value={formData.applicationId}
                onChange={(e) => setFormData(prev => ({ ...prev, applicationId: e.target.value }))}
                className="input-field-dark w-full"
                required
              >
                <option value="">Select application...</option>
                {applications.map(app => (
                  <option key={app._id} value={app._id}>
                    {app.jobTitle} - {app.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Interview Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="input-field-dark w-full"
              >
                {INTERVIEW_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Round
              </label>
              <input
                type="number"
                value={formData.round}
                onChange={(e) => setFormData(prev => ({ ...prev, round: parseInt(e.target.value) }))}
                className="input-field-dark w-full"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="input-field-dark w-full"
                min="15"
                step="15"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              className="input-field-dark w-full"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Meeting Link
              </label>
              <input
                type="url"
                value={formData.meetingLink}
                onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                className="input-field-dark w-full"
                placeholder="https://zoom.us/j/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="input-field-dark w-full"
                placeholder="123 Main St, Conference Room A"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Preparation Notes
            </label>
            <textarea
              value={formData.preparationNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, preparationNotes: e.target.value }))}
              className="input-field-dark w-full"
              rows={3}
              placeholder="Things to prepare for this interview..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-dark px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-dark px-4 py-2 rounded-lg"
            >
              Schedule Interview
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Interview Detail Modal Component
function InterviewDetailModal({
  interview,
  onClose,
  onUpdate
}: {
  interview: Interview;
  onClose: () => void;
  onUpdate: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card-dark rounded-lg border border-dark-border p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-dark-text-primary">Interview Details</h2>
          <button
            onClick={onClose}
            className="text-dark-text-muted hover:text-dark-text-primary"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-dark-text-primary mb-2">
              {interview.jobTitle} - Round {interview.round}
            </h3>
            <p className="text-dark-text-secondary">{interview.companyName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-dark-text-secondary mb-1">Date & Time</h4>
              <p className="text-dark-text-primary">
                {new Date(interview.scheduledDate).toLocaleString()}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-dark-text-secondary mb-1">Duration</h4>
              <p className="text-dark-text-primary">{interview.duration} minutes</p>
            </div>
          </div>

          {interview.feedback && (
            <div>
              <h4 className="text-sm font-medium text-dark-text-secondary mb-2">Feedback</h4>
              <p className="text-dark-text-primary bg-dark-secondary/20 rounded p-3">
                {interview.feedback}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-dark-border">
            <button
              onClick={onClose}
              className="btn-secondary-dark px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}