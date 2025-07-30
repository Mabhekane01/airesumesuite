import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  LinkIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  ArchiveBoxIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { jobApplicationAPI, interviewAPI } from '../../services/api';
import React from 'react';

interface JobApplication {
  _id: string;
  jobTitle: string;
  companyName: string;
  status: string;
  applicationDate: string;
  jobDescription: string;
  jobLocation: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
    hybrid?: boolean;
  };
  compensation: {
    salaryRange?: {
      min: number;
      max: number;
      currency: string;
      period: string;
    };
    benefits?: string[];
  };
  priority: string;
  interviews: Interview[];
  communications: Communication[];
  tasks: Task[];
  metrics: {
    applicationScore: number;
    successProbability?: number;
  };
  applicationStrategy: {
    whyInterested: string;
    keySellingPoints: string[];
    uniqueValueProposition: string;
  };
}

interface Interview {
  id: string;
  type: string;
  round: number;
  scheduledDate: string;
  duration: number;
  status: string;
  interviewers: {
    name: string;
    title: string;
  }[];
  feedback?: string;
  rating?: number;
}

interface Communication {
  id: string;
  type: string;
  date: string;
  direction: string;
  contactPerson: string;
  subject?: string;
  summary: string;
  sentiment: string;
}

interface Task {
  id: string;
  title: string;
  type: string;
  priority: string;
  dueDate: string;
  completed: boolean;
  description?: string;
}

const STATUS_CONFIG = {
  applied: { label: 'Applied', color: 'bg-blue-500/20 text-blue-400 border-blue-400/30', icon: ClockIcon },
  under_review: { label: 'Under Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30', icon: ExclamationTriangleIcon },
  phone_screen: { label: 'Phone Screen', color: 'bg-purple-500/20 text-purple-400 border-purple-400/30', icon: PhoneIcon },
  technical_assessment: { label: 'Technical Assessment', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-400/30', icon: DocumentTextIcon },
  first_interview: { label: 'First Interview', color: 'bg-purple-500/20 text-purple-400 border-purple-400/30', icon: CalendarIcon },
  second_interview: { label: 'Second Interview', color: 'bg-purple-600/20 text-purple-300 border-purple-300/30', icon: CalendarIcon },
  final_interview: { label: 'Final Interview', color: 'bg-purple-700/20 text-purple-200 border-purple-200/30', icon: CalendarIcon },
  offer_received: { label: 'Offer Received', color: 'bg-green-500/20 text-green-400 border-green-400/30', icon: CheckCircleIcon },
  offer_accepted: { label: 'Offer Accepted', color: 'bg-green-600/20 text-green-300 border-green-300/30', icon: CheckCircleIcon },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-400/30', icon: XCircleIcon },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-500/20 text-gray-400 border-gray-400/30', icon: XCircleIcon },
};

export default function JobApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewTasks, setInterviewTasks] = useState<Record<string, any[]>>({});
  const [interviewMessages, setInterviewMessages] = useState<Record<string, any[]>>({});
  const [showCreateInterviewModal, setShowCreateInterviewModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState<{ show: boolean; interviewId?: string }>({ show: false });
  const [showMessageModal, setShowMessageModal] = useState<{ show: boolean; interviewId?: string }>({ show: false });

  useEffect(() => {
    console.log('ApplicationDetail mounted with applicationId:', applicationId);
    console.log('Current location:', window.location.pathname);
    
    if (applicationId) {
      loadApplication();
    } else {
      console.error('No applicationId found in URL params');
      toast.error('Invalid application ID');
      navigate('/dashboard/applications');
    }
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      console.log('Loading application:', applicationId);
      
      if (!applicationId) {
        throw new Error('No application ID provided');
      }
      
      const response = await jobApplicationAPI.getApplication(applicationId);
      console.log('Application response:', response);
      
      if (response.success && response.data) {
        setApplication(response.data.application);
        console.log('Application loaded successfully');
        
        // Load interviews for this application
        await loadInterviews();
      } else {
        console.error('Invalid response format:', response);
        toast.error('Invalid response from server');
        navigate('/dashboard/applications');
      }
    } catch (error) {
      console.error('Failed to load application:', error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          toast.error('Please log in again to view applications');
          navigate('/');
        } else if (error.message.includes('404')) {
          toast.error('Application not found');
          navigate('/dashboard/applications');
        } else if (error.message.includes('Network Error')) {
          toast.error('Cannot connect to server. Please check if the backend is running.');
        } else {
          toast.error(`Failed to load application: ${error.message}`);
        }
      } else {
        toast.error('Failed to load application details');
      }
      
      navigate('/dashboard/applications');
    } finally {
      setLoading(false);
    }
  };

  const loadInterviews = async () => {
    if (!applicationId) return;

    try {
      const response = await interviewAPI.getInterviews({ applicationId });
      if (response.success && response.data) {
        setInterviews(response.data.interviews || []);
        
        // Load tasks and messages for each interview
        for (const interview of response.data.interviews || []) {
          await loadInterviewTasks(interview._id);
          await loadInterviewMessages(interview._id);
        }
      }
    } catch (error: any) {
      console.error('Failed to load interviews:', error);
      
      // Don't show error for auth issues - the interceptor will handle redirect
      if (error?.response?.status !== 401) {
        toast.error('Failed to load interviews. Please refresh the page.');
      }
    }
  };

  const loadInterviewTasks = async (interviewId: string) => {
    try {
      const response = await interviewAPI.getTasks(interviewId);
      if (response.success && response.data) {
        setInterviewTasks(prev => ({
          ...prev,
          [interviewId]: response.data.tasks || []
        }));
      }
    } catch (error: any) {
      console.error('Failed to load interview tasks:', error);
      
      // Don't show error for auth issues - the interceptor will handle redirect
      if (error?.response?.status !== 401) {
        console.warn('Failed to load tasks for interview:', interviewId);
      }
    }
  };

  const loadInterviewMessages = async (interviewId: string) => {
    try {
      const response = await interviewAPI.getMessages(interviewId);
      if (response.success && response.data) {
        setInterviewMessages(prev => ({
          ...prev,
          [interviewId]: response.data.messages || []
        }));
      }
    } catch (error: any) {
      console.error('Failed to load interview messages:', error);
      
      // Don't show error for auth issues - the interceptor will handle redirect
      if (error?.response?.status !== 401) {
        console.warn('Failed to load messages for interview:', interviewId);
      }
    }
  };

  const createInterview = async (interviewData: any) => {
    if (!applicationId) return;

    try {
      const response = await interviewAPI.createInterview({
        ...interviewData,
        applicationId
      });
      
      if (response.success) {
        toast.success('Interview scheduled successfully');
        await loadInterviews();
        setShowCreateInterviewModal(false);
      }
    } catch (error) {
      console.error('Failed to create interview:', error);
      toast.error('Failed to schedule interview');
    }
  };

  const createTask = async (interviewId: string, taskData: any) => {
    try {
      const response = await interviewAPI.createTask(interviewId, taskData);
      
      if (response.success) {
        toast.success('Task created successfully');
        await loadInterviewTasks(interviewId);
        setShowTaskModal({ show: false });
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    }
  };

  const toggleTaskCompletion = async (interviewId: string, taskId: string, completed: boolean) => {
    try {
      if (completed) {
        await interviewAPI.completeTask(interviewId, taskId);
      } else {
        await interviewAPI.updateTask(interviewId, taskId, { status: 'pending' });
      }
      
      await loadInterviewTasks(interviewId);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const sendMessage = async (interviewId: string, messageData: any) => {
    try {
      const response = await interviewAPI.sendMessage(interviewId, messageData);
      
      if (response.success) {
        toast.success('Message sent successfully');
        await loadInterviewMessages(interviewId);
        setShowMessageModal({ show: false });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!application) return;
    
    try {
      const response = await jobApplicationAPI.updateApplication(application._id, {
        status: newStatus
      });
      if (response.success) {
        setApplication(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success('Status updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deleteApplication = async () => {
    if (!application || !window.confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      const response = await jobApplicationAPI.deleteApplication(application._id);
      if (response.success) {
        toast.success('Application deleted');
        navigate('/dashboard/applications');
      }
    } catch (error) {
      toast.error('Failed to delete application');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-dark-secondary/20 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          <div className="h-64 bg-dark-secondary/20 rounded-lg"></div>
          <div className="h-48 bg-dark-secondary/20 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-dark-text-primary mb-2">Application not found</h2>
        <p className="text-dark-text-secondary mb-4">The application you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/dashboard/applications')}
          className="btn-primary-dark"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG];

  return (
    <div className="space-y-6 animate-slide-up-soft">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/applications')}
            className="p-2 text-dark-text-muted hover:text-dark-text-primary rounded-lg hover:bg-dark-secondary/20"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark-text-primary">{application.jobTitle}</h1>
            <p className="text-dark-text-secondary">{application.companyName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`
            inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border
            ${statusConfig?.color}
          `}>
            {statusConfig?.label}
          </span>
          <button
            onClick={() => navigate(`/dashboard/applications/${application._id}/edit`)}
            className="btn-secondary-dark p-2"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={deleteApplication}
            className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-dark rounded-lg border border-dark-border p-4">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-dark-accent" />
            <div className="ml-3">
              <p className="text-sm font-medium text-dark-text-secondary">Match Score</p>
              <p className="text-lg font-semibold text-dark-text-primary">{application.metrics.applicationScore}/100</p>
            </div>
          </div>
        </div>
        <div className="card-dark rounded-lg border border-dark-border p-4">
          <div className="flex items-center">
            <CalendarIcon className="w-8 h-8 text-purple-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-dark-text-secondary">Interviews</p>
              <p className="text-lg font-semibold text-dark-text-primary">{application.interviews.length}</p>
            </div>
          </div>
        </div>
        <div className="card-dark rounded-lg border border-dark-border p-4">
          <div className="flex items-center">
            <EnvelopeIcon className="w-8 h-8 text-blue-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-dark-text-secondary">Communications</p>
              <p className="text-lg font-semibold text-dark-text-primary">{application.communications.length}</p>
            </div>
          </div>
        </div>
        <div className="card-dark rounded-lg border border-dark-border p-4">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-dark-text-secondary">Days Since Applied</p>
              <p className="text-lg font-semibold text-dark-text-primary">
                {Math.floor((new Date().getTime() - new Date(application.applicationDate).getTime()) / (1000 * 60 * 60 * 24))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-dark-border">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'interviews', label: 'Interviews' },
            { id: 'communications', label: 'Communications' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'strategy', label: 'Strategy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-dark-accent text-dark-accent'
                  : 'border-transparent text-dark-text-muted hover:text-dark-text-secondary hover:border-dark-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Details */}
            <div className="card-dark rounded-lg border border-dark-border p-6">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Job Details</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-dark-text-muted mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-dark-text-secondary">Company</p>
                    <p className="text-dark-text-primary">{application.companyName}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="w-5 h-5 text-dark-text-muted mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-dark-text-secondary">Location</p>
                    <p className="text-dark-text-primary">
                      {application.jobLocation.city && application.jobLocation.state 
                        ? `${application.jobLocation.city}, ${application.jobLocation.state}`
                        : 'Location not specified'}
                      {application.jobLocation.remote && ' (Remote)'}
                      {application.jobLocation.hybrid && ' (Hybrid)'}
                    </p>
                  </div>
                </div>
                {application.compensation?.salaryRange && (
                  <div className="flex items-start space-x-3">
                    <CurrencyDollarIcon className="w-5 h-5 text-dark-text-muted mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-dark-text-secondary">Compensation</p>
                      <p className="text-dark-text-primary">
                        ${application.compensation.salaryRange.min.toLocaleString()} - ${application.compensation.salaryRange.max.toLocaleString()} {application.compensation.salaryRange.period}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-3">
                  <CalendarIcon className="w-5 h-5 text-dark-text-muted mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-dark-text-secondary">Applied Date</p>
                    <p className="text-dark-text-primary">
                      {new Date(application.applicationDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="card-dark rounded-lg border border-dark-border p-6">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Status Updates</h3>
              <div className="space-y-3">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(status)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      application.status === status
                        ? config.color
                        : 'border-dark-border hover:border-dark-accent/50 text-dark-text-muted hover:text-dark-text-primary'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <config.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    {application.status === status && (
                      <CheckCircleIcon className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text-primary">Interviews</h3>
              <button 
                onClick={() => setShowCreateInterviewModal(true)}
                className="btn-primary-dark flex items-center px-4 py-2 rounded-lg"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Schedule Interview
              </button>
            </div>
            
            {interviews.length === 0 ? (
              <div className="card-dark rounded-lg border border-dark-border p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-dark-text-muted mx-auto mb-4" />
                <h4 className="text-lg font-medium text-dark-text-primary mb-2">No interviews scheduled</h4>
                <p className="text-dark-text-secondary mb-4">Schedule your first interview to track your progress.</p>
                <button 
                  onClick={() => setShowCreateInterviewModal(true)}
                  className="btn-primary-dark"
                >
                  Schedule Interview
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.map((interview) => (
                  <div key={interview._id} className="card-dark rounded-lg border border-dark-border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-dark-text-primary">
                          {interview.title || `${interview.type} - Round ${interview.round}`}
                        </h4>
                        <p className="text-dark-text-secondary">
                          {new Date(interview.scheduledDate).toLocaleDateString()} at {new Date(interview.scheduledDate).toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-dark-text-muted">
                          Duration: {interview.duration} minutes
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`
                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${interview.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            interview.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                            interview.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'}
                        `}>
                          {interview.status}
                        </span>
                        <button
                          onClick={() => setShowMessageModal({ show: true, interviewId: interview._id })}
                          className="p-1 text-dark-text-muted hover:text-dark-accent"
                          title="Send message"
                        >
                          <EnvelopeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowTaskModal({ show: true, interviewId: interview._id })}
                          className="p-1 text-dark-text-muted hover:text-dark-accent"
                          title="Add task"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {interview.interviewers && interview.interviewers.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-dark-text-secondary mb-2">Interviewers</h5>
                        <div className="space-y-1">
                          {interview.interviewers.map((interviewer: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <UserIcon className="w-4 h-4 text-dark-text-muted" />
                              <span className="text-sm text-dark-text-primary">{interviewer.name}</span>
                              {interviewer.title && (
                                <span className="text-sm text-dark-text-muted">- {interviewer.title}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tasks for this interview */}
                    {interviewTasks[interview._id] && interviewTasks[interview._id].length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-dark-text-secondary mb-2">Tasks</h5>
                        <div className="space-y-2">
                          {interviewTasks[interview._id].slice(0, 3).map((task: any) => (
                            <div key={task._id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={task.status === 'completed'}
                                onChange={(e) => toggleTaskCompletion(interview._id, task._id, e.target.checked)}
                                className="rounded border-dark-border text-dark-accent focus:ring-dark-accent"
                              />
                              <span className={`text-sm ${task.status === 'completed' ? 'line-through text-dark-text-muted' : 'text-dark-text-primary'}`}>
                                {task.title}
                              </span>
                              <span className={`
                                inline-flex items-center px-1 py-0.5 rounded text-xs font-medium
                                ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'}
                              `}>
                                {task.priority}
                              </span>
                            </div>
                          ))}
                          {interviewTasks[interview._id].length > 3 && (
                            <p className="text-xs text-dark-text-muted">
                              +{interviewTasks[interview._id].length - 3} more tasks
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recent messages */}
                    {interviewMessages[interview._id] && interviewMessages[interview._id].length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-dark-text-secondary mb-2">Recent Messages</h5>
                        <div className="space-y-1">
                          {interviewMessages[interview._id].slice(0, 2).map((message: any) => (
                            <div key={message._id} className="text-sm text-dark-text-primary bg-dark-secondary/20 rounded p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{message.subject || 'Message'}</span>
                                <span className="text-xs text-dark-text-muted">
                                  {new Date(message.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-dark-text-secondary line-clamp-1">{message.body}</p>
                            </div>
                          ))}
                          {interviewMessages[interview._id].length > 2 && (
                            <p className="text-xs text-dark-text-muted">
                              +{interviewMessages[interview._id].length - 2} more messages
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {interview.feedback && (
                      <div>
                        <h5 className="text-sm font-medium text-dark-text-secondary mb-2">Feedback</h5>
                        <p className="text-sm text-dark-text-primary bg-dark-secondary/20 rounded p-3">
                          {interview.feedback.notes || 'No feedback provided'}
                        </p>
                        {interview.feedback.overallRating && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-sm text-dark-text-secondary">Rating:</span>
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= interview.feedback.overallRating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-dark-text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'communications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text-primary">Communications</h3>
              <button 
                onClick={() => setShowMessageModal({ show: true })}
                className="btn-primary-dark flex items-center px-4 py-2 rounded-lg"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Send Message
              </button>
            </div>

            {Object.values(interviewMessages).flat().length === 0 ? (
              <div className="card-dark rounded-lg border border-dark-border p-8 text-center">
                <EnvelopeIcon className="w-12 h-12 text-dark-text-muted mx-auto mb-4" />
                <h4 className="text-lg font-medium text-dark-text-primary mb-2">No communications logged</h4>
                <p className="text-dark-text-secondary mb-4">Keep track of all your interactions with the company.</p>
                <button 
                  onClick={() => setShowMessageModal({ show: true })}
                  className="btn-primary-dark"
                >
                  Send Message
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(interviewMessages).map(([interviewId, messages]) => 
                  messages.map((message: any) => {
                    const interview = interviews.find(i => i._id === interviewId);
                    return (
                      <div key={message._id} className="card-dark rounded-lg border border-dark-border p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {message.type === 'email' && <EnvelopeIcon className="w-5 h-5 text-blue-400" />}
                            {message.type === 'message' && <EnvelopeIcon className="w-5 h-5 text-green-400" />}
                            <div>
                              <h4 className="text-sm font-medium text-dark-text-primary">
                                {message.from.name} ({message.type})
                              </h4>
                              <p className="text-xs text-dark-text-muted">
                                {new Date(message.createdAt).toLocaleDateString()} - {message.direction}
                              </p>
                              {interview && (
                                <p className="text-xs text-dark-text-muted">
                                  Interview: {interview.title || `${interview.type} - Round ${interview.round}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`
                            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${message.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                              message.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'}
                          `}>
                            {message.status}
                          </span>
                        </div>
                        
                        {message.subject && (
                          <h5 className="text-sm font-medium text-dark-text-secondary mb-2">{message.subject}</h5>
                        )}
                        
                        <p className="text-sm text-dark-text-primary">{message.body}</p>
                        
                        {message.to && message.to.length > 0 && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-xs text-dark-text-muted">To:</span>
                            <div className="flex flex-wrap gap-1">
                              {message.to.map((recipient: any, index: number) => (
                                <span key={index} className="text-xs bg-dark-secondary/20 px-2 py-1 rounded">
                                  {recipient.name} ({recipient.email})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text-primary">Tasks</h3>
              <button 
                onClick={() => setShowTaskModal({ show: true })}
                className="btn-primary-dark flex items-center px-4 py-2 rounded-lg"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Task
              </button>
            </div>

            {Object.values(interviewTasks).flat().length === 0 ? (
              <div className="card-dark rounded-lg border border-dark-border p-8 text-center">
                <DocumentTextIcon className="w-12 h-12 text-dark-text-muted mx-auto mb-4" />
                <h4 className="text-lg font-medium text-dark-text-primary mb-2">No tasks created</h4>
                <p className="text-dark-text-secondary mb-4">Create tasks to organize your interview preparation.</p>
                <button 
                  onClick={() => setShowTaskModal({ show: true })}
                  className="btn-primary-dark"
                >
                  Add Task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(interviewTasks).map(([interviewId, tasks]) => {
                  const interview = interviews.find(i => i._id === interviewId);
                  return tasks.map((task: any) => (
                    <div key={task._id} className={`
                      card-dark rounded-lg border border-dark-border p-4 ${
                        task.status === 'completed' ? 'opacity-60' : ''
                      }
                    `}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={(e) => toggleTaskCompletion(interviewId, task._id, e.target.checked)}
                            className="mt-1 rounded border-dark-border text-dark-accent focus:ring-dark-accent"
                          />
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              task.status === 'completed' ? 'text-dark-text-muted line-through' : 'text-dark-text-primary'
                            }`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-dark-text-secondary mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              {task.dueDate && (
                                <span className="text-xs text-dark-text-muted">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              <span className={`
                                inline-flex items-center px-2 py-1 rounded text-xs font-medium
                                ${task.priority === 'critical' ? 'bg-red-600/20 text-red-400' :
                                  task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'}
                              `}>
                                {task.priority}
                              </span>
                              <span className={`
                                inline-flex items-center px-2 py-1 rounded text-xs font-medium
                                ${task.type === 'preparation' ? 'bg-blue-500/20 text-blue-400' :
                                  task.type === 'research' ? 'bg-purple-500/20 text-purple-400' :
                                  task.type === 'practice' ? 'bg-green-500/20 text-green-400' :
                                  'bg-gray-500/20 text-gray-400'}
                              `}>
                                {task.type}
                              </span>
                              {interview && (
                                <span className="text-xs text-dark-text-muted">
                                  {interview.title || `${interview.type} - Round ${interview.round}`}
                                </span>
                              )}
                            </div>
                            
                            {/* Progress bar */}
                            {task.progress > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-dark-text-muted mb-1">
                                  <span>Progress</span>
                                  <span>{task.progress}%</span>
                                </div>
                                <div className="w-full bg-dark-secondary/20 rounded-full h-1.5">
                                  <div 
                                    className="bg-dark-accent h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${task.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            {/* Checklist preview */}
                            {task.checklist && task.checklist.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-dark-text-muted mb-1">
                                  Checklist ({task.checklist.filter((item: any) => item.completed).length}/{task.checklist.length})
                                </div>
                                <div className="space-y-1">
                                  {task.checklist.slice(0, 2).map((item: any, index: number) => (
                                    <div key={index} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={item.completed}
                                        className="rounded border-dark-border text-dark-accent focus:ring-dark-accent"
                                        disabled
                                      />
                                      <span className={`text-xs ${item.completed ? 'line-through text-dark-text-muted' : 'text-dark-text-secondary'}`}>
                                        {item.item}
                                      </span>
                                    </div>
                                  ))}
                                  {task.checklist.length > 2 && (
                                    <span className="text-xs text-dark-text-muted">
                                      +{task.checklist.length - 2} more items
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setShowTaskModal({ show: true, interviewId })}
                            className="p-1 text-dark-text-muted hover:text-dark-accent"
                            title="Edit task"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this task?')) {
                                try {
                                  await interviewAPI.deleteTask(interviewId, task._id);
                                  await loadInterviewTasks(interviewId);
                                  toast.success('Task deleted successfully');
                                } catch (error) {
                                  toast.error('Failed to delete task');
                                }
                              }
                            }}
                            className="p-1 text-dark-text-muted hover:text-red-400"
                            title="Delete task"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ));
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-6">
            <div className="card-dark rounded-lg border border-dark-border p-6">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Application Strategy</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-dark-text-secondary mb-2">Why I'm Interested</h4>
                  <p className="text-dark-text-primary bg-dark-secondary/20 rounded p-3">
                    {application.applicationStrategy.whyInterested || 'Not specified'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-dark-text-secondary mb-2">Key Selling Points</h4>
                  <div className="space-y-2">
                    {application.applicationStrategy.keySellingPoints.length > 0 ? (
                      application.applicationStrategy.keySellingPoints.map((point, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <StarIcon className="w-4 h-4 text-yellow-400" />
                          <span className="text-dark-text-primary">{point}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-dark-text-muted">No selling points specified</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-dark-text-secondary mb-2">Unique Value Proposition</h4>
                  <p className="text-dark-text-primary bg-dark-secondary/20 rounded p-3">
                    {application.applicationStrategy.uniqueValueProposition || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateInterviewModal && (
        <CreateInterviewModal 
          onClose={() => setShowCreateInterviewModal(false)}
          onSubmit={createInterview}
        />
      )}
      
      {showTaskModal.show && (
        <CreateTaskModal 
          onClose={() => setShowTaskModal({ show: false })}
          onSubmit={(taskData) => {
            const interviewId = showTaskModal.interviewId || taskData.interviewId;
            if (interviewId) {
              createTask(interviewId, taskData);
            } else {
              toast.error('Please select an interview');
            }
          }}
          interviews={interviews}
          selectedInterviewId={showTaskModal.interviewId}
        />
      )}
      
      {showMessageModal.show && (
        <SendMessageModal 
          onClose={() => setShowMessageModal({ show: false })}
          onSubmit={(messageData) => {
            const interviewId = showMessageModal.interviewId || messageData.interviewId;
            if (interviewId) {
              sendMessage(interviewId, messageData);
            } else {
              toast.error('Please select an interview');
            }
          }}
          interviews={interviews}
          selectedInterviewId={showMessageModal.interviewId}
        />
      )}
    </div>
  );
}

// Simple Modal Components
function CreateInterviewModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'technical',
    round: 1,
    scheduledDate: '',
    duration: 60,
    timezone: 'America/New_York'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-secondary rounded-lg border border-dark-border p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Schedule Interview</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              placeholder="Interview title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
            >
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="phone">Phone Screen</option>
              <option value="video">Video Call</option>
              <option value="on_site">On-site</option>
              <option value="final">Final Round</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Round</label>
            <input
              type="number"
              min="1"
              value={formData.round}
              onChange={(e) => setFormData({ ...formData, round: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Duration (minutes)</label>
            <input
              type="number"
              min="15"
              max="480"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-dark-text-secondary hover:text-dark-text-primary"
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

function CreateTaskModal({ onClose, onSubmit, interviews, selectedInterviewId }: { 
  onClose: () => void; 
  onSubmit: (data: any) => void;
  interviews: any[];
  selectedInterviewId?: string;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'preparation',
    priority: 'medium',
    dueDate: '',
    interviewId: selectedInterviewId || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.interviewId) {
      toast.error('Please select an interview');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-secondary rounded-lg border border-dark-border p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Create Task</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Interview</label>
            <select
              value={formData.interviewId}
              onChange={(e) => setFormData({ ...formData, interviewId: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              required
            >
              <option value="">Select an interview</option>
              {interviews.map((interview) => (
                <option key={interview._id} value={interview._id}>
                  {interview.title || `${interview.type} - Round ${interview.round}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              placeholder="Task title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              placeholder="Task description"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              >
                <option value="preparation">Preparation</option>
                <option value="research">Research</option>
                <option value="practice">Practice</option>
                <option value="documentation">Documentation</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-dark-text-secondary hover:text-dark-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-dark px-4 py-2 rounded-lg"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SendMessageModal({ onClose, onSubmit, interviews, selectedInterviewId }: { 
  onClose: () => void; 
  onSubmit: (data: any) => void;
  interviews: any[];
  selectedInterviewId?: string;
}) {
  const [formData, setFormData] = useState({
    interviewId: selectedInterviewId || '',
    subject: '',
    body: '',
    to: [{ name: '', email: '', role: 'interviewer' }]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.interviewId) {
      toast.error('Please select an interview');
      return;
    }
    if (!formData.to[0].name || !formData.to[0].email) {
      toast.error('Please provide recipient details');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-secondary rounded-lg border border-dark-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Send Message</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Interview</label>
            <select
              value={formData.interviewId}
              onChange={(e) => setFormData({ ...formData, interviewId: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              required
            >
              <option value="">Select an interview</option>
              {interviews.map((interview) => (
                <option key={interview._id} value={interview._id}>
                  {interview.title || `${interview.type} - Round ${interview.round}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Recipient Name</label>
            <input
              type="text"
              required
              value={formData.to[0].name}
              onChange={(e) => setFormData({ 
                ...formData, 
                to: [{ ...formData.to[0], name: e.target.value }]
              })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              placeholder="Recipient name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Recipient Email</label>
            <input
              type="email"
              required
              value={formData.to[0].email}
              onChange={(e) => setFormData({ 
                ...formData, 
                to: [{ ...formData.to[0], email: e.target.value }]
              })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              placeholder="recipient@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              placeholder="Message subject"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Message</label>
            <textarea
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-dark-text-primary"
              placeholder="Your message"
              rows={5}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-dark-text-secondary hover:text-dark-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-dark px-4 py-2 rounded-lg"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}