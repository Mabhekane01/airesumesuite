import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderOpenIcon,
  ShareIcon,
  ChartBarIcon,
  LockClosedIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import AuthModal from "../components/auth/AuthModalSimple";
import { useAuthStore } from "../stores/authStore";

// ---- content primitives ----------------------------------------------------
const features = [
  {
    icon: FolderOpenIcon,
    title: "Centralized Document Hub",
    description:
      "Organize resumes, covers, edited PDFs and proposals in one secure space with tags & roles.",
  },
  {
    icon: ShareIcon,
    title: "Secure Sharing",
    description:
      "Expiring links, passcodes, watermarking and download control. Revoke in a click.",
  },
  {
    icon: ChartBarIcon,
    title: "Engagement Analytics",
    description:
      "Opens, time on page, page depth, device & geo — with instant alerts.",
  },
  {
    icon: LockClosedIcon,
    title: "Enterprise‑grade Security",
    description:
      "AES‑256 at rest, TLS in transit, audit trails and viewer verification.",
  },
];

const useCases = [
  {
    key: "resume",
    label: "AI Resume + Cover",
    blurb:
      "Share tracked resumes & covers generated in AI Resume Suite. Know when a recruiter opens and what they read.",
    points: [
      "One‑click share from AI Resume Suite",
      "Real‑time open alerts & heatmaps",
      "Redact personal info for anonymous review",
    ],
    preview: {
      src: "/templates/template01/33592.jpeg",
      alt: "Resume preview",
    },
  },
  {
    key: "pdf",
    label: "PDF Editor Docs",
    blurb:
      "Send edited PDFs (contracts, forms, briefs) with gated access. Track viewers, downloads and comments.",
    points: [
      "Watermark & disable downloads",
      "Per‑recipient passcodes",
      "Version history & audit log",
    ],
    preview: {
      src: "/images/pdf-editor-preview.png",
      alt: "PDF editor preview",
    },
  },
  {
    key: "general",
    label: "General Doc Sharing",
    blurb:
      "A beautiful, branded viewer for proposals, portfolios, decks and research — not another dull file drop.",
    points: [
      "Custom brand colors",
      "Embeds & cover thumbnails",
      "Expiring public links",
    ],
    preview: {
      src: "/images/proposal-deck-preview.png",
      alt: "General doc preview",
    },
  },
] as const;

type UseKey = (typeof useCases)[number]["key"];

export default function DocTrackerLandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const { isAuthenticated } = useAuthStore();

  const [activeUseCase, setActiveUseCase] = useState<UseKey>("resume");
  const active = useMemo(
    () => useCases.find((u) => u.key === activeUseCase)!,
    [activeUseCase]
  );

  const handleGetStarted = () => {
    if (isAuthenticated) return;
    setAuthMode("register");
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white overflow-hidden">
      {/* ====== HERO (asymmetric, layered, glassy) ====== */}
      <section className="relative isolate px-4 sm:px-6 lg:px-8 pt-20 md:pt-28 pb-14">
        {/* background accents */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-2xl animate-float-gentle" />
          <div className="absolute -bottom-20 -right-16 h-80 w-80 rounded-full bg-teal-400/10 blur-2xl animate-float-gentle animation-delay-2000" />
          <div className="absolute inset-x-0 top-1/3 mx-auto h-px w-[92%] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        </div>

        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Headline */}
          <div className="lg:col-span-7">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              <span className="gradient-text-dark">DocTracker</span>
              <span className="block text-dark-text-primary">
                Share. Control. Know.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-dark-text-secondary max-w-2xl">
              The glassy, secure way to present resumes, cover letters and PDFs
              — with instant engagement analytics and tight access control.
              Beautiful viewer, zero friction.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:items-center">
              {isAuthenticated ? (
                <Link
                  to="/document-manager-app"
                  className="btn-primary-dark px-7 py-4 text-base md:text-lg inline-flex items-center group"
                >
                  Open DocTracker
                  <ArrowRightIcon className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleGetStarted}
                    className="btn-primary-dark px-7 py-4 text-base md:text-lg inline-flex items-center group"
                  >
                    Get Started Free
                    <ArrowRightIcon className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthModalOpen(true);
                    }}
                    className="btn-secondary-dark px-6 py-3 text-base"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>

            {/* trust chips */}
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                "AES‑256 encryption",
                "Expiring links",
                "Viewer verification",
                "No watermark (opt‑in)",
              ].map((b, i) => (
                <span
                  key={i}
                  className="glass-dark rounded-full px-3 py-1 text-sm text-dark-text-secondary border border-white/10"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Floating preview stack */}
          <div className="lg:col-span-5 relative">
            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-400/10 to-transparent blur-2xl" />
              <div className="relative card-glass-dark p-4 rounded-2xl shadow-glow-lg animate-fade-in-scale">
                <div className="grid grid-cols-5 gap-3">
                  {/* tall preview */}
                  <div className="col-span-2 row-span-2 overflow-hidden rounded-xl bg-white/5">
                    <img
                      src="/templates/template01/33592.jpeg"
                      alt="Resume template"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {/* small analytics tiles */}
                  <div className="col-span-3 overflow-hidden rounded-xl glass-dark p-4">
                    <div className="flex items-center gap-2 text-sm text-dark-text-secondary">
                      <EyeIcon className="w-4 h-4 text-emerald-300" /> Views
                      today
                    </div>
                    <div className="mt-2 text-3xl font-semibold">312</div>
                    <div className="mt-2 h-2 rounded bg-white/10">
                      <div className="h-2 w-2/3 rounded bg-gradient-to-r from-emerald-500 to-teal-500 animate-gradient-shift" />
                    </div>
                  </div>
                  <div className="col-span-3 overflow-hidden rounded-xl glass-dark p-4">
                    <div className="text-sm text-dark-text-secondary">
                      Avg. time on page
                    </div>
                    <div className="mt-2 text-3xl font-semibold">2m 18s</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-dark-text-secondary text-center">
                  Live viewer mock • blur demo
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== USE‑CASE SWITCHER ====== */}
      <section className="relative py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8 flex flex-wrap gap-2">
            {useCases.map((u) => (
              <button
                key={u.key}
                onClick={() => setActiveUseCase(u.key)}
                className={`rounded-full px-4 py-2 text-sm border transition-all focus-ring ${
                  activeUseCase === u.key
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-glow-sm"
                    : "glass-dark text-dark-text-secondary hover:text-white"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="card-glass-dark p-6 md:p-8 rounded-2xl">
                <h3 className="text-2xl md:text-3xl font-bold text-dark-text-primary">
                  {active.label}
                </h3>
                <p className="mt-3 text-dark-text-secondary text-lg">
                  {active.blurb}
                </p>
                <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {active.points.map((p, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon className="w-5 h-5 text-emerald-400 mt-0.5" />
                      <span className="text-dark-text-secondary">{p}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="text-xs text-dark-text-muted">
                    Works seamlessly with:
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-emerald-300/90">
                    AI Resume Suite
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-teal-300/90">
                    PDF Editor
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 blur-xl" />
                <div className="relative overflow-hidden rounded-2xl card-glass-dark p-3">
                  <div className="overflow-hidden rounded-xl bg-white">
                    <img
                      src={active.preview.src}
                      alt={active.preview.alt}
                      className="w-full h-80 object-cover"
                    />
                  </div>
                  <div className="mt-3 text-center text-sm text-dark-text-secondary">
                    Sample viewer preview
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FEATURE MOSAIC (staggered, not linear rows) ====== */}
      <section className="py-16 bg-gray-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-dark-text-primary">
              Everything you need to share with confidence
            </h2>
            <p className="text-lg text-dark-text-secondary mt-3 max-w-3xl mx-auto">
              Premium, branded viewing experience with powerful controls and
              analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
            {/* Large analytics card */}
            <div className="lg:col-span-3 sm:col-span-2 card-glass-dark p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-dark-text-primary">
                Engagement Analytics
              </h3>
              <p className="mt-2 text-dark-text-secondary">
                Opens, device, location, page depth & time on page. Instant
                notifications.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  ["Open Rate", "94%"],
                  ["Avg. Time", "2m 18s"],
                  ["Top Page", "Experience"],
                ].map(([k, v], i) => (
                  <div key={i} className="glass-dark rounded-xl p-3">
                    <div className="text-sm text-dark-text-secondary">{k}</div>
                    <div className="text-lg font-semibold text-white">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Secure sharing */}
            <div className="lg:col-span-2 card-glass-dark p-6 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                <ShareIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-dark-text-primary">
                Secure Sharing
              </h3>
              <ul className="mt-3 space-y-2 text-dark-text-secondary">
                {["Passcodes & SSO", "Disable downloads", "Expiring links"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2">
                      <CheckIcon className="w-5 h-5 text-emerald-400" /> {t}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Hub */}
            <div className="lg:col-span-1 card-glass-dark p-6 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                <FolderOpenIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-dark-text-primary">
                Doc Hub
              </h3>
              <p className="mt-2 text-dark-text-secondary">
                All files in one place with blazing search & tags.
              </p>
            </div>

            {/* Security */}
            <div className="lg:col-span-2 card-glass-dark p-6 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                <LockClosedIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-dark-text-primary">
                Enterprise Security
              </h3>
              <p className="mt-2 text-dark-text-secondary">
                Encryption at rest & in transit. Audit trails for every open and
                download.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== ZIG‑ZAG HOW IT WORKS ====== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-dark-text-primary">
              How it works
            </h2>
            <p className="text-lg text-dark-text-secondary mt-3">
              Three steps to share beautifully and know what happens next.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "1. Upload or import",
                desc: "Pull from AI Resume Suite or upload any PDF. Auto‑generate a sleek cover preview.",
              },
              {
                title: "2. Share with control",
                desc: "Choose passcode, expiry, watermark & whether downloads are allowed. Brand your viewer.",
              },
              {
                title: "3. Track engagement",
                desc: "Instant alerts, analytics, and viewer timeline with audit logs.",
              },
            ].map((s, i) => (
              <div key={i} className="relative card-glass-dark p-6 rounded-2xl">
                <div className="absolute -top-3 -left-3 px-3 py-1 rounded-full text-xs bg-emerald-500/20 border border-emerald-400/30">
                  Step {i + 1}
                </div>
                <h3 className="text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-dark-text-secondary">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA (no header/footer, matches global style) ====== */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-emerald-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Start tracking in minutes
          </h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Create a link, share anywhere, and get notified the moment someone
            opens.
          </p>
          <div className="mt-8">
            {!isAuthenticated ? (
              <button
                onClick={handleGetStarted}
                className="bg-white text-emerald-800 px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/90 transition-shadow shadow-lg"
              >
                Create your free account
              </button>
            ) : (
              <Link
                to="/document-manager-app"
                className="bg-white text-indigo-700 px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/90 transition-shadow shadow-lg inline-flex items-center"
              >
                Go to DocTracker
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
