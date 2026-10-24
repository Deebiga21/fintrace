import React, { useState } from 'react';
import {
  Network,
  Share2,
  Briefcase,
  Cpu,
  ArrowRight,
  Database,
  Zap,
  AlertTriangle,
  Play,
  Activity,
  ChevronDown,
  Shield,
  Layers,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Workflow,
  Sparkles,
  Star,
  Wrench,
  Globe,
  Radio,
  Lock,
  Search,
  FileCheck2
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import BriarGlobe from '../components/BriarGlobe';
import ThemeToggle from '../components/ThemeToggle';
import AnimatedContent from '../components/AnimatedContent';
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
  const { isDark, toggleTheme } = useTheme();

  // Typology Analyzer State
  const [activeScenario, setActiveScenario] = useState('cbs_freeze');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scenarios = {
    cbs_freeze: {
      id: 'cbs_freeze',
      title: 'Illustrative smurfing aggregator scenario (MULE_AGG_01)',
      targetAccount: 'MULE_AGG_01',
      description: 'Illustrative synthetic scenario: an aggregation account receives multiple transfers and forwards consolidated funds. Use this example to explore the investigation workflow; it is not a real case or verified finding.',
      riskScore: 0.98,
      riskLevel: 'Critical',
      pattern: 'Synthetic rapid-transfer pattern',
      flowNodes: [
        { id: 'VICTIMS', type: 'victim', label: 'Multiple victim accounts', sub: 'Smurfing inflows' },
        { id: 'MULE_AGG_01', type: 'target', label: 'MULE_AGG_01', sub: 'Aggregation account' },
        { id: 'MULE_LAYER_02', type: 'layer', label: 'MULE_LAYER_02', sub: 'Consolidated transfer' },
        { id: 'REVIEW', type: 'cashout', label: 'Review point', sub: 'Illustrative only; no legal action taken' }
      ],
      metrics: {
        inflowHops: 11446,
        outflowHops: 32,
        velocity: '< 18 minutes',
        drainRatio: '99.8%'
      }
    },
    rapid: {
      id: 'rapid',
      title: 'High-Turnover Pass-Through Conduit (DEMO_ACCOUNT_48 • Synthetic Account 48)',
      targetAccount: 'DEMO_ACCOUNT_48',
      description: 'Illustrative synthetic example of a high-turnover account with rapidly dispersed outflows. Values shown are demonstration data, not verified findings.',
      riskScore: 0.92,
      riskLevel: 'High',
      pattern: 'Pass-Through Conduit (>98% Turnover Drain)',
      flowNodes: [
        { id: 'INFLOW_CORP', type: 'victim', label: 'Corporate Diversions', sub: 'Inflow: ₹55.09 Cr' },
        { id: 'DEMO_ACCOUNT_48', type: 'target', label: 'DEMO_ACCOUNT_48 (Synthetic Account 48)', sub: '98.7% Drain Ratio' },
        { id: 'DEMO_ACCOUNT_28', type: 'layer', label: 'DEMO_ACCOUNT_28 (Synthetic Account 28)', sub: 'Layering Conduit' },
        { id: 'DEMO_ACCOUNT_06', type: 'cashout', label: 'DEMO_ACCOUNT_06 (Synthetic Account 06)', sub: 'Zero Residual Exit' }
      ],
      metrics: {
        inflowHops: 820,
        outflowHops: 14,
        velocity: '14 minutes',
        drainRatio: '98.7%'
      }
    },
    closure: {
      id: 'closure',
      title: 'Abrupt Account Closure Syndicate (DEMO_ACCOUNT_02 • Synthetic Account 02)',
      targetAccount: 'DEMO_ACCOUNT_02',
      description: 'Illustrative synthetic example of an account with rapid fund movement before closure. It does not describe a verified account or finding.',
      riskScore: 0.95,
      riskLevel: 'Critical',
      pattern: 'Abrupt Account Closure + Layering Exit',
      flowNodes: [
        { id: 'MULTI_INFLOW', type: 'victim', label: '11,109 Transactions', sub: 'Inflow: ₹10.91 Cr' },
        { id: 'DEMO_ACCOUNT_02', type: 'target', label: 'DEMO_ACCOUNT_02 (Synthetic Account 02)', sub: 'Primary Conduit (Closed)' },
        { id: 'DEMO_ACCOUNT_05', type: 'layer', label: 'DEMO_ACCOUNT_05 (Synthetic Account 05)', sub: 'Layering Conduit' },
        { id: 'OFFSHORE_EXIT', type: 'cashout', label: 'Offshore OTC Exit', sub: 'Cleared Pre-Closure' }
      ],
      metrics: {
        inflowHops: 11109,
        outflowHops: 24,
        velocity: '< 25 minutes',
        drainRatio: '99.5%'
      }
    }
  };

  const currentScenario = scenarios[activeScenario];

  const handleLaunchScenario = (accId) => {
    if (onAccountSelect) onAccountSelect(accId);
    setCurrentPage('money-trail');
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
            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-fintech-text font-sans">
              fintrace
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-fintech-primary shadow-glow-turquoise animate-pulse" />
          </div>

          {/* Center Capsule Pill Navbar */}
          <nav className="hidden md:flex items-center gap-8 px-8 py-2.5 rounded-full glass-pill text-xs font-medium text-fintech-muted shadow-sm">
            <button
              onClick={() => scrollToSection('what-we-do')}
              className="hover:text-fintech-text transition-colors"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection('about-project')}
              className="hover:text-fintech-text transition-colors"
            >
              About
            </button>
            <button
              onClick={() => setCurrentPage('cases')}
              className="hover:text-fintech-text transition-colors"
            >
              Projects
            </button>
            <button
              onClick={() => setCurrentPage('mule-detection')}
              className="hover:text-fintech-text transition-colors"
            >
              GNN Engine
            </button>
            <button
              onClick={() => scrollToSection('contact-footer')}
              className="hover:text-fintech-text transition-colors"
            >
              Contact
            </button>
          </nav>

          {/* Right Action: Pill CTA + Dark/Light Theme Toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" showLabel={false} />
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="group flex items-center gap-2.5 px-6 py-2.5 rounded-full font-bold text-xs transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
              style={{
                backgroundColor: isDark ? '#FFFFFF' : '#0B0B0F',
                color: isDark ? '#0B0B0F' : '#FFFFFF',
              }}
            >
              <span>Let's Chat!</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </header>

        {/* --- 2. Main Hero Typography & Subtitle Area --- */}
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto pt-10 pb-8">
          {/* Big Editorial Headline */}
          <div className="lg:col-span-8 space-y-0 leading-none">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[104px] font-black tracking-tight text-fintech-text block">
              Create,
            </h1>
            <span
              className="font-serif-italic text-6xl sm:text-7xl md:text-8xl lg:text-[116px] font-normal tracking-tight block leading-[0.95]"
              style={{
                color: isDark ? '#FFFFFF' : '#0B0B0F',
                letterSpacing: '-0.03em',
              }}
            >
              Impactful
            </span>
          </div>

          {/* Top-Right Subtitle & Socials Block */}
          <div className="lg:col-span-4 flex flex-col justify-end space-y-4 lg:pl-6 text-right lg:text-left">
            <p className="text-xs sm:text-sm font-normal text-fintech-muted leading-relaxed max-w-sm">
              <strong className="text-fintech-text font-semibold">© We Build Brands, websites</strong> and digital experience with intention, clarity and care
            </p>
            <div className="pt-2 border-t border-fintech-border/80 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-fintech-text tracking-tight">Contact Us</span>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full border border-fintech-border flex items-center justify-center text-[10px] text-fintech-muted hover:text-fintech-text hover:border-fintech-primary transition-colors cursor-pointer">
                  fb
                </span>
                <span className="w-7 h-7 rounded-full border border-fintech-border flex items-center justify-center text-[10px] text-fintech-muted hover:text-fintech-text hover:border-fintech-primary transition-colors cursor-pointer">
                  ig
                </span>
                <span className="w-7 h-7 rounded-full border border-fintech-border flex items-center justify-center text-[10px] text-fintech-muted hover:text-fintech-text hover:border-fintech-primary transition-colors cursor-pointer">
                  tw
                </span>
                <span className="w-7 h-7 rounded-full border border-fintech-border flex items-center justify-center text-[10px] text-fintech-muted hover:text-fintech-text hover:border-fintech-primary transition-colors cursor-pointer">
                  Bē
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
                We do
              </span>
              <p className="text-xs font-normal text-fintech-muted leading-relaxed">
                Brand Identity <span className="text-fintech-border">/</span> UI/UX Design<br />
                Development <span className="text-fintech-border">/</span> Marketing
              </p>
            </div>

            {/* Subtle Client Typography Logos */}
            <div className="flex items-center gap-6 pt-2 text-fintech-muted/70 text-sm font-serif-italic tracking-wide">
              <span className="hover:text-fintech-text transition-colors cursor-default font-semibold">venice.</span>
              <span className="hover:text-fintech-text transition-colors cursor-default font-bold font-sans">cairo</span>
              <span className="hover:text-fintech-text transition-colors cursor-default font-serif italic">italic</span>
            </div>
          </div>

          {/* Bottom Center: Rounded Scroll Indicator */}
          <div className="md:col-span-4 flex items-center justify-center py-2">
            <button
              onClick={() => scrollToSection('what-we-do')}
              className="w-11 h-7 rounded-full border border-fintech-border bg-fintech-card/80 backdrop-blur-md hover:border-fintech-primary flex items-center justify-center text-fintech-muted hover:text-fintech-primary transition-all duration-200"
              title="Scroll to Services"
            >
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>

          {/* Bottom Right: Featured (02) Thumbnail Card */}
          <div className="md:col-span-4 flex justify-end">
            <div
              onClick={() => setCurrentPage('cases')}
              className="group relative cursor-pointer p-2.5 rounded-2xl border border-fintech-border bg-fintech-card/90 hover:border-fintech-primary backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 w-full max-w-xs"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-fintech-text tracking-tight">Featured</span>
                <span className="text-[11px] font-mono text-fintech-muted">(02)</span>
              </div>

              {/* Preview Thumbnail with Floating Badge */}
              <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-fintech-surface border border-fintech-border/50 flex items-center justify-center p-3">
                <div className="w-full h-full flex items-center justify-between gap-2">
                  <div className="w-12 h-16 rounded-md bg-fintech-card border border-fintech-border flex flex-col items-center justify-center p-1 text-[8px] font-mono">
                    <span className="text-[7px] text-fintech-primary">Electric</span>
                    <span className="text-[6px] text-fintech-muted">Future</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 bg-fintech-border rounded w-4/5" />
                    <div className="h-1.5 bg-fintech-border/60 rounded w-2/3" />
                    <div className="h-1.5 bg-fintech-primary/30 rounded w-1/2" />
                  </div>
                </div>

                {/* Black Overlay Badge from Template */}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/90 text-white text-[9px] font-extrabold tracking-wider border border-white/10 uppercase shadow-md">
                  NEW TEMPLATES
                </span>
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
            <Wrench className="w-3.5 h-3.5 text-fintech-primary" />
            <span>Our Services</span>
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
            <Wrench className="w-3.5 h-3.5 text-fintech-primary" />
            <span>Our Services</span>
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
              We craft digital experiences from idea to launch — blending strategy, design, and engineering to build products that performs.
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
            {/* 3D Isometric Illustration: Cluster of 3D Cubes */}
            <div className="pt-4 flex items-center justify-center min-h-[160px]">
              <svg viewBox="0 0 160 140" className="w-32 h-28 transform group-hover:scale-105 transition-transform duration-300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Cube 1 (Center Top) */}
                <path d="M80 20 L108 36 L80 52 L52 36 Z" fill={isDark ? "#A0A5B5" : "#D1D5DB"} />
                <path d="M52 36 L80 52 L80 84 L52 68 Z" fill={isDark ? "#606474" : "#9CA3AF"} />
                <path d="M80 52 L108 36 L108 68 L80 84 Z" fill={isDark ? "#3A3D4A" : "#6B7280"} />

                {/* Cube 2 (Left Bottom) */}
                <path d="M50 48 L78 64 L50 80 L22 64 Z" fill={isDark ? "#7A7E8D" : "#9CA3AF"} opacity="0.85" />
                <path d="M22 64 L50 80 L50 112 L22 96 Z" fill={isDark ? "#484B58" : "#6B7280"} opacity="0.85" />
                <path d="M50 80 L78 64 L78 96 L50 112 Z" fill={isDark ? "#2A2C35" : "#4B5563"} opacity="0.85" />

                {/* Cube 3 (Right Bottom) */}
                <path d="M110 48 L138 64 L110 80 L82 64 Z" fill={isDark ? "#7A7E8D" : "#9CA3AF"} opacity="0.85" />
                <path d="M82 64 L110 80 L110 112 L82 96 Z" fill={isDark ? "#484B58" : "#6B7280"} opacity="0.85" />
                <path d="M110 80 L138 64 L138 96 L110 112 Z" fill={isDark ? "#2A2C35" : "#4B5563"} opacity="0.85" />

                {/* Soft Turquoise Accent Lighting Dot */}
                <circle cx="80" cy="52" r="3" fill="#1FC8DB" className="animate-pulse" />
              </svg>
            </div>

            {/* Text Information */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-fintech-muted">/01</span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight group-hover:text-fintech-primary transition-colors">
                Brand Identity
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed font-normal">
                Create visual identities that align with your voice and make lasting impressions.
              </p>
            </div>
          </div>

          {/* Column /02: UI/UX Design */}
          <div
            onClick={() => setCurrentPage('mule-detection')}
            className="group relative p-8 flex flex-col justify-between space-y-10 hover:bg-fintech-surface/40 transition-all duration-300 cursor-pointer"
          >
            {/* 3D Illustration: Framed Card with Diamond Pin */}
            <div className="pt-4 flex items-center justify-center min-h-[160px]">
              <svg viewBox="0 0 160 140" className="w-32 h-28 transform group-hover:scale-105 transition-transform duration-300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Back Outer Frame */}
                <rect x="36" y="24" width="88" height="92" rx="16" fill={isDark ? "#1C1E27" : "#E5E7EB"} stroke={isDark ? "#383B4B" : "#D1D5DB"} strokeWidth="2" />
                
                {/* Inner Landscape Mountain Silhouette */}
                <path d="M46 96 L70 66 L86 84 L100 68 L114 96 Z" fill={isDark ? "#3D4152" : "#9CA3AF"} />
                
                {/* Floating 3D Badge Pin */}
                <circle cx="108" cy="40" r="18" fill={isDark ? "#262937" : "#D1D5DB"} stroke={isDark ? "#4F5366" : "#9CA3AF"} strokeWidth="2" />
                <rect x="103" y="35" width="10" height="10" rx="2" transform="rotate(45 108 40)" fill={isDark ? "#FFFFFF" : "#0B0B0F"} opacity="0.9" />

                {/* Soft Turquoise Accent */}
                <circle cx="108" cy="40" r="2" fill="#1FC8DB" />
              </svg>
            </div>

            {/* Text Information */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-fintech-muted">/02</span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight group-hover:text-fintech-primary transition-colors">
                UI/UX Design
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed font-normal">
                Focus on user-first interfaces that are both beautiful, intuitive, and purposes.
              </p>
            </div>
          </div>

          {/* Column /03: Web Development */}
          <div
            onClick={() => setCurrentPage('money-trail')}
            className="group relative p-8 flex flex-col justify-between space-y-10 hover:bg-fintech-surface/40 transition-all duration-300 cursor-pointer"
          >
            {/* 3D Illustration: Chrome Browser Window with Network Node Graph */}
            <div className="pt-4 flex items-center justify-center min-h-[160px]">
              <svg viewBox="0 0 160 140" className="w-32 h-28 transform group-hover:scale-105 transition-transform duration-300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Window Chrome Header & Body */}
                <rect x="32" y="28" width="96" height="84" rx="14" fill={isDark ? "#1C1E27" : "#E5E7EB"} stroke={isDark ? "#383B4B" : "#D1D5DB"} strokeWidth="2" />
                <circle cx="44" cy="39" r="3" fill={isDark ? "#52576D" : "#9CA3AF"} />
                <circle cx="53" cy="39" r="3" fill={isDark ? "#52576D" : "#9CA3AF"} />
                <circle cx="62" cy="39" r="3" fill={isDark ? "#52576D" : "#9CA3AF"} />
                
                {/* Central Connected Network Ring */}
                <circle cx="80" cy="74" r="8" fill={isDark ? "#FFFFFF" : "#0B0B0F"} opacity="0.8" />
                <circle cx="60" cy="62" r="5" fill={isDark ? "#82879C" : "#6B7280"} />
                <circle cx="100" cy="62" r="5" fill={isDark ? "#82879C" : "#6B7280"} />
                <circle cx="60" cy="86" r="5" fill={isDark ? "#82879C" : "#6B7280"} />
                <circle cx="100" cy="86" r="5" fill={isDark ? "#82879C" : "#6B7280"} />

                <line x1="80" y1="74" x2="60" y2="62" stroke={isDark ? "#484D63" : "#9CA3AF"} strokeWidth="2" />
                <line x1="80" y1="74" x2="100" y2="62" stroke={isDark ? "#484D63" : "#9CA3AF"} strokeWidth="2" />
                <line x1="80" y1="74" x2="60" y2="86" stroke={isDark ? "#484D63" : "#9CA3AF"} strokeWidth="2" />
                <line x1="80" y1="74" x2="100" y2="86" stroke={isDark ? "#484D63" : "#9CA3AF"} strokeWidth="2" />

                {/* Yellow Accent Focus Node */}
                <circle cx="80" cy="74" r="3" fill="#FFD23F" />
              </svg>
            </div>

            {/* Text Information */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-fintech-muted">/03</span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight group-hover:text-fintech-primary transition-colors">
                Web Development
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed font-normal">
                Develop high-performance websites and apps built to grow with you.
              </p>
            </div>
          </div>

          {/* Column /04: Digital Marketing */}
          <div
            onClick={() => setCurrentPage('cases')}
            className="group relative p-8 flex flex-col justify-between space-y-10 hover:bg-fintech-surface/40 transition-all duration-300 cursor-pointer"
          >
            {/* 3D Illustration: 3D Vertical Bar Chart */}
            <div className="pt-4 flex items-center justify-center min-h-[160px]">
              <svg viewBox="0 0 160 140" className="w-32 h-28 transform group-hover:scale-105 transition-transform duration-300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Base Plate */}
                <rect x="28" y="104" width="104" height="6" rx="3" fill={isDark ? "#282B38" : "#D1D5DB"} />

                {/* Bar 1 */}
                <rect x="36" y="68" width="18" height="36" rx="4" fill={isDark ? "#4F5366" : "#9CA3AF"} />
                {/* Bar 2 (Highest) */}
                <rect x="62" y="32" width="20" height="72" rx="4" fill={isDark ? "#FFFFFF" : "#0B0B0F"} opacity="0.85" />
                {/* Bar 3 */}
                <rect x="90" y="52" width="18" height="52" rx="4" fill={isDark ? "#4F5366" : "#9CA3AF"} />
                {/* Bar 4 */}
                <rect x="116" y="80" width="14" height="24" rx="4" fill={isDark ? "#383C4D" : "#D1D5DB"} />

                {/* Turquoise Top Cap on Main Bar */}
                <rect x="62" y="32" width="20" height="4" rx="2" fill="#1FC8DB" />
              </svg>
            </div>

            {/* Text Information */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-fintech-muted">/04</span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight group-hover:text-fintech-primary transition-colors">
                Digital Marketing
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed font-normal">
                Craft data-driven campaigns that attract, engage, and convert — across channels.
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
              <span className="font-serif-italic font-normal mr-3">Autonomous</span>
              <span>Financial Crime Intelligence</span>
            </h2>
          </div>

          <div className="lg:col-span-5 flex items-center lg:justify-end">
            <p className="text-sm sm:text-base text-fintech-muted font-normal leading-relaxed">
              FinTrace AI is an institutional fraud investigation platform engineered to dismantle organized mule syndicates, money laundering rings, and cybercrime funnels through relational Graph Neural Networks.
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
                Conventional rule-based monitoring and XGBoost classifiers evaluate transactions in isolation. Syndicates exploit this by smurfing transfers below ₹50,000 across hundreds of dormant accounts, evading static detection thresholds.
              </p>
            </div>
            <div className="pt-4 border-t border-fintech-border/60 flex items-center justify-between text-xs font-mono text-fintech-muted">
              <span>Evasion Vulnerability</span>
              <span className="text-fintech-loss font-bold">High in Legacy AML</span>
            </div>
          </div>

          {/* Card 2: The GraphSAGE Solution */}
          <div className="p-8 rounded-3xl border border-fintech-border bg-fintech-card flex flex-col justify-between space-y-6 hover:border-fintech-primary/50 transition-all duration-300 relative overflow-hidden">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-fintech-surface border border-fintech-border flex items-center justify-center text-fintech-primary">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-fintech-primary uppercase tracking-wider block">
                02 • Neural Innovation
              </span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight">
                2-Hop Inductive Graph Neural Networks
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed">
                FinTrace models banking ledgers as directed, dynamic graph topologies. Our 2-layer GraphSAGE architecture aggregates 1-hop and 2-hop neighborhood message-passing to classify aggregator hubs, circular loops, and rapid pass-through conduits with &gt;96% precision.
              </p>
            </div>
            <div className="pt-4 border-t border-fintech-border/60 flex items-center justify-between text-xs font-mono text-fintech-muted">
              <span>Model Accuracy</span>
              <span className="text-fintech-gain font-bold">&gt; 96.5% F1-Score</span>
            </div>
          </div>

          {/* Card 3: Judicial Readiness */}
          <div className="p-8 rounded-3xl border border-fintech-border bg-fintech-card flex flex-col justify-between space-y-6 hover:border-fintech-primary/50 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-fintech-surface border border-fintech-border flex items-center justify-center text-fintech-accent">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-fintech-primary uppercase tracking-wider block">
                03 • Enforcement Ready
              </span>
              <h3 className="text-xl font-bold text-fintech-text tracking-tight">
                SHA-256 Evidentiary Chain-of-Custody
              </h3>
              <p className="text-xs text-fintech-muted leading-relaxed">
                Every detected entity links directly to National Cyber Crime Portal (1930) complaints and bank statements. Case files are compiled into tamper-evident dossiers with cryptographic integrity hashes, ready for statutory bank lien orders and law enforcement escalation.
              </p>
            </div>
            <div className="pt-4 border-t border-fintech-border/60 flex items-center justify-between text-xs font-mono text-fintech-muted">
              <span>Judicial Admissibility</span>
              <span className="text-fintech-primary font-bold">100% Audit Sealed</span>
            </div>
          </div>
        </div>

        {/* Live Project Metrics & Quick-Action Banner */}
        <div className="rounded-3xl border border-fintech-border bg-fintech-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
            <div>
              <span className="text-[11px] font-mono text-fintech-muted uppercase block">Architecture</span>
              <span className="text-lg sm:text-xl font-bold text-fintech-text font-mono mt-0.5 block">GraphSAGE v2</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-fintech-muted uppercase block">Inference Speed</span>
              <span className="text-lg sm:text-xl font-bold text-fintech-gain font-mono mt-0.5 block">&lt; 45ms</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-fintech-muted uppercase block">Ledger Scale</span>
              <span className="text-lg sm:text-xl font-bold text-fintech-primary font-mono mt-0.5 block">100,000+ Txns</span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-fintech-muted uppercase block">Compliance</span>
              <span className="text-lg sm:text-xl font-bold text-fintech-accent font-mono mt-0.5 block">FIU / RBI / 1930</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full btn-accent font-bold text-xs shadow-sm transition transform hover:scale-105 active:scale-95"
            >
              <span>Explore Live Dashboard</span>
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


      {/* =========================================================================
          TYPOLOGY ANALYZER (Interactive Scenario Simulator)
          ========================================================================= */}
      <section id="typology-simulator" className="relative z-20 px-4 sm:px-8 lg:px-14 py-16 max-w-7xl mx-auto space-y-6 bg-fintech-bg">
        <div className="p-6 md:p-8 rounded-3xl border border-fintech-border bg-fintech-card space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-fintech-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-fintech-accent" />
                <span className="font-mono text-xs font-bold text-fintech-accent tracking-wider">
                  TYPOLOGY ANALYZER
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-fintech-text mt-1">
                Analyze Known Financial Crime Typologies
              </h2>
            </div>

            <div className="flex items-center gap-2 p-1 rounded-xl bg-fintech-surface border border-fintech-border">
              <button
                onClick={() => setActiveScenario('cbs_freeze')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                  activeScenario === 'cbs_freeze'
                    ? 'btn-primary shadow-glow-turquoise'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Core Banking Freeze
              </button>
              <button
                onClick={() => setActiveScenario('rapid')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                  activeScenario === 'rapid'
                    ? 'btn-primary shadow-glow-turquoise'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Pass-Through Drain
              </button>
              <button
                onClick={() => setActiveScenario('closure')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                  activeScenario === 'closure'
                    ? 'btn-primary shadow-glow-turquoise'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Abrupt Closure
              </button>
            </div>
          </div>

          {/* Scenario Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-fintech-text font-mono">{currentScenario.title}</h3>
                <RiskBadge level={currentScenario.riskLevel} score={currentScenario.riskScore} />
              </div>
              <p className="text-xs text-fintech-muted leading-relaxed">
                {currentScenario.description}
              </p>

              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                <div className="p-2.5 rounded-xl bg-fintech-surface border border-fintech-border">
                  <span className="text-fintech-muted text-[10px] block">VELOCITY</span>
                  <span className="font-bold text-fintech-accent">{currentScenario.metrics.velocity}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-fintech-surface border border-fintech-border">
                  <span className="text-fintech-muted text-[10px] block">TURNOVER</span>
                  <span className="font-bold text-fintech-accent">{currentScenario.metrics.drainRatio}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-fintech-surface border border-fintech-border">
                  <span className="text-fintech-muted text-[10px] block">FLOW HOPS</span>
                  <span className="font-bold text-fintech-primary">
                    {currentScenario.metrics.inflowHops} in / {currentScenario.metrics.outflowHops} out
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleLaunchScenario(currentScenario.targetAccount)}
                className="w-full py-2.5 btn-primary rounded-xl transition flex items-center justify-center gap-2 text-xs font-bold"
              >
                <Share2 className="w-4 h-4" />
                <span>Trace {currentScenario.targetAccount} Money Trail Live</span>
              </button>
            </div>

            {/* Sequence Diagram Display */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-fintech-surface border border-fintech-border space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-fintech-muted">DISSEMINATION SEQUENCE</span>
                <span className="text-fintech-accent font-bold">{currentScenario.pattern}</span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 font-mono">
                {currentScenario.flowNodes.map((node, i) => (
                  <React.Fragment key={node.id}>
                    <div className="flex-1 flex flex-col items-center text-center p-3 rounded-xl bg-fintech-card border border-fintech-border">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border mb-2 ${
                        node.type === 'victim'
                          ? 'bg-fintech-surface text-fintech-gain border-fintech-gain/40'
                          : node.type === 'target'
                          ? 'bg-fintech-surface text-fintech-loss border-fintech-loss/50 animate-pulse'
                          : node.type === 'layer'
                          ? 'bg-fintech-surface text-fintech-accent border-fintech-accent/40'
                          : 'bg-fintech-surface text-fintech-text border-fintech-border'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-bold text-fintech-text truncate w-full">
                        {node.label}
                      </span>
                      <span className="text-[10px] text-fintech-muted truncate w-full mt-0.5">
                        {node.sub}
                      </span>
                    </div>
                    {i < currentScenario.flowNodes.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-fintech-muted shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


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
                Real-Time Topological Syndicate Visualizer
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

          <div className="h-[420px] rounded-2xl overflow-hidden border border-fintech-border bg-fintech-surface relative">
            <GlobeErrorBoundary>
              <BriarGlobe onAccountSelect={onAccountSelect} setCurrentPage={setCurrentPage} />
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
            <span className="text-fintech-muted ml-2">© 2026 FinTrace Intelligence Platform. All rights reserved.</span>
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
