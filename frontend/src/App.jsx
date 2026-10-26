import React, { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import CreateCaseModal from './components/CreateCaseModal';
import LivePipelineExecutionModal from './components/LivePipelineExecutionModal';
import SiteBackground from './components/SiteBackground';

// Pages
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import TransactionsPage from './pages/TransactionsPage';
import MuleDetectionPage from './pages/MuleDetectionPage';
import GraphInvestigationPage from './pages/GraphInvestigationPage';
import MoneyTrailPage from './pages/MoneyTrailPage';
import ComplaintsPage from './pages/ComplaintsPage';
import CasesPage from './pages/CasesPage';
import CaseDetailsPage from './pages/CaseDetailsPage';
import AnalyticsReportsPage from './pages/AnalyticsReportsPage';
import SettingsModelPage from './pages/SettingsModelPage';
import SystemPipelinePage from './pages/SystemPipelinePage';
import LegalPrivacyPage from './pages/LegalPrivacyPage';
import { wsService } from './services/websocket';

// Design-system approval gate. Dev-only: never shipped to the judge build.
const ThemePreviewPage = import.meta.env.DEV
  ? lazy(() => import('./pages/ThemePreviewPage'))
  : null;

export default function App() {
  // Support direct URL hash deep linking e.g. #case-details?id=CASE-2026-001 or #cases
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('case-details')) return 'case-details';
    if (hash.startsWith('cases')) return 'cases';
    return hash ? hash.split('?')[0] : 'landing';
  });

  const [selectedAccount, setSelectedAccount] = useState('MULE_AGG_01');

  const [selectedCaseId, setSelectedCaseId] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.includes('id=')) {
      const match = hash.match(/id=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return null;
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLivePipelineOpen, setIsLivePipelineOpen] = useState(false);

  // Subscribe to real-time WebSockets
  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg && msg.event && msg.event.startsWith('case.')) {
        console.log('[FinTrace App] Real-time case event received:', msg.event, msg.case_id);
        setRefreshTrigger((prev) => prev + 1);
      }
    });
    return () => unsubscribe();
  }, [currentPage]);

  // Sync window hash for direct bookmarking, reload, and browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('case-details')) {
        setCurrentPage('case-details');
        const match = hash.match(/id=([^&]+)/);
        if (match) {
          setSelectedCaseId(decodeURIComponent(match[1]));
        }
      } else if (hash.startsWith('cases')) {
        setCurrentPage('cases');
      } else if (hash) {
        setCurrentPage(hash.split('?')[0]);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync window hash for direct bookmarking and reload
  useEffect(() => {
    if (currentPage === 'case-details' && selectedCaseId) {
      window.location.hash = `#case-details?id=${encodeURIComponent(selectedCaseId)}`;
    } else if (currentPage !== 'landing') {
      window.location.hash = `#${currentPage}`;
    }
  }, [currentPage, selectedCaseId]);

  // Global Create Case Modal
  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [createCaseData, setCreateCaseData] = useState({});

  const handleOpenCreateCase = (data = {}) => {
    setCreateCaseData(data);
    setIsCreateCaseOpen(true);
  };

  const handleCaseCreated = (newCase) => {
    const newId = newCase.case_id || newCase.case_number;
    setSelectedCaseId(newId);
    setRefreshTrigger((prev) => prev + 1);
    setCurrentPage('case-details');
  };

  const handleAccountSelect = (accountId) => {
    setSelectedAccount(accountId);
  };

  // A modal belongs to the screen that opened it. Without this, navigating
  // while a dialog is open leaves it floating over the next page.
  useEffect(() => {
    setIsCreateCaseOpen(false);
    setIsLivePipelineOpen(false);
  }, [currentPage]);

  // Standalone Full-Screen Landing Showcase (Integrated Dashboard-First Experience)
  if (currentPage === 'landing') {
    return (
      <div className="relative bg-fintech-bg text-fintech-text">
        <LandingPage
          setCurrentPage={setCurrentPage}
          onAccountSelect={handleAccountSelect}
          onOpenCreateCase={handleOpenCreateCase}
          refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
        />
        <CreateCaseModal
          isOpen={isCreateCaseOpen}
          onClose={() => setIsCreateCaseOpen(false)}
          initialData={createCaseData}
          onCaseCreated={handleCaseCreated}
      />
      <LivePipelineExecutionModal
        isOpen={isLivePipelineOpen}
        onClose={() => setIsLivePipelineOpen(false)}
        setCurrentPage={setCurrentPage}
        setRefreshTrigger={setRefreshTrigger}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-canvas text-ink overflow-hidden font-sans relative">
      <SiteBackground />
            {/* Consistent Navigation Sidebar */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        selectedAccount={selectedAccount}
        selectedCaseId={selectedCaseId}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentPage={currentPage}
          onSearch={(query) => {
            if (query) {
              setSelectedAccount(query.toUpperCase());
            }
          }}
          onAccountSelect={handleAccountSelect}
          refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
          setRefreshTrigger={setRefreshTrigger}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-transparent relative z-10">
          {currentPage === 'landing' && (
            <LandingPage
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
            />
          )}

          {currentPage === 'pipeline' && (
            <SystemPipelinePage
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
              setSelectedCaseId={setSelectedCaseId}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
              setRefreshTrigger={setRefreshTrigger}
            />
          )}

          {currentPage === 'dashboard' && (
            <DashboardPage
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'upload' && (
            <UploadPage
              setCurrentPage={setCurrentPage}
              setRefreshTrigger={setRefreshTrigger}
            />
          )}

          {currentPage === 'transactions' && (
            <TransactionsPage
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'mule-detection' && (
            <MuleDetectionPage
              setCurrentPage={setCurrentPage}
              selectedAccount={selectedAccount}
              onAccountSelect={handleAccountSelect}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'graph' && (
            <GraphInvestigationPage
              setCurrentPage={setCurrentPage}
              selectedAccount={selectedAccount}
              onAccountSelect={handleAccountSelect}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'money-trail' && (
            <MoneyTrailPage
              selectedAccount={selectedAccount}
              onAccountSelect={handleAccountSelect}
              setCurrentPage={setCurrentPage}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'complaints' && (
            <ComplaintsPage
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'cases' && (
            <CasesPage
              setCurrentPage={setCurrentPage}
              setSelectedCaseId={setSelectedCaseId}
              selectedCaseId={selectedCaseId}
              onOpenCreateCase={handleOpenCreateCase}
              onAccountSelect={handleAccountSelect}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'case-details' && (
            <CaseDetailsPage
              caseId={selectedCaseId}
              setSelectedCaseId={setSelectedCaseId}
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'analytics-reports' && (
            <AnalyticsReportsPage
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
            />
          )}

          {currentPage === 'settings-model' && (
            <SettingsModelPage
              refreshTrigger={refreshTrigger}
          onOpenLivePipeline={() => setIsLivePipelineOpen(true)}
              setRefreshTrigger={setRefreshTrigger}
              onAccountSelect={handleAccountSelect}
              setCurrentPage={setCurrentPage}
            />
          )}

          {currentPage === 'legal-privacy' && (
            <LegalPrivacyPage
              setCurrentPage={setCurrentPage}
            />
          )}

          {import.meta.env.DEV && currentPage === 'theme-preview' && (
            <Suspense
              fallback={
                <div className="p-6 text-xs font-mono text-fintech-muted">
                  Loading design preview…
                </div>
              }
            >
              <ThemePreviewPage setCurrentPage={setCurrentPage} />
            </Suspense>
          )}
        </main>
      </div>

      {/* Global Create Case Modal */}
      <CreateCaseModal
        isOpen={isCreateCaseOpen}
        onClose={() => setIsCreateCaseOpen(false)}
        initialData={createCaseData}
        onCaseCreated={handleCaseCreated}
      />
      <LivePipelineExecutionModal
        isOpen={isLivePipelineOpen}
        onClose={() => setIsLivePipelineOpen(false)}
        setCurrentPage={setCurrentPage}
        setRefreshTrigger={setRefreshTrigger}
      />
    </div>
  );
}
