import React from 'react';
import { Layers, Building2, Wrench, ClipboardCheck, Camera } from 'lucide-react';

export default function MobileBottomNav({ activeTab, setActiveTab, onOpenPhotoHub }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'maintenance', label: 'Work', icon: Wrench },
    { id: 'inspections', label: 'Inspect', icon: ClipboardCheck },
    { id: 'photos', label: 'Camera', icon: Camera }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl backdrop-blur-md">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id || (item.id === 'buildings' && activeTab === 'building-detail');
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
              isActive ? 'text-blue-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
