import React from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  Plus,
  MessageSquare,
  Library,
  PenTool,
  GraduationCap,
  BookOpen,
  Users,
  Settings
} from 'lucide-react';

import { useRBAC } from '../services/useRBAC';
import { PERMISSIONS } from '../services/rbac';

export default function Sidebar({
  modules,
  selectedModuleId,
  onSelectModule,
  currentView,
  onViewChange,
  user,
  teacherTab,
  setTeacherTab
}) {
  const { hasPermission } = useRBAC();

  const isTeacherView = currentView === 'teacher';
  const displayName = user.username || user.name || "User";

  const menuButton = (active) =>
    `w-full justify-start gap-2 ${
      active
        ? 'bg-orange-500 hover:bg-orange-600'
        : 'border-orange-200 text-orange-600 hover:bg-orange-50'
    }`;

  return (
    <div className="w-64 border-r bg-white h-screen flex flex-col">

      {/* HEADER */}
      <div className="p-4 flex items-center gap-2">
        <div className="bg-orange-500 p-2 rounded-lg text-white">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg">Mentora-ITS</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">
            Bandungrejosari 1
          </p>
        </div>
      </div>

      {/* MENU UTAMA */}
      <div className="px-4 py-2 space-y-2">

        {hasPermission(PERMISSIONS.MANAGE_MATERIAL) && (
          <Button
            variant={isTeacherView ? 'default' : 'outline'}
            onClick={() => onViewChange('teacher')}
            className={menuButton(isTeacherView)}
          >
            <GraduationCap className="w-4 h-4" />
            Dashboard Guru
          </Button>
        )}

        <Button
          variant={currentView === 'read' ? 'default' : 'outline'}
          onClick={() => onViewChange('read')}
          className={menuButton(currentView === 'read')}
        >
          <Library className="w-4 h-4" />
          Baca Modul
        </Button>

        <Button
          variant={currentView === 'practice' ? 'default' : 'outline'}
          onClick={() => onViewChange('practice')}
          className={menuButton(currentView === 'practice')}
        >
          <Plus className="w-4 h-4" />
          Latihan Soal
        </Button>
      </div>

      {/* CONTENT */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-6">

          {/* MENU GURU */}
          {hasPermission(PERMISSIONS.MANAGE_MATERIAL) && isTeacherView && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-2 px-2 mb-2 text-orange-600">
                <Settings className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">
                  Menu Guru
                </span>
              </div>

              <div className="space-y-1">
                {[
                  { id: 'materi', label: 'Kelola Materi', icon: BookOpen },
                  { id: 'soal', label: 'Bank Soal', icon: Plus },
                  { id: 'siswa', label: 'Daftar Siswa', icon: Users },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = teacherTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setTeacherTab(tab.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                        active
                          ? 'bg-orange-100 text-orange-700 font-bold'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-orange-600' : ''}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODULE LIST */}
          <div>
            <div className="flex items-center gap-2 px-2 mb-2 text-muted-foreground">
              <Library className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">
                E-Library
              </span>
            </div>

            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => {
                  onSelectModule(module.id);
                  if (isTeacherView) onViewChange('read');
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selectedModuleId === module.id
                    ? 'bg-orange-50 text-orange-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {module.title}
              </button>
            ))}
          </div>

          {/* NOTES (USER ONLY) */}
          {!hasPermission(PERMISSIONS.MANAGE_MATERIAL) && (
            <div>
              <div
                onClick={() => onViewChange('notes')}
                className={`flex items-center gap-2 px-2 mb-2 cursor-pointer ${
                  currentView === 'notes'
                    ? 'text-orange-600'
                    : 'text-muted-foreground hover:text-orange-600'
                }`}
              >
                <PenTool className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">
                  Catatan
                </span>
              </div>

              <button
                onClick={() => onViewChange('notes')}
                className={`w-full text-left px-2 py-1.5 text-xs rounded-md ${
                  currentView === 'notes'
                    ? 'bg-orange-50 text-orange-700 font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Tulis Rangkuman...
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* FOOTER USER */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground font-bold">
              {hasPermission(PERMISSIONS.MANAGE_MATERIAL)
                ? '👨‍🏫 Admin / Guru'
                : `Kelas ${user.class || '-'}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}