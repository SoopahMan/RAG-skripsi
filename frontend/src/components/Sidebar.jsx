import React from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Plus, MessageSquare, Library, Folder, ChevronDown } from 'lucide-react';

export default function Sidebar({ modules, selectedModuleId, onSelectModule, currentView, onViewChange, user }) {
  return (
    <div className="w-64 border-r bg-white h-screen flex flex-col">
      <div className="p-4 flex items-center gap-2">
        <div className="bg-orange-500 p-2 rounded-lg text-white">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-tight">Mentora-ITS</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Bandungrejosari 1</p>
        </div>
      </div>

      <div className="px-4 py-2 space-y-2">
        <Button 
          variant={currentView === 'read' ? 'default' : 'outline'}
          onClick={() => onViewChange('read')}
          className={`w-full justify-start gap-2 ${currentView === 'read' ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}`}
        >
          <Library className="w-4 h-4" />
          <span>Baca Modul</span>
        </Button>
        <Button 
          variant={currentView === 'practice' ? 'default' : 'outline'}
          onClick={() => onViewChange('practice')}
          className={`w-full justify-start gap-2 ${currentView === 'practice' ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}`}
        >
          <Plus className="w-4 h-4" />
          <span>Latihan Soal</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 px-2 text-muted-foreground mb-2">
              <Library className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">E-Library</span>
            </div>
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => onSelectModule(module.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedModuleId === module.id
                    ? 'bg-orange-50 text-orange-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {module.title}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between px-2 text-muted-foreground mb-2">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Projects</span>
              </div>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="px-2 space-y-1">
              <button className="w-full text-left px-2 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                Market Analysis
              </button>
              <button className="w-full text-left px-2 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                Product Benchmarking
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Kalas {user.class}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
