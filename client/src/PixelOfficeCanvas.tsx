import React, { useEffect, useRef } from 'react';
import type { Agent, Task } from './types';
import type { PlacedFurniture, FurnitureDefinition } from './furniture-data';

export interface PixelOfficeCanvasProps {
  agents: Agent[];
  tasks: Task[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  isMotionPaused?: boolean;
  isDecorating?: boolean;
  furniture?: PlacedFurniture[];
  onUpdateFurniture?: (newFurniture: PlacedFurniture[]) => void;
  selectedCatalogItem?: FurnitureDefinition | null;
  onSelectCatalogItem?: (item: FurnitureDefinition | null) => void;
  selectedPlacedItem?: PlacedFurniture | null;
  onSelectPlacedItem?: (item: PlacedFurniture | null) => void;
  isDeleteMode?: boolean;
  onDeletePlacedItem?: (id: string) => void;
}

export const PixelOfficeCanvas: React.FC<PixelOfficeCanvasProps> = ({
  agents,
  tasks,
  selectedAgentId: _selectedAgentId,
  onSelectAgent,
  isMotionPaused = false,
  isDecorating = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectAgentRef = useRef(onSelectAgent);
  const agentsRef = useRef(agents);

  useEffect(() => {
    onSelectAgentRef.current = onSelectAgent;
    agentsRef.current = agents;
  }, [onSelectAgent, agents]);

  // Sync agents & tasks to window.data for the Cozy Office engine
  useEffect(() => {
    const colors = ['#6b9272', '#b38b67', '#778fa6', '#aa8296'];
    const mappedAgents = agents.map((ag, i) => ({
      id: ag.id,
      name: ag.name,
      role: ag.role,
      brief: ag.brief || ag.system_instructions || '',
      color: ag.color || colors[i % 4],
      spriteVariant: ag.avatar?.spriteVariant ?? ag.spriteVariant ?? (i % 8),
      appearance: ag.avatar,
      personality: (ag as any).personality || 'balanced',
      showThoughts: (ag as any).showThoughts !== false,
      folder_path: ag.folder_path,
      isBusy: ag.isBusy
    }));

    const mappedTasks = tasks.map((t) => {
      let status: 'todo' | 'doing' | 'review' | 'done' = 'todo';
      const s = String(t.status || '').toLowerCase();
      if (s === 'running' || s === 'doing' || s === 'queued') {
        status = 'doing';
      } else if (
        (s === 'success' && t.review_status !== 'approved') ||
        s === 'review'
      ) {
        status = 'review';
      } else if (
        (s === 'success' && t.review_status === 'approved') ||
        s === 'done'
      ) {
        status = 'done';
      }

      return {
        id: t.id,
        agentId: t.agent_id,
        title: t.title || t.prompt?.slice(0, 50) || '',
        detail: t.prompt || '',
        priority: t.priority || 'Bình thường',
        status,
        result: t.response_text || '',
        feedback: t.feedback || '',
        created: typeof t.started_at === 'number' ? new Date(t.started_at).toISOString() : String(t.started_at || new Date().toISOString())
      };
    });

    (window as any).data = {
      version: 1,
      agents: mappedAgents,
      tasks: mappedTasks
    };

    if (typeof (window as any).updatePixelOffice === 'function') {
      (window as any).updatePixelOffice();
    }
    if (typeof (window as any).officeReports?.sync === 'function') {
      (window as any).officeReports.sync();
    }
  }, [agents, tasks]);

  // Initialize modular Cozy Office & Decor Editor engines on mount
  useEffect(() => {
    (window as any).onSelectAgent = (ag: any) => {
      const real = agentsRef.current.find((a) => a.id === ag.id);
      if (real) {
        onSelectAgentRef.current(real);
      }
    };

    try {
      if (typeof (window as any).initStraightOffice === 'function') {
        (window as any).initStraightOffice();
      }
    } catch (e) {
      console.error('Error initializing straight office:', e);
    }

    try {
      if (typeof (window as any).initCozyOffice === 'function') {
        (window as any).initCozyOffice();
      }
    } catch (e) {
      console.error('Error initializing cozy office:', e);
    }

    try {
      if (typeof (window as any).initDecorEditor === 'function') {
        (window as any).initDecorEditor();
      }
    } catch (e) {
      console.error('Error initializing decor editor:', e);
    }

    try {
      if (typeof (window as any).updatePixelOffice === 'function') {
        (window as any).updatePixelOffice();
      }
    } catch (e) {
      console.error('Error updating pixel office:', e);
    }
  }, []);

  // Motion pause handler
  useEffect(() => {
    if (typeof (window as any).setCozyPaused === 'function') {
      (window as any).setCozyPaused(isMotionPaused);
    }
  }, [isMotionPaused]);

  // Decoration mode handler
  useEffect(() => {
    if ((window as any).officeLayout && typeof (window as any).officeLayout.setEditing === 'function') {
      if ((window as any).officeLayout.editing !== isDecorating) {
        (window as any).officeLayout.setEditing(isDecorating);
      }
    }
  }, [isDecorating]);

  return (
    <div
      ref={containerRef}
      className="office"
      data-testid="pixel-office-container"
    >
      <div className="office-art"></div>
      <div className="office-warmth"></div>
      <div className="sprite-world"></div>
    </div>
  );
};
