import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SEO from "../components/seo/SEO"; // Import SEO component
import {
  DocumentTextIcon,
  PencilIcon,
  BriefcaseIcon,
  ChartBarIcon,
  CheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  CpuChipIcon,
  MagnifyingGlassIcon,
  GlobeAmericasIcon,
  ShieldCheckIcon,
  BoltIcon,
  CommandLineIcon,
  ChevronDownIcon,
  AcademicCapIcon,
  ScaleIcon,
  LightBulbIcon,
  UserGroupIcon,
  PresentationChartLineIcon,
  ShieldExclamationIcon,
  CircleStackIcon,
  QuestionMarkCircleIcon
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AuthModal from "../components/auth/AuthModalSimple";
import { useAuthStore } from "../stores/authStore";

// --- Framer Motion Variants ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

// --- Sub-Components ---

const BentoCard = ({ title, description, icon: Icon, className, colorClass = "text-brand-blue" }: any) => (
  <motion.div 
    variants={itemVariants}
    whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
    className={`bg-white border border-surface-200 rounded-[2.5rem] p-10 shadow-[0_2px_4px_rgba(0,0,0,0.01),0_15px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.07)] group flex flex-col justify-between ${className} transition-all duration-500 relative overflow-hidden`}
  >
    {/* Decorative Gradient Background */}
    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-brand-blue/[0.02] rounded-full blur-3xl group-hover:bg-brand-blue/[0.05] transition-colors duration-700" />
    <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.01] pointer-events-none" />

    <div className="mb-4 relative z-10">
      <div className={`w-16 h-16 rounded-3xl bg-surface-50 flex items-center justify-center border border-surface-200 mb-8 group-hover:scale-110 group-hover:border-brand-blue/30 group-hover:bg-white group-hover:rotate-3 transition-all duration-500 shadow-sm ${colorClass}`}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-3xl font-black text-brand-dark mb-4 group-hover:text-brand-blue transition-colors duration-300 tracking-tight">
        {title}
      </h3>
      <p className="text-text-secondary leading-relaxed text-base font-bold opacity-75 group-hover:opacity-100 transition-opacity">
        {description}
      </p>
    </div>
    
    <div className="flex items-center text-sm font-black text-brand-blue mt-8 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 uppercase tracking-[0.2em]">
      Initialize <span className="mx-2 opacity-30">—</span> <ArrowRightIcon className="w-4 h-4" />
    </div>
  </motion.div>
);

const FeaturePill = ({ text, icon: Icon }: any) => (
  <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-surface-200 bg-white text-[13px] font-bold text-brand-dark shadow-sm hover:border-brand-blue/30 transition-colors">
    {Icon && <Icon className="w-3.5 h-3.5 mr-2 text-brand-blue" />}
    {text}
  </div>
);

const TestimonialCard = ({ quote, author, role, company, delay }: any) => (
  <motion.div 
    variants={itemVariants}
    whileHover={{ scale: 1.02 }}
    className="bg-white border border-surface-200 rounded-[2.5rem] p-12 shadow-[0_10px_40px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group transition-all duration-500"
  >
    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
      <SparklesIcon className="w-24 h-24 text-brand-blue" />
    </div>
    
    <div className="relative z-10">
      <div className="flex gap-1.5 mb-10 text-brand-orange text-xs tracking-tighter">
        {"★★★★★".split("").map((s, i) => (
          <motion.span 
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            {s}
          </motion.span>
        ))}
      </div>
      <p className="text-brand-dark text-2xl font-bold leading-[1.4] mb-12 tracking-tight group-hover:text-brand-blue transition-colors duration-500">
        "{quote}"
      </p>
    </div>

    <div className="flex items-center gap-5 relative z-10">
      <div className="relative">
        <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-tr from-brand-blue/10 to-brand-blue/5 flex items-center justify-center font-black text-brand-blue text-2xl border border-brand-blue/20 group-hover:rotate-6 transition-transform duration-500">
          {author[0]}
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-success rounded-full border-4 border-white flex items-center justify-center shadow-sm">
          <CheckIcon className="w-2.5 h-2.5 text-white stroke-[4]" />
        </div>
      </div>
      <div>
        <div className="font-black text-brand-dark text-lg tracking-tight leading-none mb-1.5">{author}</div>
        <div className="text-text-tertiary text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-2">
          {role} <div className="w-1 h-1 rounded-full bg-brand-blue/30" /> {company}
        </div>
      </div>
    </div>
  </motion.div>
);

const FAQItem = ({ question, answer }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-surface-50 border border-surface-200 rounded-2xl mb-4 overflow-hidden transition-all duration-300 hover:border-brand-blue/20">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-8 py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-black text-brand-dark group-hover:text-brand-blue transition-colors">{question}</span>
        <div className={`w-8 h-8 rounded-full bg-white border border-surface-200 flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-brand-blue border-brand-blue' : ''}`}>
          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'text-brand-dark'}`} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 text-text-secondary text-base font-semibold leading-relaxed max-w-3xl">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LandingPageSimple() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const authError = searchParams.get("auth");
    const message = searchParams.get("message");
    if (authError === "error" && message) {
      toast.error(decodeURIComponent(message));
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const handleGetStarted = () => {
    if (isAuthenticated) return;
    setAuthMode("register");
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-text-primary selection:bg-brand-blue/30 overflow-x-hidden font-sans">
      <SEO 
        title="AI Job Suite | Intelligent Career Engineering"
        description="Automate your job search with AI Job Suite by Bankhosa. Access real-time job market intelligence, AI resume builder, and career trajectory optimization."
        keywords={['Job Board', 'Resume Builder', 'AI Career Coach', 'Job Scraper', 'Bankhosa', 'Career Automation', 'Tech Jobs']}
      />
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden pt-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[800px] h-[800px] bg-brand-blue/[0.04] rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] bg-brand-blue/[0.04] rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
        </div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="relative z-10 max-w-6xl mx-auto text-center"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-surface-200 mb-10 shadow-[0_2px_10px_rgba(0,0,0,0.04)] group cursor-default">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-surface-200" />
              ))}
            </div>
            <span className="w-px h-4 bg-surface-200 mx-1"></span>
            <span className="text-[13px] font-bold text-brand-dark tracking-wide uppercase">Proven results for 50K+ experts</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-6xl md:text-[6.5rem] font-display font-black tracking-tighter leading-[0.95] mb-10 text-brand-dark">
            High-Performance <br />
            <span className="bg-gradient-to-r from-brand-blue to-blue-400 bg-clip-text text-transparent">Career Engineering.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-14 leading-relaxed font-semibold">
            The intelligent workspace designed to automate your job search and optimize your professional identity for the world's leading companies.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {isAuthenticated ? (
              <Link to="/dashboard" className="bg-brand-dark text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:bg-slate-800 transition-all active:scale-95 flex items-center">
                Launch Dashboard <ArrowRightIcon className="w-6 h-6 ml-3" />
              </Link>
            ) : (
              <>
                <button onClick={handleGetStarted} className="bg-brand-blue text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-[0_20px_40px_rgba(26,145,240,0.3)] hover:shadow-[0_25px_50px_rgba(26,145,240,0.4)] hover:-translate-y-1 transition-all active:scale-95">
                  Build Free Resume
                </button>
                <Link to="/jobs" className="bg-white text-brand-dark border-2 border-surface-200 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-surface-50 transition-all flex items-center">
                  <MagnifyingGlassIcon className="w-6 h-6 mr-3 text-brand-blue" /> Career Scraper
                </Link>
              </>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="mt-32 pt-16 border-t border-surface-100 flex flex-col items-center">
            <p className="text-text-tertiary text-[11px] font-black uppercase tracking-[0.3em] mb-12">Authorized by individuals at</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-25 grayscale group">
              {['TECHCORE', 'GLOBALINC', 'NEXUS', 'VANTAGE', 'QUANTUM'].map(logo => (
                <div key={logo} className="text-2xl font-black font-display tracking-tighter hover:text-brand-blue transition-colors cursor-default">{logo}</div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* --- BENTO GRID: THE FULL STACK PLATFORM --- */}
      <section className="py-48 px-4 bg-surface-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-surface-200 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
            <div className="space-y-6 text-left">
              <div className="inline-flex items-center px-4 py-1 rounded-full bg-brand-blue/5 text-brand-blue text-[11px] font-black uppercase tracking-widest border border-brand-blue/10">
                System Infrastructure
              </div>
              <h2 className="text-5xl md:text-7xl font-display font-black text-brand-dark tracking-tighter leading-none">
                The Full Stack <br />Platform.
              </h2>
            </div>
            <p className="text-xl text-text-secondary max-w-md font-bold leading-relaxed mb-2">
              A unified architecture for every stage of your professional growth cycle.
            </p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-12 gap-8"
          >
            {/* Scraper Card */}
            <BentoCard 
              title="Job Scraper 2.0"
              description="Proprietary scrapers that monitor high-value career portals every 15 minutes. Secure roles before they go viral."
              icon={GlobeAmericasIcon}
              className="md:col-span-4 h-full"
            />
            
            {/* Wide Visual Terminal Card */}
            <motion.div 
              variants={itemVariants}
              className="md:col-span-8 card-resume p-12 bg-brand-dark flex flex-col md:flex-row gap-12 items-center text-white overflow-hidden relative border-none min-h-[450px]"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-[0.03]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,145,240,0.2),transparent_60%)]" />
              <div className="relative z-10 flex-1 space-y-8">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-brand-blue shadow-[0_0_30px_rgba(26,145,240,0.3)]">
                  <ChartBarIcon className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-4xl font-display font-black tracking-tight mb-4">Market Intelligence <br />Terminal</h3>
                  <p className="text-surface-300 text-lg font-semibold leading-relaxed">
                    Institutional-grade data on hiring velocity, salary range shifts, and talent density in your niche.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">+14% Pay Edge</span>
                  </div>
                  <div className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <PresentationChartLineIcon className="w-4 h-4 text-brand-blue" />
                    <span className="text-xs font-black uppercase tracking-widest">Live Benchmarking</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 flex-1 w-full flex justify-center">
                <div className="w-full max-w-sm bg-[#0f172a] rounded-2xl border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] p-6 rotate-2 hover:rotate-0 transition-transform duration-700 overflow-hidden group">
                  <div className="flex gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="space-y-5">
                    {[
                      { l: "Software Engineer", v: "$180k - $240k", p: "85%" },
                      { l: "Product Manager", v: "$165k - $210k", p: "92%" },
                      { l: "Data Scientist", v: "$175k - $230k", p: "78%" }
                    ].map((row, i) => (
                      <div key={i} className="space-y-2 group/row">
                        <div className="flex justify-between items-center">
                          <div className="text-[11px] font-black text-white uppercase tracking-wider">{row.l}</div>
                          <div className="text-[11px] font-bold text-brand-blue">{row.v}</div>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: row.p }}
                            transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                            className="h-full bg-gradient-to-r from-brand-blue to-blue-400" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-success" />
                      <span className="text-[10px] font-black text-surface-400 uppercase">Engine Live</span>
                    </div>
                    <div className="text-[10px] font-black text-brand-blue uppercase cursor-pointer hover:underline">Full Analytics →</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Resume Builder Card */}
            <motion.div 
              variants={itemVariants}
              className="md:col-span-7 card-resume p-10 bg-white flex flex-col md:flex-row items-center gap-10 group min-h-[400px]"
            >
              <div className="flex-1 space-y-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
                  <DocumentTextIcon className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black text-brand-dark leading-tight">Identity Optimization <br />Engine</h3>
                <p className="text-text-secondary text-base font-bold leading-relaxed opacity-80">
                  Transform your career history into a high-impact professional narrative optimized for both human scanners and ATS algorithms.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FeaturePill text="ATS Validator" icon={ShieldCheckIcon} />
                  <FeaturePill text="Semantic Search" icon={SparklesIcon} />
                </div>
              </div>
              <div className="flex-1 w-full relative">
                <img 
                  src="/templates/template01/33592.jpeg" 
                  alt="Professional Template" 
                  className="rounded-xl shadow-2xl border border-surface-200 group-hover:scale-[1.03] transition-all duration-700"
                />
              </div>
            </motion.div>

            {/* Other Cards */}
            <BentoCard 
              title="Identity Core"
              description="Deep extraction of your career DNA. Map your skills to market demand instantly."
              icon={CircleStackIcon}
              className="md:col-span-5"
              colorClass="text-brand-success"
            />
          </motion.div>
        </div>
      </section>

      {/* --- CUSTOMER SUCCESS: THE RESULTS --- */}
      <section className="py-48 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 mb-24 items-center">
            <div className="lg:col-span-1 space-y-8">
              <div className="inline-flex items-center px-4 py-1 rounded-full bg-brand-success/10 text-brand-success text-[11px] font-black uppercase tracking-widest border border-brand-success/20">
                Performance Metrics
              </div>
              <h2 className="text-5xl md:text-6xl font-display font-black text-brand-dark tracking-tighter leading-none">
                Real Offer <br />Dynamics.
              </h2>
              <p className="text-xl text-text-secondary font-bold leading-relaxed italic border-l-4 border-brand-success pl-6">
                "Our users report a 3.5x increase in high-intent interviews within the first 30 days."
              </p>
              <div className="pt-4 flex gap-8">
                <div>
                  <div className="text-4xl font-black text-brand-dark">98%</div>
                  <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">ATS Pass Rate</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-brand-dark">24h</div>
                  <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-1">Avg. Response</div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-blue/[0.02] rounded-full blur-[100px] pointer-events-none" />
              <TestimonialCard 
                quote="The semantic optimization is no joke. I landed interviews at Nexus and TechCore back-to-back."
                author="Marcus Thorne"
                role="Principal Architect"
                company="GlobalInc"
              />
              <div className="mt-12 md:mt-24">
                <TestimonialCard 
                  quote="I never realized how much of my experience was being filtered out by Workday. This fixed it instantly."
                  author="Sarah Chen"
                  role="Senior Director"
                  company="Vantage"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION: KNOWLEDGE ARCHITECTURE --- */}
      <section className="py-48 px-4 bg-surface-50 border-y border-surface-200">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center mb-24 space-y-6">
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-4">
              <QuestionMarkCircleIcon className="w-10 h-10" />
            </div>
            <h2 className="text-5xl md:text-6xl font-display font-black text-brand-dark tracking-tighter">System Intelligence FAQ.</h2>
            <p className="text-xl text-text-secondary font-bold max-w-2xl">Understanding the engineering behind our career automation engine.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <FAQItem 
              question="How does semantic mapping differ from keyword stuffing?"
              answer="Standard tools just hide keywords in white text. Our engine uses Natural Language Processing (NLP) to restructure your accomplishments into high-context bullet points that match the specific semantic patterns ATS and hiring managers are trained to detect."
            />
            <FAQItem 
              question="Can the AI accurately represent highly technical roles?"
              answer="Yes. We have indexed industry-specific ontologies for Software Engineering, Data Science, Quantitative Finance, and 200+ other niches to ensure technical accuracy and appropriate impact quantification."
            />
            <FAQItem 
              question="What is the Enterprise Job Intelligence layer?"
              answer="It is our proprietary career-node monitoring system. It provides real-time analytics on how recruiters interact with your architecture, giving you a statistical edge in the market."
            />
            <FAQItem 
              question="Is my career data kept private and secure?"
              answer="We employ institutional-grade encryption. Your data is strictly used to train your private local profile and is never shared with third-party datasets or other users. We are fully GDPR and SOC2 compliant."
            />
          </div>
        </div>
      </section>

      {/* --- FINAL ENTERPRISE CTA --- */}
      <section className="py-64 relative px-4 bg-white overflow-hidden">
        {/* Subtle Background Ambience */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-brand-blue/[0.02] rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-surface-200 rounded-[4rem] relative overflow-hidden shadow-[0_100px_150px_-50px_rgba(26,145,240,0.12)]"
          >
            {/* Clean Geometric Background Accents */}
            <div className="absolute inset-0 z-0 opacity-30">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_90%)]" />
            </div>
            
            <div className="relative z-10 flex flex-col lg:flex-row">
              {/* Left Side: Primary Action (2/3) */}
              <div className="flex-[1.5] p-12 md:p-24 lg:p-32 text-left border-b lg:border-b-0 lg:border-r border-surface-100">
                <div className="space-y-12">
                  <motion.div 
                    variants={itemVariants}
                    className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-surface-50 border border-surface-200 text-brand-blue font-black uppercase tracking-[0.3em] text-[10px] shadow-sm"
                  >
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-40"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
                    </div>
                    Deployment Ready: Protocol v4.2
                  </motion.div>

                  <h2 className="text-6xl md:text-[7rem] font-display font-black text-brand-dark leading-[0.9] tracking-[-0.05em]">
                    Engineer Your <br />
                    <span className="text-brand-blue relative inline-block">
                      Outcome.
                      <svg className="absolute -bottom-4 left-0 w-full h-4 text-brand-blue/10" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <path d="M0,5 Q25,0 50,5 T100,5" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </span>
                  </h2>

                  <p className="text-xl md:text-2xl text-text-secondary max-w-xl font-bold leading-relaxed tracking-tight opacity-90">
                    Join the top 5% of professionals who leverage <span className="text-brand-dark underline decoration-brand-blue/30 decoration-4 underline-offset-4">precision intelligence</span> to dominate their market niche.
                  </p>
                  
                  {!isAuthenticated && (
                    <div className="flex flex-col items-start gap-10 pt-6">
                      <motion.button 
                        onClick={handleGetStarted}
                        whileHover={{ scale: 1.02, x: 8 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-brand-blue text-white px-16 py-7 rounded-2xl font-black text-2xl shadow-[0_25px_50px_-12px_rgba(26,145,240,0.4)] hover:shadow-[0_40px_80px_-12px_rgba(26,145,240,0.5)] transition-all duration-500 group"
                      >
                        Launch Career OS <ArrowRightIcon className="w-6 h-6 ml-4 inline group-hover:translate-x-2 transition-transform" />
                      </motion.button>

                      <div className="flex flex-wrap gap-8">
                        <div className="flex items-center gap-3 group cursor-default">
                          <CheckIcon className="w-5 h-5 text-brand-success stroke-[4]" />
                          <span className="text-[11px] font-black text-brand-dark uppercase tracking-widest">End-to-End Encryption</span>
                        </div>
                        <div className="flex items-center gap-3 group cursor-default">
                          <CheckIcon className="w-5 h-5 text-brand-success stroke-[4]" />
                          <span className="text-[11px] font-black text-brand-dark uppercase tracking-widest">Global Data Sync</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: System Manifest (1/3) */}
              <div className="flex-1 bg-surface-50/50 p-12 md:p-20 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <CommandLineIcon className="w-64 h-64 text-brand-blue" />
                </div>
                
                <div className="relative z-10 space-y-10">
                  <div>
                    <h4 className="text-[11px] font-black text-text-tertiary uppercase tracking-[0.4em] mb-8 border-b border-surface-200 pb-4">System Manifest</h4>
                    <div className="space-y-6">
                      {[
                        { label: "Extraction Layer", status: "Optimized", value: "Semantic Core v2" },
                        { label: "Market Scrapers", status: "Active", value: "4,200+ Nodes" },
                        { label: "ATS Matching", status: "Certified", value: "99.8% Accuracy" },
                        { label: "Latent Response", status: "Real-time", value: "< 140ms" },
                        { label: "Security Tier", status: "Institutional", value: "SOC2 Type II" }
                      ].map((spec, i) => (
                        <div key={i} className="flex justify-between items-end group/spec">
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{spec.label}</div>
                            <div className="text-sm font-bold text-brand-dark group-hover/spec:text-brand-blue transition-colors">{spec.value}</div>
                          </div>
                          <div className="text-[9px] font-black text-brand-success uppercase tracking-tighter bg-brand-success/10 px-2 py-0.5 rounded">
                            {spec.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-surface-200">
                    <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-sm group hover:border-brand-blue/30 transition-colors">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                          <BoltIcon className="w-5 h-5" />
                        </div>
                        <div className="text-[11px] font-black text-brand-dark uppercase tracking-widest">Initialization Log</div>
                      </div>
                      <div className="font-mono text-[10px] text-text-secondary leading-relaxed space-y-1">
                        <div className="flex gap-2"><span className="text-brand-success">✓</span> Identity mapping complete</div>
                        <div className="flex gap-2"><span className="text-brand-success">✓</span> Market delta calculated</div>
                        <div className="flex gap-2"><span className="text-brand-blue animate-pulse">●</span> Ready for deployment</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* High-End Decorative Corner Accents */}
            <div className="absolute top-12 left-12 w-16 h-16 border-t-4 border-l-4 border-surface-100 rounded-tl-[2rem] pointer-events-none opacity-50" />
            <div className="absolute bottom-12 right-12 w-16 h-16 border-b-4 border-r-4 border-surface-100 rounded-br-[2rem] pointer-events-none opacity-50" />
          </motion.div>
        </div>
      </section>

      {/* --- ENTERPRISE FOOTER --- */}
      <footer className="bg-white border-t border-surface-200 py-32 px-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-16 mb-24">
            <div className="col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center shadow-xl">
                  <span className="text-white font-black text-2xl">A</span>
                </div>
                <span className="font-display font-black text-3xl text-brand-dark tracking-tighter">AI Job Suite</span>
              </div>
              <p className="text-text-secondary text-lg font-bold leading-relaxed max-w-sm">
                Next-generation platform for high-performance career engineering.
              </p>
              <div className="flex gap-6">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-xl bg-surface-50 border border-surface-200 hover:border-brand-blue/30 cursor-pointer transition-colors" />
                ))}
              </div>
            </div>
            
            {[
              { title: "Platform", links: ["Resume Builder", "Job Intelligence", "Career Tracking"] },
              { title: "Governance", links: ["Privacy Center", "Security Protocol", "Terms of Use", "Data Standards"] },
              { title: "Success", links: ["Case Studies", "Market Data", "Help Center", "API Access"] }
            ].map((col, i) => (
              <div key={i}>
                <h5 className="font-black text-brand-dark mb-8 text-[11px] uppercase tracking-[0.3em]">{col.title}</h5>
                <ul className="space-y-5 text-sm text-text-secondary font-bold">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="hover:text-brand-blue transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-12 border-t border-surface-100 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="text-[11px] text-text-tertiary flex flex-wrap gap-10 font-black uppercase tracking-[0.2em]">
              <span>© 2025 AI JOB SUITE — PROVEN PERFORMANCE</span>
              <a href="#" className="hover:text-brand-dark transition-colors">GDPR Compliant</a>
              <a href="#" className="hover:text-brand-dark transition-colors">ISO 27001 Certified</a>
            </div>
            <div className="flex items-center gap-3 px-6 py-2.5 bg-surface-50 rounded-full border border-surface-200">
              <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
              <span className="text-xs font-black text-brand-dark tracking-widest uppercase">System Operational — 99.9% Uptime</span>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}