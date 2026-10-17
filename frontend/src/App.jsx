import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import CreateCaseModal from './components/CreateCaseModal';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
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

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedAccount, setSelectedAccount] = useState('MULE_AGG_01');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Global Create Case Modal
  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [createCaseData, setCreateCaseData] = useState({});

  const handleOpenCreateCase = (data = {}) => {
    setCreateCaseData(data);
    setIsCreateCaseOpen(true);
  };

  const handleCaseCreated = (newCase) => {
    setSelectedCaseId(newCase.case_id);
    setRefreshTrigger(prev => prev + 1);
    setCurrentPage('case-details');
  };

  const handleAccountSelect = (accountId) => {
    setSelectedAccount(accountId);
  };

  // Standalone Full-Screen Landing Showcase (Like modern SaaS reference)
  if (currentPage === 'landing') {
    return (
      <LandingPage
        setCurrentPage={setCurrentPage}
        onAccountSelect={handleAccountSelect}
      />
    );
  }

  return (
    <div className="flex h-screen bg-navy-950 text-slate-100 overflow-hidden font-sans">
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
          setRefreshTrigger={setRefreshTrigger}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-grid-pattern">
          {currentPage === 'landing' && (
            <LandingPage
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
            />
          )}

          {currentPage === 'login' && (
            <LoginPage
              setCurrentPage={setCurrentPage}
              onLoginSuccess={(inv) => console.log('Authenticated:', inv)}
            />
          )}

          {currentPage === 'dashboard' && (
            <DashboardPage
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
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
            />
          )}

          {currentPage === 'mule-detection' && (
            <MuleDetectionPage
              setCurrentPage={setCurrentPage}
              selectedAccount={selectedAccount}
              onAccountSelect={handleAccountSelect}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentPage === 'graph' && (
            <GraphInvestigationPage
              setCurrentPage={setCurrentPage}
              selectedAccount={selectedAccount}
              onAccountSelect={handleAccountSelect}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentPage === 'money-trail' && (
            <MoneyTrailPage
              selectedAccount={selectedAccount}
              onAccountSelect={handleAccountSelect}
              setCurrentPage={setCurrentPage}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentPage === 'complaints' && (
            <ComplaintsPage
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentPage === 'cases' && (
            <CasesPage
              setCurrentPage={setCurrentPage}
              setSelectedCaseId={setSelectedCaseId}
              onOpenCreateCase={handleOpenCreateCase}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentPage === 'case-details' && (
            <CaseDetailsPage
              caseId={selectedCaseId}
              setCurrentPage={setCurrentPage}
              onAccountSelect={handleAccountSelect}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentPage === 'analytics-reports' && (
            <AnalyticsReportsPage
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentPage === 'settings-model' && (
            <SettingsModelPage
              refreshTrigger={refreshTrigger}
              setRefreshTrigger={setRefreshTrigger}
              onAccountSelect={handleAccountSelect}
              setCurrentPage={setCurrentPage}
            />
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
    </div>
  );
}
