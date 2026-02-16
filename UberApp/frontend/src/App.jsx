import React, { useState } from 'react';
import MainLayout from './components/Layout/MainLayout';
import Pipeline from './pages/Pipeline';
import Rides from './pages/Rides';
import Dashboard from './pages/Dashboard';
import AIChat from './pages/AIChat';

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <MainLayout activePage={activePage} setActivePage={setActivePage}>
      {activePage === 'dashboard' && <Dashboard />}
      
      {activePage === 'pipeline' && <Pipeline />}
      
      {activePage === 'rides' && <Rides />}
      
      {activePage === 'aichat' && <AIChat />}
      
      {activePage === 'users' && (
        <div className="p-10 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
          <h2 className="text-2xl font-bold text-blue-400">مدیریت کاربران</h2>
          <p className="mt-2 text-slate-400 font-bold">این بخش به زودی فعال خواهد شد</p>
        </div>
      )}
    </MainLayout>
  );
}

export default App;
