import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import BuildingsList from './components/BuildingsList';
import BuildingView from './components/BuildingView';
import NewBuildingModal from './components/NewBuildingModal';
import FireAlarmWorkflow from './components/FireAlarmWorkflow';
import FireFightingWorkflow from './components/FireFightingWorkflow';
import ExportModal from './components/ExportModal';
import GlobalSearchModal from './components/GlobalSearchModal';

function MainApp() {
  const { user, loading } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState('buildings'); // 'buildings' | 'building-view'
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Dedicated Workflow Modal States
  const [activeWorkflowBuilding, setActiveWorkflowBuilding] = useState(null);
  const [isFireAlarmOpen, setIsFireAlarmOpen] = useState(false);
  const [isFireFightingOpen, setIsFireFightingOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportBuildingTarget, setExportBuildingTarget] = useState(null);
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold tracking-wider uppercase text-blue-400">Loading ZAYANI Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  const handleSelectBuilding = (bld) => {
    setSelectedBuilding(bld);
    setCurrentView('building-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToBuildings = () => {
    setSelectedBuilding(null);
    setCurrentView('buildings');
  };

  const handleStartFireAlarm = (bld) => {
    setActiveWorkflowBuilding(bld || selectedBuilding);
    setIsFireAlarmOpen(true);
  };

  const handleStartFireFighting = (bld) => {
    setActiveWorkflowBuilding(bld || selectedBuilding);
    setIsFireFightingOpen(true);
  };

  const handleOpenExportModal = (bld) => {
    setExportBuildingTarget(bld || selectedBuilding || null);
    setIsExportModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Clean Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAddBuilding={() => setIsAddBuildingOpen(true)}
        selectedBuilding={selectedBuilding}
        onBackToBuildings={handleBackToBuildings}
      />

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {currentView === 'buildings' ? (
          <BuildingsList
            onSelectBuilding={handleSelectBuilding}
            onOpenAddBuilding={() => setIsAddBuildingOpen(true)}
            onStartFireAlarm={handleStartFireAlarm}
            onStartFireFighting={handleStartFireFighting}
            onOpenExportModal={handleOpenExportModal}
          />
        ) : (
          selectedBuilding && (
            <BuildingView
              buildingId={selectedBuilding.id}
              onBack={handleBackToBuildings}
              onStartFireAlarm={() => handleStartFireAlarm(selectedBuilding)}
              onStartFireFighting={() => handleStartFireFighting(selectedBuilding)}
              onOpenExportModal={() => handleOpenExportModal(selectedBuilding)}
            />
          )
        )}
      </main>

      {/* Add Building Modal */}
      <NewBuildingModal
        isOpen={isAddBuildingOpen}
        onClose={() => setIsAddBuildingOpen(false)}
        onCreated={(newBld) => {
          setIsAddBuildingOpen(false);
          handleSelectBuilding(newBld);
        }}
      />

      {/* Fire Alarm Photo Modal */}
      <FireAlarmWorkflow
        isOpen={isFireAlarmOpen}
        building={activeWorkflowBuilding}
        onClose={() => setIsFireAlarmOpen(false)}
        onPhotoSaved={() => {}}
      />

      {/* Fire Fighting Photo Modal */}
      <FireFightingWorkflow
        isOpen={isFireFightingOpen}
        building={activeWorkflowBuilding}
        onClose={() => setIsFireFightingOpen(false)}
        onPhotoSaved={() => {}}
      />

      {/* Structured ZIP Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        building={exportBuildingTarget}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectBuilding={handleSelectBuilding}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
