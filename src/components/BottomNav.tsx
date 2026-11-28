import React from 'react';
import { LayoutGrid, PenSquare, Store } from 'lucide-react';

export type TabId = 'editor' | 'placas' | 'negocio';

interface BottomNavProps {
  activeTab: TabId;
  savedCount: number;
  onSelect: (tab: TabId) => void;
}

export function BottomNav({ activeTab, savedCount, onSelect }: BottomNavProps): React.JSX.Element {
  return (
    <nav className="pf-bottom-nav" aria-label="Menú principal">
      <button
        type="button"
        className={`pf-nav-tab ${activeTab === 'editor' ? 'is-active' : ''}`}
        aria-current={activeTab === 'editor' ? 'page' : undefined}
        onClick={() => onSelect('editor')}
      >
        <PenSquare size={20} />
        <span>Editor</span>
      </button>
      <button
        type="button"
        className={`pf-nav-tab ${activeTab === 'placas' ? 'is-active' : ''}`}
        aria-current={activeTab === 'placas' ? 'page' : undefined}
        onClick={() => onSelect('placas')}
      >
        <LayoutGrid size={20} />
        <span>Mis Placas{savedCount > 0 ? ` (${savedCount})` : ''}</span>
      </button>
      <button
        type="button"
        className={`pf-nav-tab ${activeTab === 'negocio' ? 'is-active' : ''}`}
        aria-current={activeTab === 'negocio' ? 'page' : undefined}
        onClick={() => onSelect('negocio')}
      >
        <Store size={20} />
        <span>Mi Negocio</span>
      </button>
    </nav>
  );
}
