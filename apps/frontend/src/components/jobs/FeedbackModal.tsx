import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, MessageCircle, DollarSign, Clock, CheckCircle2, ThumbsDown } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string;
  jobApplicationId?: string;
  jobTitle: string;
  companyName: string;
  initialMode?: 'verify' | 'view';
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, jobId, jobApplicationId, jobTitle, companyName, initialMode = 'verify' }) => {
  const [mode, setMode] = useState<'verify' | 'view'>(initialMode);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  const [step, setStep] = useState(1);
  const [feedbackType, setFeedbackType] = useState<string>('');
  const [isReal, setIsReal] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Additional structured data
  const [isResponsive, setIsResponsive] = useState<boolean>(false);
  const [didInterview, setDidInterview] = useState<boolean>(false);
  const [askedForMoney, setAskedForMoney] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen && mode === 'view' && jobId) {
      fetchReviews();
    }
  }, [isOpen, mode, jobId]);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await api.get(`/jobs/feedback/${jobId}`);
      if (response.data.success) {
        setReviews(response.data.data.reviews);
      }
    } catch (error) {
      toast.error('Failed to load reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!feedbackType || isReal === null) return;
    
    setSubmitting(true);
    try {
      await api.post('/jobs/feedback', {
        jobId,
        jobApplicationId,
        feedbackType,
        isReal,
        isResponsive,
        didInterview,
        askedForMoney,
        comment
      });
      
      toast.success('Feedback submitted! Your trust score has increased.');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white border border-surface-200 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-8 pb-0 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-brand-blue" size={24} />
                <span className="text-xs font-black uppercase tracking-widest text-brand-blue">Trust Verification</span>
              </div>
              
              {/* Mode Toggle */}
              <div className="flex bg-surface-100 p-1 rounded-lg">
                <button 
                  onClick={() => setMode('view')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${mode === 'view' ? 'bg-white shadow-sm text-brand-dark' : 'text-text-tertiary hover:text-text-secondary'}`}
                >
                  Reports
                </button>
                <button 
                  onClick={() => setMode('verify')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${mode === 'verify' ? 'bg-white shadow-sm text-brand-dark' : 'text-text-tertiary hover:text-text-secondary'}`}
                >
                  Verify
                </button>
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-brand-dark tracking-tighter">{mode === 'verify' ? 'Verify Job Authenticity.' : 'Community Intelligence.'}</h2>
            <p className="text-sm font-medium text-text-secondary mt-1">{mode === 'verify' ? `Help the community by validating ${companyName}.` : `Real reports for ${companyName}.`}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-100 transition-colors ml-4">
            <X size={20} className="text-text-tertiary" />
          </button>
        </div>

        <div className="p-8 space-y-8 min-h-[400px]">
          {mode === 'view' ? (
            <div className="space-y-4 animate-slide-up-soft">
              {loadingReviews ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-tertiary gap-3">
                  <div className="w-6 h-6 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest">Loading Grid Data...</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-surface-200 rounded-2xl">
                  <ShieldCheck className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-text-secondary">No reports yet.</p>
                  <p className="text-xs text-text-tertiary mt-1">Be the first to verify this job node.</p>
                  <button onClick={() => setMode('verify')} className="mt-4 text-xs font-black text-brand-blue hover:underline uppercase tracking-widest">Verify Now</button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {reviews.map((review, i) => (
                    <div key={i} className="p-5 bg-surface-50 border border-surface-200 rounded-2xl space-y-3 hover:border-brand-blue/20 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-xs font-black text-brand-blue uppercase">
                            {review.userId?.firstName?.[0] || 'A'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-brand-dark">
                              {review.userId?.firstName ? `${review.userId.firstName} ${review.userId.lastName || ''}` : 'Anonymous User'}
                            </p>
                            <p className="text-[10px] text-text-tertiary font-medium">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          review.feedbackType === 'scam' || review.feedbackType === 'payment_required' 
                            ? 'bg-red-50 text-red-500 border-red-100' 
                            : review.feedbackType === 'interview' || review.feedbackType === 'hired'
                            ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
                            : 'bg-white text-text-secondary border-surface-200'
                        }`}>
                          {review.feedbackType.replace('_', ' ')}
                        </div>
                      </div>

                      {/* Verified Signals */}
                      <div className="flex flex-wrap gap-2">
                        {review.isReal && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-success bg-brand-success/5 px-2 py-0.5 rounded border border-brand-success/10">
                            <CheckCircle2 size={10} /> Verified Real
                          </span>
                        )}
                        {review.didInterview && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-purple bg-brand-purple/5 px-2 py-0.5 rounded border border-brand-purple/10">
                            <MessageCircle size={10} /> Interviewed
                          </span>
                        )}
                        {review.askedForMoney && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            <DollarSign size={10} /> Asked for Money
                          </span>
                        )}
                      </div>

                      {review.comment && (
                        <div className="bg-white p-3 rounded-xl border border-surface-100">
                          <p className="text-xs text-text-secondary font-medium leading-relaxed italic">"{review.comment}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
          {step === 1 && (
            <div className="space-y-4 animate-slide-up-soft">
              <h3 className="text-sm font-black uppercase tracking-widest text-brand-dark">Is this a real opportunity?</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setIsReal(true); setStep(2); }}
                  className="p-6 rounded-2xl border-2 border-surface-200 hover:border-brand-success hover:bg-brand-success/5 transition-all group text-left space-y-2"
                >
                  <CheckCircle2 className="text-brand-success group-hover:scale-110 transition-transform" size={28} />
                  <div className="font-bold text-brand-dark">Yes, it's real</div>
                  <div className="text-xs text-text-tertiary">I received a response or saw evidence.</div>
                </button>

                <button 
                  onClick={() => { setIsReal(false); setStep(3); }} // Jump to negative flow
                  className="p-6 rounded-2xl border-2 border-surface-200 hover:border-red-500 hover:bg-red-500/5 transition-all group text-left space-y-2"
                >
                  <ThumbsDown className="text-red-500 group-hover:scale-110 transition-transform" size={28} />
                  <div className="font-bold text-brand-dark">Suspicious</div>
                  <div className="text-xs text-text-tertiary">Scam, fake, or asking for money.</div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slide-up-soft">
              <h3 className="text-sm font-black uppercase tracking-widest text-brand-dark">What happened?</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'response', label: 'Recruiter Responded', icon: MessageCircle },
                  { id: 'interview', label: 'Interviewed', icon: CheckCircle2 },
                  { id: 'hired', label: 'Got Hired', icon: ShieldCheck },
                  { id: 'rejected', label: 'Rejected', icon: X },
                  { id: 'ghosted', label: 'Ghosted (After Contact)', icon: Clock },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setFeedbackType(opt.id);
                      if (opt.id === 'response' || opt.id === 'interview' || opt.id === 'hired' || opt.id === 'rejected') setIsResponsive(true);
                      if (opt.id === 'interview' || opt.id === 'hired') setDidInterview(true);
                    }}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${feedbackType === opt.id ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-surface-200 hover:border-brand-blue/30'}`}
                  >
                    <opt.icon size={18} />
                    <span className="text-sm font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>

              <textarea 
                placeholder="Any details to help others? (Optional)"
                className="w-full p-4 rounded-xl bg-surface-50 border border-surface-200 focus:ring-2 focus:ring-brand-blue/20 outline-none text-sm font-medium resize-none h-24"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />

              <button 
                disabled={!feedbackType || submitting}
                onClick={handleSubmit}
                className="btn-primary w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20"
              >
                {submitting ? 'Verifying...' : 'Submit Verification'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-slide-up-soft">
              <h3 className="text-sm font-black uppercase tracking-widest text-red-600">Report Issue</h3>
              
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'scam', label: 'Scam / Fake Job', icon: ShieldCheck },
                  { id: 'payment_required', label: 'Asked for Payment', icon: DollarSign },
                  { id: 'expired', label: 'Job Expired / Broken Link', icon: Clock },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setFeedbackType(opt.id);
                      if (opt.id === 'payment_required') setAskedForMoney(true);
                    }}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${feedbackType === opt.id ? 'border-red-500 bg-red-500/5 text-red-500' : 'border-surface-200 hover:border-red-500/30'}`}
                  >
                    <opt.icon size={18} />
                    <span className="text-sm font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>

              <textarea 
                placeholder="Please describe the issue..."
                className="w-full p-4 rounded-xl bg-surface-50 border border-surface-200 focus:ring-2 focus:ring-red-500/20 outline-none text-sm font-medium resize-none h-24"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />

              <button 
                disabled={!feedbackType || submitting}
                onClick={handleSubmit}
                className="w-full py-4 rounded-xl bg-red-500 text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-600 transition-colors"
              >
                {submitting ? 'Reporting...' : 'Submit Report'}
              </button>
            </div>
          )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
