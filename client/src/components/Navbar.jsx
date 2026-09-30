import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Search, 
  Plus, 
  LogOut, 
  User
} from 'lucide-react';

export default function Navbar({ 
  onOpenSearch, 
  onOpenAddBuilding, 
  selectedBuilding,
  onBackToBuildings 
}) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToBuildings}
              className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg tracking-wider text-white">ZAYANI</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                    207 Housing
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Building Inspection Photos</div>
              </div>
            </button>

            {/* Active Building Breadcrumb */}
            {selectedBuilding && (
              <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
                <span className="text-xs text-slate-400">Active:</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold">
                  Building {selectedBuilding.building_number} ({selectedBuilding.location})
                </span>
              </div>
            )}
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            {/* Search Button */}
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Search buildings..."
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Search Buildings</span>
            </button>

            {/* + NEW BUILDING Button */}
            <button
              onClick={onOpenAddBuilding}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-600/20 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ NEW BUILDING</span>
            </button>

            {/* User & Logout */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-tight">{user?.name || 'Inspector'}</span>
                <span className="text-[10px] text-slate-400 capitalize">{user?.role || 'Engineer'}</span>
              </div>

              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
