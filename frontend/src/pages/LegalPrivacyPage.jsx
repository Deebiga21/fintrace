import React, { useState } from 'react';
import { Shield, Lock, Copyright, Scale, ArrowRight } from 'lucide-react';

export default function LegalPrivacyPage({ setCurrentPage }) {
  const [activeTab, setActiveTab] = useState('privacy');

  return (
    <div className="bg-[#FFF5F5] text-[#4A4A4A] min-h-screen p-4 sm:p-6 font-['Titillium_Web',sans-serif] select-none -m-6 space-y-6">
      {/* Top HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8C2BB]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#B86B7A] rotate-45 shrink-0" />
          <span className="font-['Krona_One',sans-serif] text-base sm:text-lg text-[#4A4A4A] tracking-widest uppercase">
            GOVERNANCE // LEGAL_&_COMPLIANCE
          </span>
          <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase ml-2">
            REGULATORY POLICIES
          </span>
        </div>

        <div className="flex items-center gap-2 font-['Share_Tech_Mono',monospace] text-xs text-[#6E6264]">
          <span className="text-[#B86B7A] font-bold">STATUS: COMPLIANT</span>
          <span>|</span>
          <span>PMLA / FATF / DPDP 2023</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8C2BB] pb-3">
        {[
          { id: 'privacy', label: 'PRIVACY POLICY', icon: Lock },
          { id: 'terms', label: 'TERMS OF SERVICE', icon: Scale },
          { id: 'copyright', label: 'COPYRIGHT & LICENSING', icon: Copyright },
          { id: 'aml', label: 'AML & REGULATORY COMPLIANCE', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 font-['Rajdhani',sans-serif] text-xs font-bold uppercase tracking-wider transition border ${
                isActive
                  ? 'bg-[#FFFFFF] text-[#171B23] border-[#FFFFFF]'
                  : 'bg-[#FFFFFF] text-[#6E6264] hover:text-[#B86B7A] border-[#E8C2BB] hover:border-[#E2B4BD]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Privacy Policy */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E8C2BB] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-xs font-bold px-2 py-0.5 uppercase tracking-wider">
                SECTION 01
              </span>
              <h3 className="font-['Rajdhani',sans-serif] text-base font-bold text-[#4A4A4A] uppercase tracking-wider">
                FINTRACE AI PRIVACY POLICY & DATA GOVERNANCE (DPDP ACT 2023 / GDPR)
              </h3>
            </div>
            <p className="text-xs text-[#6E6264] leading-relaxed">
              FinTrace AI is committed to upholding the highest standards of data security, confidentiality, and statutory privacy compliance. This policy governs how transaction graphs, account telemetry, customer PII, and forensic artifacts are collected, tokenized, and processed under the Digital Personal Data Protection Act (DPDP 2023) and General Data Protection Regulation (GDPR).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#B86B7A] font-['Rajdhani',sans-serif] uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-[#B86B7A] rotate-45" />
                  PII Hashing & One-Way Anonymization
                </div>
                <p className="text-[11px] text-[#6E6264] font-['Share_Tech_Mono',monospace] leading-relaxed">
                  All customer names, bank account numbers, IFSC routing codes, and national identifiers (Aadhaar / PAN) are cryptographically salted and hashed using SHA-256 before inference. No raw PII is ingested into the Graph Neural Network pipeline.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#B86B7A] font-['Rajdhani',sans-serif] uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-[#B86B7A] rotate-45" />
                  Lawful Processing & Law Enforcement Exemption
                </div>
                <p className="text-[11px] text-[#6E6264] font-['Share_Tech_Mono',monospace] leading-relaxed">
                  Data processing is executed strictly for lawful crime investigation under Section 7 of the DPDP Act 2023 and FATF Recommendation 16, ensuring investigative integrity while safeguarding fundamental privacy rights.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#B86B7A] font-['Rajdhani',sans-serif] uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-[#B86B7A] rotate-45" />
                  Audit Logging & Chain-of-Custody
                </div>
                <p className="text-[11px] text-[#6E6264] font-['Share_Tech_Mono',monospace] leading-relaxed">
                  Every examiner action, case dossier query, evidence export, and risk score re-computation is stamped with an immutable cryptographic SHA-256 hash log stored in the SQLite forensic ledger.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#B86B7A] font-['Rajdhani',sans-serif] uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-[#B86B7A] rotate-45" />
                  Retention Periods & Secure Purging
                </div>
                <p className="text-[11px] text-[#6E6264] font-['Share_Tech_Mono',monospace] leading-relaxed">
                  Inactive investigation graphs and synthetic bench artifacts are retained for 180 days post-resolution, after which zero-overwrite DoD 5220.22-M sanitization is applied.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Terms of Service */}
      {activeTab === 'terms' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E8C2BB] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-xs font-bold px-2 py-0.5 uppercase tracking-wider">
                SECTION 02
              </span>
              <h3 className="font-['Rajdhani',sans-serif] text-base font-bold text-[#4A4A4A] uppercase tracking-wider">
                FINTRACE INVESTIGATOR PLATFORM TERMS OF SERVICE (TOS)
              </h3>
            </div>
            <p className="text-xs text-[#6E6264] leading-relaxed">
              Use of the FinTrace AI platform is restricted to authorized financial intelligence officers, bank compliance analysts, cyber crime investigators, and statutory regulators.
            </p>

            <div className="space-y-3 font-['Share_Tech_Mono',monospace] text-xs">
              <div className="p-3 bg-[#FFF5F5] border border-[#E8C2BB] flex items-start gap-3">
                <span className="text-[#B86B7A] font-bold">1.0</span>
                <div>
                  <div className="text-[#4A4A4A] font-bold font-['Rajdhani',sans-serif] text-xs uppercase">Authorized Institutional Access</div>
                  <div className="text-[#6E6264] text-[11px] mt-0.5">Access is granted strictly via role-based credentials. Sharing tokens, bypassing 2FA, or scraping intelligence is prohibited under IT Act Section 43/66.</div>
                </div>
              </div>

              <div className="p-3 bg-[#FFF5F5] border border-[#E8C2BB] flex items-start gap-3">
                <span className="text-[#B86B7A] font-bold">2.0</span>
                <div>
                  <div className="text-[#4A4A4A] font-bold font-['Rajdhani',sans-serif] text-xs uppercase">Non-Disclosure of Forensic Indicators</div>
                  <div className="text-[#6E6264] text-[11px] mt-0.5">Topological mule ring indicators, smurfing clusters, and confidence scores constitute confidential investigative intel. Unauthorized leak triggers legal prosecution.</div>
                </div>
              </div>

              <div className="p-3 bg-[#FFF5F5] border border-[#E8C2BB] flex items-start gap-3">
                <span className="text-[#B86B7A] font-bold">3.0</span>
                <div>
                  <div className="text-[#4A4A4A] font-bold font-['Rajdhani',sans-serif] text-xs uppercase">AI Advisory Nature & Human-In-The-Loop</div>
                  <div className="text-[#6E6264] text-[11px] mt-0.5">FinTrace AI provides probabilistic risk scores (GraphSAGE GNN + Isolation Forest). Freezing bank accounts requires human officer review and legal authorization.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Copyright & Licensing */}
      {activeTab === 'copyright' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E8C2BB] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-xs font-bold px-2 py-0.5 uppercase tracking-wider">
                SECTION 03
              </span>
              <h3 className="font-['Rajdhani',sans-serif] text-base font-bold text-[#4A4A4A] uppercase tracking-wider">
                COPYRIGHT NOTICE, OPEN SOURCE ATTRIBUTIONS & DESIGN SYSTEM
              </h3>
            </div>

            <div className="p-4 bg-[#FFF5F5] border border-[#E8C2BB] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-bold font-['Rajdhani',sans-serif] uppercase tracking-wider">
                  © 2026 FINTRACE AI SYSTEMS INC. ALL RIGHTS RESERVED.
                </span>
                <span className="text-[10px] bg-[#F7D6D0] text-[#B86B7A] border border-[#E2B4BD] px-2 py-0.5 font-['Share_Tech_Mono',monospace]">
                  PROPRIETARY & PATENT PENDING
                </span>
              </div>
              <p className="text-xs text-[#6E6264] leading-relaxed">
                The FinTrace AI proprietary Graph Neural Network inference engine, multi-hop circular loop detection heuristics, and interactive tactical HUD interface are protected under International Copyright Treaties and Intellectual Property laws.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-['Share_Tech_Mono',monospace] text-[11px]">
              <div className="p-3 bg-[#FFF5F5] border border-[#E8C2BB]">
                <div className="text-[#B86B7A] font-bold uppercase mb-1">HUD Design System</div>
                <div className="text-[#6E6264]">Custom Google Stitch Cyberpunk HUD theme inspired by high-density tactical command architectures.</div>
              </div>
              <div className="p-3 bg-[#FFF5F5] border border-[#E8C2BB]">
                <div className="text-[#B86B7A] font-bold uppercase mb-1">Backend Stack</div>
                <div className="text-[#6E6264]">Rust Axum 0.7 (MIT/Apache 2.0), PyTorch Geometric 2.8, Scikit-Learn 1.9, SQLite3.</div>
              </div>
              <div className="p-3 bg-[#FFF5F5] border border-[#E8C2BB]">
                <div className="text-[#B86B7A] font-bold uppercase mb-1">Frontend Stack</div>
                <div className="text-[#6E6264]">React 19, Vite 8, TailwindCSS, Cytoscape.js, Three.js WebGL, Lucide Icons.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: AML & Compliance */}
      {activeTab === 'aml' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E8C2BB] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-xs font-bold px-2 py-0.5 uppercase tracking-wider">
                SECTION 04
              </span>
              <h3 className="font-['Rajdhani',sans-serif] text-base font-bold text-[#4A4A4A] uppercase tracking-wider">
                ANTI-MONEY LAUNDERING (AML) & STATUTORY FRAMEWORK COMPLIANCE
              </h3>
            </div>
            <p className="text-xs text-[#6E6264] leading-relaxed">
              FinTrace AI implements mandatory behavioral rules and structural graph models aligned with global and national regulatory mandates:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-['Rajdhani',sans-serif] text-xs font-bold text-[#4A4A4A] uppercase tracking-wider">
                    PMLA (2002) Section 12 Mandates
                  </span>
                  <span className="text-[10px] text-[#6E6264] font-['Share_Tech_Mono',monospace]">ACTIVE</span>
                </div>
                <p className="text-[11px] text-[#6E6264] font-['Share_Tech_Mono',monospace] leading-relaxed">
                  Automates identification of Cash/Wire transactions exceeding ₹10,00,000 or series of integrally connected transfers within 30 days to detect deliberate smurfing.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-['Rajdhani',sans-serif] text-xs font-bold text-[#4A4A4A] uppercase tracking-wider">
                    FATF Recommendation 16 (Wire Transfer Rule)
                  </span>
                  <span className="text-[10px] text-[#6E6264] font-['Share_Tech_Mono',monospace]">ACTIVE</span>
                </div>
                <p className="text-[11px] text-[#6E6264] font-['Share_Tech_Mono',monospace] leading-relaxed">
                  Full originator and beneficiary tracing across multi-hop intermediate mule accounts with automatic flag for accounts exhibiting &gt;90% immediate withdrawal turnover.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-['Rajdhani',sans-serif] text-xs font-bold text-[#4A4A4A] uppercase tracking-wider">
                    National Cyber Crime Reporting Portal (1930 / I4C)
                  </span>
                  <span className="text-[10px] text-[#B86B7A] font-['Share_Tech_Mono',monospace]">INTEGRATED</span>
                </div>
                <p className="text-[11px] text-[#6E6264] font-['Share_Tech_Mono',monospace] leading-relaxed">
                  Real-time ingestion of citizen complaint reference numbers, enabling instant money freeze tracing before layering into crypto or cash withdrawals.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-['Rajdhani',sans-serif] text-xs font-bold text-[#4A4A4A] uppercase tracking-wider">
                    RBI Master Direction on KYC & Mule Account Ring Scrutiny
                  </span>
                  <span className="text-[10px] text-[#B86B7A] font-['Share_Tech_Mono',monospace]">COMPLIANT</span>
                </div>
                <p className="text-[11px] text-[#6E6264] font-['Share_Tech_Mono',monospace] leading-relaxed">
                  Detects dormant accounts abruptly reactivated with high-velocity UPI/IMPS transactions and layered fund routing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back to Home CTA */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] hover:bg-[#B86B7A] text-[#171B23] font-['Rajdhani',sans-serif] text-xs font-bold uppercase tracking-wider transition"
        >
          <span>RETURN TO DASHBOARD HUD</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
