import React from 'react';
import {
  Network,
  Briefcase,
  Cpu,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  Shield,
  ArrowUpRight,
  Star,
  Globe
} from 'lucide-react';
import BriarGlobe from '../components/BriarGlobe';
import DitherVeil from '../components/DitherVeil';
import ElectricLogo from '../components/ElectricLogo';
import InvestigationFlowAnimation from '../components/InvestigationFlowAnimation';
import { useTheme } from '../context/ThemeContext';

class GlobeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn("GlobeErrorBoundary caught error:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center font-mono">
          <div className="w-12 h-12 rounded-xl bg-fintech-primary/20 text-fintech-primary flex items-center justify-center mb-3">
            <Network className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-fintech-text text-sm font-bold">3D Relational Topology</span>
          <span className="text-fintech-muted text-xs mt-1">WebGL Network Stream Active</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LandingPage({
  setCurrentPage,
  onAccountSelect,
  onOpenCreateCase,
  onOpenLivePipeline,
  refreshTrigger
}) {
  const { isDark } = useTheme();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };


  return (
    <div className="min-h-screen w-full bg-fintech-bg text-fintech-text relative overflow-x-hidden transition-colors duration-200">

      {/* =========================================================================
          HERO SECTION (Strictly based on Template Screenshot 1)
          ========================================================================= */}
      <section className="relative min-h-screen flex flex-col justify-between overflow-hidden px-4 sm:px-8 lg:px-14 pt-6 pb-10 bg-fintech-bg">

        {/* 3D Model Background: Monochrome Chrome Sculpture + Radial Mask */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none bg-fintech-bg" aria-hidden="true">
          
          {/* Central 3D Video & Poster in Pure Monochrome Metallic Chrome */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <video
              autoPlay
              loop
              muted
              playsInline
              poster="/creation_of_adam_hand.png"
              className="w-full h-full object-cover transition-opacity duration-700 pointer-events-none select-none"
              style={{
                opacity: isDark ? 0.42 : 0.15,
                mixBlendMode: isDark ? 'screen' : 'multiply',
                filter: isDark
                  ? 'grayscale(100%) contrast(180%) brightness(78%)'
                  : 'grayscale(100%) contrast(140%) brightness(105%)',
                maskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, black 20%, transparent 80%)',
                WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, black 20%, transparent 80%)',
                transform: 'scale(1.08) translateY(2%)',
              }}
            >
              <source src="/the_creation_of_adam-recording.mp4" type="video/mp4" />
            </video>
          </div>

          {/* 3D Topological Wireframe Wave Grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
            <path d="M-100 620 C200 480 400 700 720 540 C1040 380 1200 640 1540 500" stroke={isDark ? "#1FC8DB" : "#0E9FB3"} strokeWidth="1" strokeDasharray="4 4" opacity="0.35" />
            <path d="M-100 660 C200 520 400 740 720 580 C1040 420 1200 680 1540 540" stroke={isDark ? "#1FC8DB" : "#0E9FB3"} strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
            <path d="M-100 700 C200 560 400 780 720 620 C1040 460 1200 720 1540 580" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.12" />
            <path d="M-100 740 C200 600 400 820 720 660 C1040 500 1200 760 1540 620" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.08" />
          </svg>

          {/* Smooth Radial Vignette Mask */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at 50% 50%, rgba(11, 11, 15, 0.2) 0%, rgba(11, 11, 15, 0.75) 60%, #0B0B0F 95%)'
                : 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.3) 0%, rgba(245, 247, 250, 0.8) 60%, #FFFFFF 95%)',
            }}
          />

          {/* Soft Turquoise Ambient Center Glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[340px] rounded-full blur-[140px] pointer-events-none"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(31, 200, 219, 0.12) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(14, 159, 179, 0.08) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* --- 1. Top Navigation Bar (Template Pill Layout) --- */}
        <header className="relative z-30 w-full flex items-center justify-between gap-4 pt-2">
          {/* Logo with Turquoise Dot */}
          <div
            className="flex items-center gap-1.5 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ElectricLogo
              src="/logo.svg"
              color="#ecc7ff"
              glowColor="#000000"
              scale={0.7}
              strands={4}
              bend={0.6}
              crackle={1.5}
              arcs={1}
              speed={2.5}
              interactive
            />
          </div>

          {/* Center Capsule Pill Navbar */}
          <nav className="hidden md:flex items-center gap-8 px-8 py-2.5 rounded-full glass-pill text-xs font-medium text-fintech-muted shadow-sm">
            <button
              onClick={() => setCurrentPage('transactions')}
              className="hover:text-fintech-text transition-colors"
            >
              Transactions
            </button>
            <button
              onClick={() => setCurrentPage('graph')}
              className="hover:text-fintech-text transition-colors"
            >
              Network
            </button>
            <button
              onClick={() => setCurrentPage('mule-detection')}
              className="hover:text-fintech-text transition-colors"
            >
              Model Review
            </button>
            <button
              onClick={() => setCurrentPage('money-trail')}
              className="hover:text-fintech-text transition-colors"
            >
              Money Trails
            </button>
            <button
              onClick={() => setCurrentPage('cases')}
              className="hover:text-fintech-text transition-colors"
            >
              Cases
            </button>
          </nav>

          {/* Right Action: Pill CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="group flex items-center gap-2.5 px-6 py-2.5 rounded-full font-bold text-xs transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
              style={{
                backgroundColor: isDark ? '#FFFFFF' : '#0B0B0F',
                color: isDark ? '#0B0B0F' : '#FFFFFF',
              }}
            >
              <span>Open Investigation Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </header>

        {/* --- 2. Main Hero Typography & Subtitle Area --- */}
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto pt-10 pb-8">
          {/* Big Editorial Headline */}
          <div className="lg:col-span-8 space-y-0 leading-none">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[104px] font-black tracking-tight text-fintech-text block">
              Trace,
            </h1>
            <span
              className="font-serif-italic text-6xl sm:text-7xl md:text-8xl lg:text-[116px] font-normal tracking-tight block leading-[0.95]"
              style={{
                color: isDark ? '#FFFFFF' : '#0B0B0F',
                letterSpacing: '-0.03em',
              }}
            >
              Suspicious Flows
            </span>
          </div>

          {/* Top-Right Subtitle & Socials Block */}
          <div className="lg:col-span-4 flex flex-col justify-end space-y-4 lg:pl-6 text-right lg:text-left">
            <p className="text-xs sm:text-sm font-normal text-fintech-muted leading-relaxed max-w-sm">
              <strong className="text-fintech-text font-semibold">Financial investigation workspace:</strong> Review transaction activity, explore account connections, inspect anomaly signals, and manage investigation cases in one prototype.
            </p>
            <div className="pt-2 border-t border-fintech-border/80 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-fintech-text tracking-tight">Project tools</span>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full border border-fintech-border flex items-center justify-center text-[10px] text-fintech-muted hover:text-fintech-text hover:border-fintech-primary transition-colors cursor-pointer">
                  TXN
                </span>
                <span className="w-7 h-7 rounded-full border border-fintech-border flex items-center justify-center text-[10px] text-fintech-muted hover:text-fintech-text hover:border-fintech-primary transition-colors cursor-pointer">
                  ML
                </span>
                <span className="w-7 h-7 rounded-full border border-fintech-border flex items-center justify-center text-[10px] text-fintech-muted hover:text-fintech-text hover:border-fintech-primary transition-colors cursor-pointer">
                  API
                </span>
                <span className="w-7 h-7 rounded-full border border-fintech-border flex items-center justify-center text-[10px] text-fintech-muted hover:text-fintech-text hover:border-fintech-primary transition-colors cursor-pointer">
                  CASE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. Bottom Hero Grid: We Do + Client Marks + Scroll Arrow + Featured Card --- */}
        <div className="relative z-20 pt-8 border-t border-fintech-border/40 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

          {/* Bottom Left: "We do" */}
          <div className="md:col-span-4 space-y-3">
            <div>
              <span className="text-xs font-bold text-fintech-text uppercase tracking-wider block mb-1">
                What you can explore
              </span>
              <p className="text-xs font-normal text-fintech-muted leading-relaxed">
                Transaction network <span className="text-fintech-border">/</span> Anomaly signals<br />
                Money trail exploration <span className="text-fintech-border">/</span> Case records
              </p>
            </div>

            {/* Subtle Client Typography Logos */}
            <div className="flex items-center gap-4 pt-2 text-fintech-muted/80 text-xs font-mono tracking-wider">
              <span className="hover:text-fintech-primary transition-colors cursor-default font-bold">DEMO DATA</span>
              <span className="text-fintech-border">•</span>
              <span className="hover:text-fintech-primary transition-colors cursor-default font-bold">ANALYST REVIEW</span>
              <span className="text-fintech-border">•</span>
              <span className="hover:text-fintech-primary transition-colors cursor-default font-bold">MODEL SIGNALS</span>
              <span className="text-fintech-border">•</span>
              <span className="hover:text-fintech-primary transition-colors cursor-default font-bold">CASE WORKFLOW</span>
            </div>
          </div>

          {/* Bottom Center: Rounded Scroll Indicator */}
          <div className="md:col-span-4 flex items-center justify-center py-2">
            <button
              onClick={() => scrollToSection('what-we-do')}
              className="w-11 h-7 rounded-full border border-fintech-border bg-fintech-card/80 backdrop-blur-md hover:border-fintech-primary flex items-center justify-center text-fintech-muted hover:text-fintech-primary transition-all duration-200"
              title="Explore FinTrace capabilities"
            >
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>

          {/* Bottom Right: Featured (02) Thumbnail Card */}
          <div className="md:col-span-4 flex justify-end">
            <div
              className="group relative p-2.5 rounded-2xl border border-fintech-border bg-fintech-card/90 hover:border-fintech-primary backdrop-blur-xl shadow-lg transition-all duration-300 w-full max-w-xs"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-fintech-text tracking-tight">Transaction network preview</span>
                <span className="text-[11px] font-mono text-fintech-muted">DEMO</span>
              </div>

              <div className="relative h-[208px] rounded-xl overflow-hidden border border-fintech-border/50 bg-[#101117]">
                <DitherVeil
                  src="/images/landing/transaction-network.svg"
                  fit="cover"
                  pattern="floyd"
                  pixelSize={3}
                  levels={3}
                  palette="duotone"
                  inkColor="#101117"
                  paperColor="#DDECF0"
                  rimColor="#24C7D8"
                  rim={0.16}
                  revealRadius={120}
                  softness={0.6}
                  linger={1.2}
                  clickBurst
                  className="absolute inset-0"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[#101117] via-[#101117]/85 to-transparent px-3 pb-2 pt-7 text-[9px] font-mono text-white/80">
                  <span>ACCOUNT NETWORK</span>
                  <span>SYNTHETIC DEMO DATA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- 4. Bottom Centered Service Tag (Capsule Pill from Template) --- */}
        <div className="relative z-20 flex justify-center pt-8">
          <button
            onClick={() => scrollToSection('what-we-do')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-fintech-border bg-fintech-card/90 hover:border-fintech-primary text-xs font-semibold text-fintech-text transition-all duration-200 shadow-sm"
          >
            <Shield className="w-3.5 h-3.5 text-fintech-primary" />
            <span>Explore FinTrace</span>
          </button>
        </div>
      </section>


      {/* =========================================================================
          "WHAT WE DO" SECTION (Strictly based on Template Screenshot 2)
          ========================================================================= */}
      <section id="what-we-do" className="relative z-20 px-4 sm:px-8 lg:px-14 py-20 border-t border-fintech-border/60 bg-fintech-bg">
        
        {/* Top Centered Pill Badge */}
        <div className="flex justify-start mb-6">
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-fintech-border bg-fintech-card text-xs font-semibold text-fintech-text shadow-sm">
            <Shield className="w-3.5 h-3.5 text-fintech-primary" />
            <span>FinTrace capabilities</span>
          </span>
        </div>

        {/* Section Heading Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-14">
          <div className="lg:col-span-6">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl tracking-tight text-fintech-text font-black">
              <span className="font-serif-italic font-normal mr-3">What</span>
              <span>We Do</span>
            </h2>
          </div>

          <div className="lg:col-span-6 flex items-center lg:justify-end">
            <p className="text-sm sm:text-base text-fintech-muted font-normal leading-relaxed max-w-xl">
              Explore transaction records, follow connected accounts through a network view, review anomaly model output, and organize findings in investigation cases. Demo records are synthetic; analysts must verify every signal.
            </p>
          </div>
        </div>

        {/* 4-Column Showcase Container Card (Exact Screenshot 2 structure) */}
        <div className="rounded-3xl border border-fintech-border bg-fintech-card overflow-hidden shadow-card-dark grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-fintech-border">

          {/* Column /01: Brand Identity */}
          <div
            onClick={() => setCurrentPage('graph')}
            className="group relative p-8 flex flex-col justify-between space-y-10 hover:bg-fintech-surface/40 transition-all duration-300 cursor-pointer"
          >
            {/* FinTrace transaction network illustration */}
            <div className="pt-2 flex items-center justify-center min-h-[190px]">
              <img src="/images/landing/transaction-network.svg" alt="Illustration of connected financial accounts in a transaction network" className="w-full h-[190px] rounded-2xl object-cover border border-fintech-border/50 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>

            {/* Text Information */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-fintech-muted">/01</span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight group-hover:text-fintech-primary transition-colors">
                Graph Topology Analysis
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed font-normal">
                Construct directed transaction graphs from raw banking ledgers to uncover hidden mule aggregator hubs and smurfing structures.
              </p>
            </div>
          </div>

          {/* Column /02: Anomaly review */}
          <div
            onClick={() => setCurrentPage('mule-detection')}
            className="group relative p-8 flex flex-col justify-between space-y-10 hover:bg-fintech-surface/40 transition-all duration-300 cursor-pointer"
          >
            {/* Isolation Forest model signal illustration */}
            <div className="pt-2 flex items-center justify-center min-h-[190px]">
              <img src="/images/landing/anomaly-review.svg" alt="Illustration of transaction anomaly analysis with an outlier marked for review" className="w-full h-[190px] rounded-2xl object-cover border border-fintech-border/50 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>

            {/* Text Information */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-fintech-muted">/02</span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight group-hover:text-fintech-primary transition-colors">
                Mule Account Detection
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed font-normal">
                Review anomaly scores produced by the prototype model alongside transaction patterns. A score is a prompt for analyst review, not proof of suspicious activity.
              </p>
            </div>
          </div>

          {/* Column /03: Transaction tracing */}
          <div
            onClick={() => setCurrentPage('money-trail')}
            className="group relative p-8 flex flex-col justify-between space-y-10 hover:bg-fintech-surface/40 transition-all duration-300 cursor-pointer"
          >
            {/* Transaction trail illustration */}
            <div className="pt-2 flex items-center justify-center min-h-[190px]">
              <img src="/images/landing/transaction-trail.svg" alt="Illustration of money moving from a source account through a demo account to another account" className="w-full h-[190px] rounded-2xl object-cover border border-fintech-border/50 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>

            {/* Text Information */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-fintech-muted">/03</span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight group-hover:text-fintech-primary transition-colors">
                Account & Transaction Trails
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed font-normal">
                Follow linked transactions and account relationships across available records to understand how funds move through the network.
              </p>
            </div>
          </div>

          {/* Column /04: Case management */}
          <div
            onClick={() => setCurrentPage('cases')}
            className="group relative p-8 flex flex-col justify-between space-y-10 hover:bg-fintech-surface/40 transition-all duration-300 cursor-pointer"
          >
            {/* Investigation case record illustration */}
            <div className="pt-2 flex items-center justify-center min-h-[190px]">
              <img src="/images/landing/case-records.svg" alt="Illustration of an investigation case record with notes and analyst review" className="w-full h-[190px] rounded-2xl object-cover border border-fintech-border/50 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>

            {/* Text Information */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-fintech-muted">/04</span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight group-hover:text-fintech-primary transition-colors">
                Investigation Case Records
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed font-normal">
                Create and update case records, capture investigative findings, and link relevant accounts or evidence references for follow-up.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Centered Transition Pill (About Us from Screenshot 2) */}
        <div className="flex justify-center pt-12">
          <button
            onClick={() => scrollToSection('about-project')}
            className="flex items-center gap-2 px-5 py-2 rounded-full border border-fintech-border bg-fintech-card hover:border-fintech-primary text-xs font-semibold text-fintech-text transition-all duration-200 shadow-sm"
          >
            <Star className="w-3.5 h-3.5 text-fintech-accent" />
            <span>About The Project</span>
          </button>
        </div>
      </section>


      {/* =========================================================================
          ABOUT THE PROJECT (Architecture, Mission, & Neural Intelligence)
          Replacing the old Interactive Processing Lifecycle Stepper as requested
          ========================================================================= */}
      <section id="about-project" className="relative z-20 px-4 sm:px-8 lg:px-14 py-20 max-w-7xl mx-auto space-y-12 bg-fintech-bg border-t border-fintech-border/60">
        
        {/* Top Centered Pill Badge */}
        <div className="flex justify-start">
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-fintech-border bg-fintech-card text-xs font-semibold text-fintech-text shadow-sm">
            <Star className="w-3.5 h-3.5 text-fintech-accent" />
            <span>About The Project</span>
          </span>
        </div>

        {/* Section Heading Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl tracking-tight text-fintech-text font-black leading-tight">
              <span className="font-serif-italic font-normal mr-3">Financial</span>
              <span>Transaction Investigation</span>
            </h2>
          </div>

          <div className="lg:col-span-5 flex items-center lg:justify-end">
            <p className="text-sm sm:text-base text-fintech-muted font-normal leading-relaxed">
              FinTrace is a prototype investigation workspace for exploring financial transaction data. It brings account search, transaction trails, network visualization, anomaly model signals, and case management together for analyst review.
            </p>
          </div>
        </div>

        {/* 3 Core Architecture Pillars (Sleek Container matching template) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: The Challenge */}
          <div className="p-8 rounded-3xl border border-fintech-border bg-fintech-card flex flex-col justify-between space-y-6 hover:border-fintech-primary/50 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-fintech-surface border border-fintech-border flex items-center justify-center text-fintech-accent">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-fintech-primary uppercase tracking-wider block">
                01 • The Problem
              </span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight">
                Tabular AML Is Blind to Network Topologies
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed">
                Reviewing transactions one at a time can make relationships across accounts difficult to see. FinTrace lets users inspect linked activity and investigate patterns across the available dataset.
              </p>
            </div>
            <div className="pt-4 border-t border-fintech-border/60 flex items-center justify-between text-xs font-mono text-fintech-muted">
                <span>Investigation challenge</span>
              <span className="text-fintech-loss font-bold">Hidden account links</span>
            </div>
          </div>

              {/* Card 2: Anomaly model review */}
          <div className="p-8 rounded-3xl border border-fintech-border bg-fintech-card flex flex-col justify-between space-y-6 hover:border-fintech-primary/50 transition-all duration-300 relative overflow-hidden">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-fintech-surface border border-fintech-border flex items-center justify-center text-fintech-primary">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-fintech-primary uppercase tracking-wider block">
                02 • Model Signals
              </span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight">
                Isolation Forest Anomaly Review
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed">
                The prototype applies an Isolation Forest model to transaction features and surfaces unusual records for review. Network views provide relationship context; model output should be checked against source records.
              </p>
            </div>
            <div className="pt-4 border-t border-fintech-border/60 flex items-center justify-between text-xs font-mono text-fintech-muted">
              <span>Model role</span>
              <span className="text-fintech-gain font-bold">Decision support</span>
            </div>
          </div>

          {/* Card 3: Case documentation */}
          <div className="p-8 rounded-3xl border border-fintech-border bg-fintech-card flex flex-col justify-between space-y-6 hover:border-fintech-primary/50 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-fintech-surface border border-fintech-border flex items-center justify-center text-fintech-accent">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-fintech-primary uppercase tracking-wider block">
                03 • Investigation Records
              </span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight">
                Case Notes & Evidence References
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed">
                Keep the case stage, priority, subject accounts, findings, and attached evidence references together. The prototype does not file complaints, issue freezes, or certify legal admissibility.
              </p>
            </div>
            <div className="pt-4 border-t border-fintech-border/60 flex items-center justify-between text-xs font-mono text-fintech-muted">
              <span>Case status</span>
              <span className="text-fintech-primary font-bold">Analyst maintained</span>
            </div>
          </div>
        </div>

        {/* Live Project Metrics & Quick-Action Banner */}
        <div className="rounded-3xl border border-fintech-border bg-fintech-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
            <div>
              <span className="text-[11px] font-mono text-fintech-muted uppercase block">Architecture</span>
              <span className="text-lg sm:text-xl font-bold text-fintech-text font-mono mt-0.5 block">Isolation Forest</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-fintech-muted uppercase block">Analysis mode</span>
              <span className="text-lg sm:text-xl font-bold text-fintech-gain font-mono mt-0.5 block">On available data</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-fintech-muted uppercase block">Investigation tools</span>
              <span className="text-lg sm:text-xl font-bold text-fintech-primary font-mono mt-0.5 block">Search · Trace · Cases</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-fintech-muted uppercase block">Data notice</span>
              <span className="text-lg sm:text-xl font-bold text-fintech-accent font-mono mt-0.5 block">Demo data may be synthetic</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full btn-accent font-bold text-xs shadow-sm transition transform hover:scale-105 active:scale-95"
            >
              <span>Open Investigation Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage('graph')}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-fintech-border hover:border-fintech-primary bg-fintech-surface font-semibold text-xs text-fintech-text transition"
            >
              <Network className="w-3.5 h-3.5 text-fintech-primary" />
              <span>Inspect Graph Topology</span>
            </button>
          </div>
        </div>

      </section>


      <InvestigationFlowAnimation />

      {/* =========================================================================
          3D SPATIAL RELATIONAL GRAPH CANVAS (BriarGlobe)
          ========================================================================= */}
      <section id="topology-3d" className="relative z-20 px-4 sm:px-8 lg:px-14 py-16 max-w-7xl mx-auto space-y-6 bg-fintech-bg">
        <div className="p-6 md:p-8 rounded-3xl border border-fintech-border bg-fintech-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-fintech-primary font-bold tracking-wider">
                <Globe className="w-4 h-4 text-fintech-primary" />
                <span>3D SPATIAL RELATIONAL CANVAS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-fintech-text mt-1">
                Transaction Account Network
              </h2>
            </div>
            <button
              onClick={() => setCurrentPage('graph')}
              className="flex items-center gap-2 px-5 py-2 rounded-full border border-fintech-border hover:border-fintech-primary text-xs font-bold text-fintech-text transition"
            >
              <span>Full Interactive Graph</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[420px] rounded-2xl overflow-hidden border border-slate-200 bg-white relative">
            <GlobeErrorBoundary>
              <BriarGlobe
                onAccountSelect={onAccountSelect}
                setCurrentPage={setCurrentPage}
                background="#FFFFFF"
                textColor="#164E63"
                lines={{ color: "#0E7490", accent: "#B7791F", opacity: 5.5, thickness: 0.8, depth: 8 }}
                hover={{ pill: "rgba(255,255,255,0.96)", glow: "#0E7490" }}
              />
            </GlobeErrorBoundary>
          </div>
        </div>
      </section>


      {/* =========================================================================
          FOOTER / CONTACT (Clean & Aligned with Theme Palette)
          ========================================================================= */}
      <footer id="contact-footer" className="relative z-20 border-t border-fintech-border bg-fintech-card px-6 lg:px-14 py-10 text-xs text-fintech-muted">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-fintech-text tracking-tighter">fintrace</span>
            <span className="w-2 h-2 rounded-full bg-fintech-primary" />
              <span className="text-fintech-muted ml-2">© 2026 FinTrace prototype · Investigation support for financial transaction data</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentPage('dashboard')} className="hover:text-fintech-text transition-colors">
              Dashboard
            </button>
            <button onClick={() => setCurrentPage('cases')} className="hover:text-fintech-text transition-colors">
              Cases Docket
            </button>
            <button onClick={() => setCurrentPage('pipeline')} className="hover:text-fintech-text transition-colors">
              System Pipeline
            </button>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-fintech-primary transition-colors flex items-center gap-1 font-mono">
              <span>Back to Top</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}