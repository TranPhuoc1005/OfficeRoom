import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Agent, Task } from './types';
import { PixelOfficeCanvas } from './PixelOfficeCanvas';
import { FolderBrowserModal } from './FolderBrowserModal';
import { drawAgentSprite } from './agent-sprite';
import { getDefaultOfficeFurniture } from './furniture-data';
import type { PlacedFurniture, FurnitureDefinition } from './furniture-data';
import { FurnitureCatalogDock } from './FurnitureCatalogDock';
import { AgentModal } from './AgentModal';
import { AgentEditModal } from './AgentEditModal';
import {
  supabase,
  isSupabaseConfigured,
  getOrCreateOfficeId
} from './supabase';
import type { RunnerInfo, ProjectInfo } from './supabase';
import { AuthModal } from './AuthModal';
import { RunnerModal } from './RunnerModal';
import { ProjectSelectModal } from './ProjectSelectModal';
import './App.css';

type GameView = 'office' | 'team' | 'tasks' | 'history' | 'settings';

function playNotificationSound(type: 'success' | 'alert' = 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // AudioContext blocked
  }
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // View state: 'office' | 'team' | 'tasks' | 'history' | 'settings'
  const [currentView, setCurrentView] = useState<GameView>('office');
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // Motion pause (sprite animation only, does not stop CLI)
  const [motionPaused, setMotionPaused] = useState(false);

  // Fullscreen state
  const [, setIsFullscreen] = useState(false);

  // Live active tasks (by agent ID) & status
  const [activeTasks, setActiveTasks] = useState<Map<string, Task>>(new Map());
  const [wsConnected, setWsConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Supabase Multi-Device & Runner State
  const [authSession, setAuthSession] = useState<any>(null);
  const [officeId, setOfficeId] = useState<string | null>(null);
  const [runners, setRunners] = useState<RunnerInfo[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRunnerModalOpen, setIsRunnerModalOpen] = useState(false);
  const [projectSelectAgentId, setProjectSelectAgentId] = useState<string | null>(null);
  const [isLocalOnlyMode, setIsLocalOnlyMode] = useState<boolean>(() => {
    return localStorage.getItem('pixel_office_local_mode') === 'true';
  });

  const isSupabaseActive = isSupabaseConfigured() && !isLocalOnlyMode;
  const isRunnerOnline = runners.length > 0 && runners[0].isOnline;

  // Modals state
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [detailedAgent, setDetailedAgent] = useState<Agent | null>(null);

  // Office Decoration State
  const [furniture, setFurniture] = useState<PlacedFurniture[]>([]);
  const [initialFurnitureSnapshot, setInitialFurnitureSnapshot] = useState<PlacedFurniture[]>([]);
  const [undoStack, setUndoStack] = useState<PlacedFurniture[][]>([]);
  const [isDecorating, setIsDecorating] = useState<boolean>(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<FurnitureDefinition | null>(null);
  const [selectedPlacedItem, setSelectedPlacedItem] = useState<PlacedFurniture | null>(null);
  const [furnitureLayoutVersion, setFurnitureLayoutVersion] = useState<number>(1);
  const [isSavingLayout, setIsSavingLayout] = useState<boolean>(false);
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);

  const isDecoratingRef = useRef(false);
  useEffect(() => {
    isDecoratingRef.current = isDecorating;
  }, [isDecorating]);

  const hasLoadedLayoutRef = useRef(false);
  const agentsRef = useRef<Agent[]>(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormAgentId, setTaskFormAgentId] = useState<string>('');

  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  // Folder browser submodal (for local fallback)
  const [folderBrowserAgentId, setFolderBrowserAgentId] = useState<string | null>(null);

  // Board filter
  const [agentFilter, setAgentFilter] = useState<string>('');

  // Completion notification card
  const [completionAlert, setCompletionAlert] = useState<{
    agentName: string;
    taskTitle: string;
    taskId: string;
  } | null>(null);

  const toastTimerRef = useRef<any>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Agents (Supabase or Local)
  const loadAgents = useCallback(async () => {
    if (isSupabaseActive && supabase && officeId) {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('office_id', officeId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (data) {
          const defaultOrder = ['agent-huy', 'agent-tuong', 'agent-phuoc', 'agent-toan', 'agent-thanh', 'agent-long', 'agent-hieu'];
          const sorted = [...data].sort((a: any, b: any) => {
            const idxA = defaultOrder.indexOf(a.id);
            const idxB = defaultOrder.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          const mapped: Agent[] = sorted.map((d: any, idx: number) => ({
            id: d.id,
            name: d.name,
            role: d.role,
            brief: d.brief || d.role,
            system_instructions: d.system_instructions || '',
            color: d.color || '#2563eb',
            folder_path: d.folder_path || '',
            conversation_id: d.conversation_id || null,
            avatar: typeof d.avatar === 'string' ? JSON.parse(d.avatar) : d.avatar || {},
            desk_x: idx < 4 ? 0 : 1,
            desk_y: idx < 4 ? idx : idx - 4,
            isBusy: false,
            activeTaskId: null
          }));
          setAgents(mapped);
          return mapped;
        }
      } catch (err) {
        console.error('Failed to load agents from Supabase:', err);
      }
    } else {
      try {
        const res = await fetch('/api/agents');
        if (res.ok) {
          const data: Agent[] = await res.json();
          setAgents(data);
          return data;
        }
      } catch (err) {
        console.error('Failed to load agents from local API:', err);
      }
    }
    return [];
  }, [isSupabaseActive, officeId]);

  // 2. Fetch Tasks (Supabase or Local)
  const loadAllTasks = useCallback(
    async (currentAgents: Agent[]) => {
      if (isSupabaseActive && supabase && officeId) {
        try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('office_id', officeId)
            .order('started_at', { ascending: false });
          if (error) throw error;
          if (data) {
            const mapped: Task[] = data.map((t: any) => ({
              id: t.id,
              agent_id: t.agent_id,
              prompt: t.prompt,
              title: t.title || t.prompt.slice(0, 40),
              priority: t.priority || 'Bình thường',
              feedback: t.feedback || '',
              review_status: t.review_status || 'pending',
              folder_path: t.folder_path,
              conversation_id: t.conversation_id || null,
              status: t.status,
              current_activity: t.current_activity || null,
              response_text: t.response_text || '',
              error_text: t.error_text || null,
              duration_seconds: t.duration_seconds || null,
              started_at: t.started_at ? new Date(t.started_at).getTime() : Date.now(),
              completed_at: t.completed_at ? new Date(t.completed_at).getTime() : null
            }));
            setTasks(mapped);

            const activeMap = new Map<string, Task>();
            mapped.forEach((t) => {
              if (t.status === 'running' || t.status === 'queued' || t.status === 'RUNNING') {
                activeMap.set(t.agent_id, t);
              }
            });
            setActiveTasks(activeMap);

            setAgents((prev) =>
              prev.map((a) => {
                const act = activeMap.get(a.id);
                return {
                  ...a,
                  isBusy: Boolean(act),
                  activeTaskId: act?.id || null
                };
              })
            );
          }
        } catch (err) {
          console.error('Failed to load tasks from Supabase:', err);
        }
      } else {
        try {
          const all: Task[] = [];
          for (const ag of currentAgents) {
            const res = await fetch(`/api/agents/${ag.id}/tasks`);
            if (res.ok) {
              const t: Task[] = await res.json();
              all.push(...t);
            }
          }
          all.sort((a, b) => b.started_at - a.started_at);
          setTasks(all);
        } catch (err) {
          console.error('Failed to load tasks from local API:', err);
        }
      }
    },
    [isSupabaseActive, officeId]
  );

  // 3. Load Runners & Projects
  const loadRunnersAndProjects = useCallback(async () => {
    if (!isSupabaseActive || !supabase || !officeId) return;
    try {
      const [runnersRes, projectsRes] = await Promise.all([
        supabase.from('runners').select('*').eq('office_id', officeId),
        supabase.from('projects').select('*').eq('office_id', officeId)
      ]);

      if (runnersRes.data) {
        const now = Date.now();
        const mappedRunners: RunnerInfo[] = runnersRes.data.map((r: any) => {
          const lastHb = r.last_heartbeat_at ? new Date(r.last_heartbeat_at).getTime() : 0;
          const isAlive = (r.status === 'online' || r.status === 'busy') && now - lastHb < 30000;
          return {
            id: r.id,
            name: r.name,
            status: isAlive ? r.status : 'offline',
            last_heartbeat_at: r.last_heartbeat_at,
            metadata: r.metadata,
            isOnline: isAlive
          };
        });
        setRunners(mappedRunners);
      }

      if (projectsRes.data) {
        setProjects(projectsRes.data);
      }
    } catch (err) {
      console.warn('Error loading runners/projects:', err);
    }
  }, [isSupabaseActive, officeId]);

  // 4. Load Office Furniture Layout
  const loadOfficeLayout = useCallback(
    async (currentAgents: Agent[]) => {
      // NEVER overwrite furniture if user is actively in decoration mode!
      if (isDecoratingRef.current) return;
      try {
        let loadedLayout: PlacedFurniture[] | null = null;
        let version = 1;

        if (isSupabaseActive && supabase && officeId) {
          const { data, error } = await supabase
            .from('offices')
            .select('layout, layout_version')
            .eq('id', officeId)
            .maybeSingle();

          if (!error && data?.layout && Array.isArray(data.layout) && data.layout.length > 0) {
            loadedLayout = data.layout;
            version = data.layout_version || 1;
          }
        } else {
          try {
            const res = await fetch('/api/layout');
            if (res.ok) {
              const data = await res.json();
              if (data.layout && Array.isArray(data.layout) && data.layout.length > 0) {
                loadedLayout = data.layout;
                version = data.version || 1;
              }
            }
          } catch {}
        }

        if (loadedLayout && loadedLayout.length > 0) {
          setFurniture(loadedLayout);
          setInitialFurnitureSnapshot(loadedLayout);
          setFurnitureLayoutVersion(version);
        } else {
          // Generate default office furniture matching current agents
          const defaultItems = getDefaultOfficeFurniture(currentAgents.length || 7);
          const deskItems = defaultItems.filter((f) => f.type.startsWith('desk'));
          currentAgents.forEach((ag, idx) => {
            if (deskItems[idx]) {
              deskItems[idx].assignedAgentId = ag.id;
            }
          });
          setFurniture(defaultItems);
          setInitialFurnitureSnapshot(defaultItems);
          setFurnitureLayoutVersion(1);
        }
      } catch (err) {
        console.warn('Failed to load office layout, falling back to default:', err);
        const defaultItems = getDefaultOfficeFurniture(currentAgents.length || 7);
        setFurniture(defaultItems);
        setInitialFurnitureSnapshot(defaultItems);
      }
    },
    [isSupabaseActive, officeId]
  );

  // Decoration Mode Toggle & Actions
  const handleToggleDecorating = () => {
    if (!isDecorating) {
      setInitialFurnitureSnapshot(JSON.parse(JSON.stringify(furniture)));
      setUndoStack([]);
      setSelectedCatalogItem(null);
      setSelectedPlacedItem(null);
      setIsDeleteMode(false);
      setIsDecorating(true);
      setCurrentView('office');
      showToast('🔨 Đã bật chế độ trang trí. Chọn đồ nội thất từ thanh bên dưới để đặt.');
    } else {
      handleCancelDecorate();
    }
  };

  const handleUpdateFurniture = (newFurniture: PlacedFurniture[]) => {
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(furniture))]);
    setFurniture(newFurniture);
  };

  const handleUndoDecorate = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setFurniture(previous);
    setSelectedPlacedItem(null);
  };

  const handleCancelDecorate = () => {
    setFurniture(JSON.parse(JSON.stringify(initialFurnitureSnapshot)));
    setIsDecorating(false);
    setSelectedCatalogItem(null);
    setSelectedPlacedItem(null);
    setIsDeleteMode(false);
    setUndoStack([]);
    showToast('Đã hủy các thay đổi trang trí.');
  };

  const handleSaveDecorate = async () => {
    setIsSavingLayout(true);
    try {
      if (isSupabaseActive && supabase && officeId) {
        const nextVersion = furnitureLayoutVersion + 1;
        const { error } = await supabase
          .from('offices')
          .update({
            layout: furniture,
            layout_version: nextVersion,
            updated_at: new Date().toISOString()
          })
          .eq('id', officeId);

        if (error) {
          showToast(`Lỗi lưu bố cục: ${error.message}`);
          return;
        }

        setFurnitureLayoutVersion(nextVersion);
        setInitialFurnitureSnapshot(JSON.parse(JSON.stringify(furniture)));
        setIsDecorating(false);
        setSelectedCatalogItem(null);
        setSelectedPlacedItem(null);
        setUndoStack([]);
        showToast('✓ Đã lưu bố cục văn phòng lên Cloud!');
      } else {
        const res = await fetch('/api/layout', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layout: furniture, version: furnitureLayoutVersion })
        });
        const data = await res.json();
        if (res.ok) {
          setFurnitureLayoutVersion(data.version || furnitureLayoutVersion + 1);
          setInitialFurnitureSnapshot(JSON.parse(JSON.stringify(furniture)));
          setIsDecorating(false);
          setSelectedCatalogItem(null);
          setSelectedPlacedItem(null);
          setUndoStack([]);
          showToast('✓ Đã lưu bố cục văn phòng thành công!');
        } else if (res.status === 409) {
          alert('Xung đột: ' + data.error);
        } else {
          showToast(`Lỗi lưu: ${data.error}`);
        }
      }
    } catch (err: any) {
      showToast(`Lỗi mạng: ${err.message}`);
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleDeletePlacedItem = (id: string) => {
    const item = furniture.find((f) => f.id === id);
    if (!item) return;

    handleUpdateFurniture(furniture.filter((f) => f.id !== id));
    setSelectedPlacedItem(null);

    if (item.assignedAgentId) {
      const ag = (agentsRef.current || []).find((a) => a.id === item.assignedAgentId);
      showToast(`🗑️ Đã xóa bàn làm việc. ${ag?.name || 'Agent'} hiện chưa có bàn riêng (có thể Hoàn tác).`);
    } else {
      showToast('🗑️ Đã xóa món đồ khỏi phòng.');
    }
  };

  const handleAssignDeskAgent = (placedId: string, agentId: string | null) => {
    const updated = furniture.map((f) => {
      if (f.id === placedId) {
        return { ...f, assignedAgentId: agentId };
      }
      if (agentId && f.assignedAgentId === agentId) {
        return { ...f, assignedAgentId: null };
      }
      return f;
    });

    handleUpdateFurniture(updated);
    setSelectedPlacedItem((prev) => (prev ? { ...prev, assignedAgentId: agentId } : null));

    if (agentId) {
      const ag = agents.find((a) => a.id === agentId);
      showToast(`Đã gán bàn cho ${ag?.name || 'Agent'}`);
    } else {
      showToast('Đã hủy gán chủ bàn.');
    }
  };

  // Auth Listener
  useEffect(() => {
    if (!isSupabaseConfigured() || isLocalOnlyMode) {
      loadAgents().then((ag) => {
        if (ag && ag.length > 0) {
          loadAllTasks(ag);
          if (!hasLoadedLayoutRef.current) {
            hasLoadedLayoutRef.current = true;
            loadOfficeLayout(ag);
          }
        }
      });
      return;
    }

    supabase?.auth.getSession().then(({ data }) => {
      setAuthSession(data.session);
      if (!data.session) {
        setIsAuthModalOpen(true);
      } else {
        getOrCreateOfficeId().then((oid) => {
          if (oid) setOfficeId(oid);
        });
      }
    });

    const { data: authListener } = supabase!.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
      if (!session) {
        setIsAuthModalOpen(true);
        setOfficeId(null);
      } else {
        setIsAuthModalOpen(false);
        getOrCreateOfficeId().then((oid) => {
          if (oid) setOfficeId(oid);
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isLocalOnlyMode, loadAgents, loadAllTasks]);

  // Supabase Realtime Stream
  useEffect(() => {
    if (!isSupabaseActive || !supabase || !officeId) return;

    loadAgents().then((loaded) => {
      loadAllTasks(loaded || agentsRef.current);
      loadRunnersAndProjects();
      if (!hasLoadedLayoutRef.current) {
        hasLoadedLayoutRef.current = true;
        loadOfficeLayout(loaded || agentsRef.current);
      }
    });

    const channel = supabase
      .channel(`office-realtime-${officeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `office_id=eq.${officeId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newTaskRaw = payload.new;
            const newTask: Task = {
              id: newTaskRaw.id,
              agent_id: newTaskRaw.agent_id,
              prompt: newTaskRaw.prompt,
              title: newTaskRaw.title || newTaskRaw.prompt.slice(0, 40),
              priority: newTaskRaw.priority || 'Bình thường',
              feedback: newTaskRaw.feedback || '',
              review_status: newTaskRaw.review_status || 'pending',
              folder_path: newTaskRaw.folder_path,
              conversation_id: newTaskRaw.conversation_id || null,
              status: newTaskRaw.status,
              current_activity: newTaskRaw.current_activity || null,
              response_text: newTaskRaw.response_text || '',
              error_text: newTaskRaw.error_text || null,
              duration_seconds: newTaskRaw.duration_seconds || null,
              started_at: newTaskRaw.started_at ? new Date(newTaskRaw.started_at).getTime() : Date.now(),
              completed_at: newTaskRaw.completed_at ? new Date(newTaskRaw.completed_at).getTime() : null
            };

            setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
            if (newTask.status === 'running' || newTask.status === 'queued') {
              setActiveTasks((prev) => new Map(prev).set(newTask.agent_id, newTask));
              setAgents((prev) =>
                prev.map((a) => (a.id === newTask.agent_id ? { ...a, isBusy: true, activeTaskId: newTask.id } : a))
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setTasks((prev) =>
              prev.map((t) =>
                t.id === updated.id
                  ? {
                      ...t,
                      status: updated.status,
                      current_activity: updated.current_activity,
                      response_text: updated.response_text || t.response_text,
                      error_text: updated.error_text,
                      duration_seconds: updated.duration_seconds,
                      feedback: updated.feedback,
                      review_status: updated.review_status,
                      completed_at: updated.completed_at ? new Date(updated.completed_at).getTime() : t.completed_at
                    }
                  : t
              )
            );

            if (updated.status === 'success') {
              setActiveTasks((prev) => {
                const next = new Map(prev);
                next.delete(updated.agent_id);
                return next;
              });
              setAgents((prev) =>
                prev.map((a) => (a.id === updated.agent_id ? { ...a, isBusy: false, activeTaskId: null } : a))
              );

              const ag = agents.find((a) => a.id === updated.agent_id);
              const agName = ag?.name || 'Agent';
              const tTitle = updated.title || 'Công việc';
              setCompletionAlert({
                agentName: agName,
                taskTitle: tTitle,
                taskId: updated.id
              });
              playNotificationSound('success');
              showToast(`✓ ${agName} đã hoàn tất: "${tTitle}"!`);
            } else if (updated.status === 'interrupted' || updated.status === 'error') {
              setActiveTasks((prev) => {
                const next = new Map(prev);
                next.delete(updated.agent_id);
                return next;
              });
              setAgents((prev) =>
                prev.map((a) => (a.id === updated.agent_id ? { ...a, isBusy: false, activeTaskId: null } : a))
              );
              if (updated.status === 'interrupted') {
                showToast('Tác vụ đã dừng lại.');
              } else {
                showToast(`Lỗi tác vụ: ${updated.error_text || 'Có lỗi xảy ra'}`);
              }
            } else if (updated.status === 'running') {
              setActiveTasks((prev) => {
                const cur = prev.get(updated.agent_id);
                const next = new Map(prev);
                next.set(updated.agent_id, {
                  ...(cur || {
                    id: updated.id,
                    agent_id: updated.agent_id,
                    prompt: updated.prompt,
                    title: updated.title,
                    priority: updated.priority,
                    folder_path: updated.folder_path,
                    conversation_id: updated.conversation_id,
                    started_at: Date.now(),
                    completed_at: null,
                    error_text: null,
                    duration_seconds: null
                  }),
                  status: 'running',
                  current_activity: updated.current_activity,
                  response_text: updated.response_text || cur?.response_text || ''
                });
                return next;
              });
              setAgents((prev) =>
                prev.map((a) => (a.id === updated.agent_id ? { ...a, isBusy: true, activeTaskId: updated.id } : a))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id;
            setTasks((prev) => prev.filter((t) => t.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'runners', filter: `office_id=eq.${officeId}` },
        () => {
          loadRunnersAndProjects();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `office_id=eq.${officeId}` },
        () => {
          loadRunnersAndProjects();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents', filter: `office_id=eq.${officeId}` },
        () => {
          loadAgents();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setWsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setWsConnected(false);
        }
      });

    const runnerInterval = setInterval(loadRunnersAndProjects, 10000);

    return () => {
      if (supabase) supabase.removeChannel(channel);
      clearInterval(runnerInterval);
    };
  }, [isSupabaseActive, officeId, loadAgents, loadAllTasks, loadRunnersAndProjects]);



  // Fullscreen helper
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      showToast('Trình duyệt này chưa bật chế độ toàn màn hình.');
    }
  };

  // View switcher matching switchView
  const switchView = (v: GameView) => {
    if (v === currentView && v !== 'office') {
      setCurrentView('office');
    } else {
      setCurrentView(v);
    }
  };

  // Agent selection (clicks on office character)
  const handleSelectAgent = (ag: Agent) => {
    setSelectedAgentId(ag.id);

    // 1. If agent is busy running a task -> show live progress modal!
    if (ag.isBusy) {
      const act = activeTasks.get(ag.id);
      if (act) {
        setDetailTask(act);
        return;
      }
      const runningTask = tasks.find(
        (t) => t.agent_id === ag.id && (t.status === 'RUNNING' || t.status === 'doing')
      );
      if (runningTask) {
        setDetailTask(runningTask);
        return;
      }
    }

    // 2. If agent has a completed task waiting for review -> show result report!
    const pendingReviewTask = tasks.find(
      (t) =>
        t.agent_id === ag.id &&
        t.status === 'SUCCESS' &&
        (!t.review_status || t.review_status === 'pending')
    );
    if (pendingReviewTask) {
      setDetailTask(pendingReviewTask);
      return;
    }

    // 3. Otherwise, open task assignment form
    handleOpenTaskForm(null, ag.id);
  };

  // Task Form actions
  const handleOpenTaskForm = (task?: Task | null, agentId?: string) => {
    setEditingTask(task || null);
    setTaskFormAgentId(agentId || task?.agent_id || agents[0]?.id || '');
    setIsTaskFormModalOpen(true);
  };

  const handleSaveTaskForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const targetAgentId = (form.elements.namedItem('tAgent') as HTMLSelectElement).value;
    const title = (form.elements.namedItem('tTitle') as HTMLInputElement).value.trim();
    const detail = (form.elements.namedItem('tDetail') as HTMLTextAreaElement).value.trim();
    const priority = (form.elements.namedItem('tPriority') as HTMLSelectElement).value;

    if (!title || !detail) {
      showToast('Vui lòng điền đủ tên và yêu cầu công việc.');
      return;
    }

    try {
      if (editingTask) {
        // Update existing task
        if (isSupabaseActive && supabase) {
          const { error } = await supabase
            .from('tasks')
            .update({ title, prompt: detail, priority })
            .eq('id', editingTask.id);
          if (error) throw error;
          showToast('Đã lưu thay đổi công việc');
          setIsTaskFormModalOpen(false);
          setDetailTask({ ...editingTask, title, prompt: detail, priority });
        } else {
          const res = await fetch(`/api/tasks/${editingTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, detail, prompt: detail, priority })
          });
          if (res.ok) {
            showToast('Đã lưu thay đổi công việc');
            setIsTaskFormModalOpen(false);
            await loadAllTasks(agents);
            setDetailTask({ ...editingTask, title, prompt: detail, priority });
          } else {
            const err = await res.json();
            showToast(`Lỗi: ${err.error}`);
          }
        }
      } else {
        // Create and assign new task
        const targetAgent = agents.find((a) => a.id === targetAgentId);
        if (targetAgent?.isBusy) {
          showToast('⚠️ Agent này đang bận thực hiện tác vụ khác.');
          return;
        }

        if (isSupabaseActive && supabase && officeId) {
          const newTaskId = `task-${Date.now()}`;
          if (!isRunnerOnline) {
            showToast('⚠️ Windows Runner đang ngoại tuyến. Task đã xếp hàng đợi (queued).');
          } else {
            showToast('Đã gửi tác vụ lên hệ thống! ⚡');
          }

          const { error } = await supabase.from('tasks').insert({
            id: newTaskId,
            office_id: officeId,
            agent_id: targetAgentId,
            runner_id: runners[0]?.id || null,
            folder_path: targetAgent?.folder_path || '',
            conversation_id: targetAgent?.conversation_id || null,
            title,
            prompt: detail,
            priority,
            status: 'queued',
            started_at: new Date().toISOString()
          });

          if (error) throw error;
          setIsTaskFormModalOpen(false);

          const newTask: Task = {
            id: newTaskId,
            agent_id: targetAgentId,
            title,
            priority,
            prompt: detail,
            folder_path: targetAgent?.folder_path || '',
            conversation_id: targetAgent?.conversation_id || null,
            status: 'queued',
            current_activity: 'Đang xếp hàng chờ Runner...',
            response_text: '',
            error_text: null,
            duration_seconds: null,
            started_at: Date.now(),
            completed_at: null
          };

          setActiveTasks((prev) => new Map(prev).set(targetAgentId, newTask));
          setAgents((prev) =>
            prev.map((a) => (a.id === targetAgentId ? { ...a, isBusy: true, activeTaskId: newTaskId } : a))
          );
          setTasks((prev) => [newTask, ...prev]);
        } else {
          const res = await fetch(`/api/agents/${targetAgentId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, detail, prompt: detail, priority })
          });
          const data = await res.json();
          if (res.ok) {
            showToast('Đã tạo và bắt đầu thực thi trên CLI! ⚡');
            setIsTaskFormModalOpen(false);

            const newTask: Task = {
              id: data.taskId,
              agent_id: targetAgentId,
              title,
              priority,
              prompt: detail,
              folder_path: targetAgent?.folder_path || '',
              conversation_id: targetAgent?.conversation_id || null,
              status: 'RUNNING',
              current_activity: 'Đang kết nối Antigravity CLI...',
              response_text: '',
              error_text: null,
              duration_seconds: null,
              started_at: Date.now(),
              completed_at: null
            };

            setActiveTasks((prev) => new Map(prev).set(targetAgentId, newTask));
            setAgents((prev) =>
              prev.map((a) => (a.id === targetAgentId ? { ...a, isBusy: true, activeTaskId: data.taskId } : a))
            );
            setTasks((prev) => [newTask, ...prev]);
          } else {
            showToast(`Lỗi: ${data.error}`);
          }
        }
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  // Agent Form actions
  const handleOpenAgentForm = (ag?: Agent | null) => {
    setEditingAgent(ag || null);
    setIsAgentModalOpen(true);
  };

  const handleSaveAgentForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('aName') as HTMLInputElement).value.trim();
    const role = (form.elements.namedItem('aRole') as HTMLInputElement).value.trim();
    const brief = (form.elements.namedItem('aBrief') as HTMLTextAreaElement).value.trim();
    const color = (form.elements.namedItem('aColor') as HTMLInputElement).value;
    const folder = (form.elements.namedItem('aFolder') as HTMLInputElement)?.value?.trim();

    if (!name || !role || !brief) {
      showToast('Vui lòng điền đủ thông tin.');
      return;
    }

    try {
      if (editingAgent) {
        if (isSupabaseActive && supabase) {
          const { error } = await supabase
            .from('agents')
            .update({
              name,
              role,
              system_instructions: brief,
              brief,
              color,
              folder_path: folder || editingAgent.folder_path
            })
            .eq('id', editingAgent.id);
          if (error) throw error;
          showToast('Đã lưu agent thành công');
          setIsAgentModalOpen(false);
          await loadAgents();
        } else {
          const res = await fetch(`/api/agents/${editingAgent.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              role,
              system_instructions: brief,
              brief,
              color,
              folder_path: folder || editingAgent.folder_path
            })
          });
          if (res.ok) {
            showToast('Đã lưu agent thành công');
            setIsAgentModalOpen(false);
            await loadAgents();
          } else {
            const err = await res.json();
            showToast(`Lỗi: ${err.error}`);
          }
        }
      } else {
        if (isSupabaseActive && supabase && officeId) {
          const newAgentId = `agent-${Date.now()}`;
          const { error } = await supabase.from('agents').insert({
            id: newAgentId,
            office_id: officeId,
            name,
            role,
            system_instructions: brief,
            brief,
            color,
            folder_path: folder || '',
            avatar: {}
          });
          if (error) throw error;
          showToast('Đã thêm thành viên mới');
          setIsAgentModalOpen(false);
          await loadAgents();
        } else {
          const res = await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              role,
              system_instructions: brief,
              brief,
              color,
              folder_path: folder
            })
          });
          if (res.ok) {
            showToast('Đã thêm thành viên mới');
            setIsAgentModalOpen(false);
            await loadAgents();
          } else {
            const err = await res.json();
            showToast(`Lỗi: ${err.error}`);
          }
        }
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  const handleUpdateAgent = async (agentId: string, updated: Partial<Agent>) => {
    try {
      if (isSupabaseActive && supabase) {
        const updatePayload: any = {
          updated_at: new Date().toISOString()
        };
        if (updated.name !== undefined) updatePayload.name = updated.name;
        if (updated.role !== undefined) updatePayload.role = updated.role;
        if (updated.brief !== undefined) updatePayload.brief = updated.brief;
        if (updated.system_instructions !== undefined) updatePayload.system_instructions = updated.system_instructions;
        if (updated.color !== undefined) updatePayload.color = updated.color;
        if (updated.avatar !== undefined) updatePayload.avatar = updated.avatar;
        if (updated.folder_path !== undefined) updatePayload.folder_path = updated.folder_path;

        const { error } = await supabase.from('agents').update(updatePayload).eq('id', agentId);
        if (error) throw error;
        showToast('Đã lưu thông tin agent thành công');
        await loadAgents();
      } else {
        const res = await fetch(`/api/agents/${agentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
        if (res.ok) {
          showToast('Đã lưu thông tin agent thành công');
          await loadAgents();
        } else {
          const err = await res.json();
          showToast(`Lỗi: ${err.error}`);
        }
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    const ag = agents.find((a) => a.id === agentId);
    if (!ag) return;
    if (ag.isBusy) {
      showToast('Agent đang có công việc đang chạy. Hãy dừng công việc trước.');
      return;
    }
    if (window.confirm(`Xóa agent ${ag.name}?`)) {
      try {
        if (isSupabaseActive && supabase) {
          const { error } = await supabase.from('agents').delete().eq('id', agentId);
          if (error) throw error;
          showToast('Đã xóa agent');
          setIsAgentModalOpen(false);
          await loadAgents();
        } else {
          const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Đã xóa agent');
            setIsAgentModalOpen(false);
            await loadAgents();
          } else {
            const err = await res.json();
            showToast(`Lỗi: ${err.error}`);
          }
        }
      } catch (err: any) {
        showToast(`Lỗi: ${err.message}`);
      }
    }
  };

  // Task operations: Stop, Approve, Revise, Duplicate, Delete
  const handleStopTask = async (agentId: string) => {
    try {
      const targetTask =
        activeTasks.get(agentId) ||
        tasks.find((t) => t.agent_id === agentId && (t.status === 'RUNNING' || t.status === 'running' || t.status === 'queued'));

      if (!targetTask) return;

      if (isSupabaseActive && supabase) {
        showToast('Đang gửi yêu cầu dừng tới Windows Runner...');
        const { error } = await supabase.rpc('request_task_cancellation', {
          p_task_id: targetTask.id
        });
        if (error) {
          showToast(`Lỗi dừng tác vụ: ${error.message}`);
        } else {
          showToast('Đã gửi yêu cầu hủy. Chờ Runner xác nhận...');
        }
      } else {
        const res = await fetch(`/api/agents/${agentId}/stop`, { method: 'POST' });
        if (res.ok) {
          showToast('Đã gửi lệnh dừng tiến trình tới CLI.');
        } else {
          const err = await res.json();
          showToast(`Lỗi: ${err.error}`);
        }
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      if (isSupabaseActive && supabase) {
        const { error } = await supabase
          .from('tasks')
          .update({ review_status: 'approved', status: 'success' })
          .eq('id', taskId);
        if (error) throw error;
        showToast('Đã duyệt hoàn tất ✓');
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'SUCCESS', review_status: 'approved' } : t))
        );
        if (detailTask && detailTask.id === taskId) {
          setDetailTask({ ...detailTask, status: 'SUCCESS', review_status: 'approved' });
        }
      } else {
        const res = await fetch(`/api/tasks/${taskId}/approve`, { method: 'POST' });
        if (res.ok) {
          showToast('Đã duyệt hoàn tất ✓');
          await loadAllTasks(agents);
          if (detailTask && detailTask.id === taskId) {
            setDetailTask({ ...detailTask, status: 'SUCCESS', review_status: 'approved' });
          }
        } else {
          const err = await res.json();
          showToast(`Lỗi: ${err.error}`);
        }
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  const handleReviseTask = async (taskId: string, feedback: string) => {
    if (!feedback.trim()) {
      showToast('Nhập yêu cầu chỉnh sửa.');
      return;
    }
    try {
      if (isSupabaseActive && supabase) {
        const { error } = await supabase
          .from('tasks')
          .update({ review_status: 'rejected', feedback: feedback.trim() })
          .eq('id', taskId);
        if (error) throw error;
        showToast('Đã lưu góp ý chỉnh sửa.');
        setFeedbackInput('');
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, review_status: 'rejected', feedback: feedback.trim() } : t))
        );
        if (detailTask && detailTask.id === taskId) {
          setDetailTask({ ...detailTask, review_status: 'rejected', feedback: feedback.trim() });
        }
      } else {
        const res = await fetch(`/api/tasks/${taskId}/revise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: feedback.trim() })
        });
        if (res.ok) {
          showToast('Đã gửi yêu cầu chỉnh sửa tới Agent ⚡');
          setFeedbackInput('');
          await loadAgents();
          await loadAllTasks(agents);
          if (detailTask && detailTask.id === taskId) {
            setDetailTask({ ...detailTask, status: 'RUNNING', feedback: feedback.trim() });
          }
        } else {
          const err = await res.json();
          showToast(`Lỗi: ${err.error}`);
        }
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  const handleDuplicateTask = async (t: Task) => {
    try {
      if (isSupabaseActive && supabase && officeId) {
        const dupId = `task-${Date.now()}`;
        const { error } = await supabase.from('tasks').insert({
          id: dupId,
          office_id: officeId,
          agent_id: t.agent_id,
          folder_path: t.folder_path,
          conversation_id: t.conversation_id,
          title: `${t.title || 'Task'} (Bản sao)`,
          prompt: t.prompt,
          priority: t.priority || 'Bình thường',
          status: 'queued',
          started_at: new Date().toISOString()
        });
        if (error) throw error;
        showToast('Đã nhân bản công việc thành công.');
        setDetailTask(null);
      } else {
        const res = await fetch(`/api/tasks/${t.id}/duplicate`, { method: 'POST' });
        if (res.ok) {
          showToast('Đã nhân bản công việc thành công.');
          await loadAllTasks(agents);
          setDetailTask(null);
        } else {
          const err = await res.json();
          showToast(`Lỗi: ${err.error}`);
        }
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Xóa công việc này?')) {
      try {
        if (isSupabaseActive && supabase) {
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) throw error;
          showToast('Đã xóa công việc');
          setDetailTask(null);
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
        } else {
          const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Đã xóa công việc');
            setDetailTask(null);
            await loadAllTasks(agents);
          } else {
            const err = await res.json();
            showToast(`Lỗi: ${err.error}`);
          }
        }
      } catch (err: any) {
        showToast(`Lỗi: ${err.message}`);
      }
    }
  };

  const handleResetConversation = async (agentId: string) => {
    try {
      if (isSupabaseActive && supabase) {
        const { error } = await supabase.from('agents').update({ conversation_id: null }).eq('id', agentId);
        if (error) throw error;
        showToast('Đã tạo phiên hội thoại mới cho Agent.');
        setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, conversation_id: null } : a)));
      } else {
        const res = await fetch(`/api/agents/${agentId}/reset-conversation`, { method: 'POST' });
        if (res.ok) {
          showToast('Đã tạo phiên hội thoại mới cho Agent.');
          await loadAgents();
        } else {
          const err = await res.json();
          showToast(`Lỗi: ${err.error}`);
        }
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  // Helper stats
  const activeDoingTasks = tasks.filter(
    (t) => t.status === 'RUNNING' || t.status === 'running' || t.status === 'doing' || t.status === 'queued'
  );
  const reviewTasks = tasks.filter(
    (t) =>
      ((t.status === 'SUCCESS' || t.status === 'success') && (!t.review_status || t.review_status === 'pending')) ||
      t.status === 'review'
  );
  const doneTasks = tasks.filter(
    (t) =>
      ((t.status === 'SUCCESS' || t.status === 'success') && t.review_status === 'approved') ||
      t.status === 'done' ||
      t.status === 'INTERRUPTED' ||
      t.status === 'interrupted' ||
      t.status === 'ERROR' ||
      t.status === 'error'
  );

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Filter tasks for Board
  const filteredTasks = tasks.filter((t) => !agentFilter || t.agent_id === agentFilter);
  const colTodo = filteredTasks.filter((t) => t.status === 'todo' || t.status === 'queued');
  const colDoing = filteredTasks.filter((t) => t.status === 'RUNNING' || t.status === 'running' || t.status === 'doing');
  const colReview = filteredTasks.filter(
    (t) =>
      ((t.status === 'SUCCESS' || t.status === 'success') && (!t.review_status || t.review_status === 'pending')) ||
      t.status === 'review'
  );
  const colDone = filteredTasks.filter(
    (t) =>
      ((t.status === 'SUCCESS' || t.status === 'success') && t.review_status === 'approved') ||
      t.status === 'done' ||
      t.status === 'INTERRUPTED' ||
      t.status === 'interrupted' ||
      t.status === 'ERROR' ||
      t.status === 'error'
  );

  const panelTitles: Record<GameView, string> = {
    office: 'Văn phòng',
    team: 'Đội agent',
    tasks: 'Công việc',
    history: 'Lịch sử',
    settings: 'Cài đặt & hướng dẫn'
  };

  return (
    <div className="game-app">
      {/* 1. AUTO-FILL WORLD VIEWPORT */}
      <section id="officeView" className="world-viewport" aria-label="Văn phòng pixel tương tác">
        <PixelOfficeCanvas
          agents={agents}
          tasks={tasks}
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgent}
          isMotionPaused={motionPaused}
          isDecorating={isDecorating}
          furniture={furniture}
          onUpdateFurniture={handleUpdateFurniture}
          selectedCatalogItem={selectedCatalogItem}
          onSelectCatalogItem={setSelectedCatalogItem}
          selectedPlacedItem={selectedPlacedItem}
          onSelectPlacedItem={setSelectedPlacedItem}
          isDeleteMode={isDeleteMode}
          onDeletePlacedItem={handleDeletePlacedItem}
        />
      </section>

      {/* LOGIN PROMPT BANNER (Hiển thị khi mở website trên Vercel / máy khác chưa đăng nhập) */}
      {isSupabaseActive && !authSession && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 251, 240, 0.96)',
            padding: '24px 32px',
            borderRadius: '12px',
            border: '3px solid #2d3748',
            boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
            zIndex: 90,
            maxWidth: '380px',
            width: '90%'
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏢</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: '#1a202c' }}>
            Pixel Office Cloud
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
            Vui lòng đăng nhập để mở văn phòng, tải 7 Agent và kết nối với máy Windows Runner của bạn.
          </p>
          <button
            className="primary"
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '3px 3px 0px #1e293b'
            }}
            onClick={() => setIsAuthModalOpen(true)}
          >
            🔑 Đăng nhập văn phòng
          </button>
        </div>
      )}

      {/* 2. TOP BRAND TITLE */}
      <div className="world-title">
        <div className="studio-mark">ao<span>✦</span></div>
        <div>
          <div className="eyebrow">YOUR VIRTUAL WORKPLACE / 01</div>
          <h1>The Workroom<span>.</span></h1>
          <div className="world-sub">Một không gian. Cả đội của bạn.</div>
        </div>
      </div>

      {/* 2b. ACTIVE TASK HUD BANNER (Hiển thị nổi bật khi có Agent đang chạy) */}
      {activeTasks.size > 0 && (
        <div className="active-task-hud-container">
          {Array.from(activeTasks.entries()).map(([agId, actTask]) => {
            const ag = agents.find((a) => a.id === agId);
            const agIdx = agents.findIndex((a) => a.id === agId);
            return (
              <div
                key={agId}
                className="active-task-hud"
                role="button"
                tabIndex={0}
                onClick={() => setDetailTask(actTask)}
                title="Bấm để mở xem tiến độ và phản hồi trực tiếp"
              >
                <div className="avatar-mini hud-avatar">
                  {ag && <ChibiPortrait index={agIdx >= 0 ? agIdx : 0} agent={ag} />}
                </div>
                <div className="hud-info">
                  <div className="hud-title">
                    <span className="hud-pulse">⚡</span>
                    <strong>{ag?.name || 'Agent'} đang làm việc:</strong>
                    <span className="hud-task-name">{actTask.title || actTask.prompt.slice(0, 35)}</span>
                  </div>
                  <div className="hud-activity">
                    {actTask.current_activity || 'Đang kết nối Antigravity CLI...'}
                  </div>
                </div>
                <button
                  type="button"
                  className="hud-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailTask(actTask);
                  }}
                >
                  👁️ Xem trực tiếp
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 2c. COMPLETION ALERT BANNER (Thông báo hoàn tất công việc) */}
      {completionAlert && (
        <div className="completion-alert" role="alert">
          <div className="completion-alert-icon">🎉</div>
          <div className="completion-alert-text">
            <strong>{completionAlert.agentName} đã hoàn thành công việc!</strong>
            <p title={completionAlert.taskTitle}>"{completionAlert.taskTitle}"</p>
          </div>
          <div className="completion-alert-actions">
            <button
              className="primary small"
              onClick={async () => {
                let targetTask = tasks.find((t) => t.id === completionAlert.taskId);
                if (!targetTask) {
                  try {
                    const res = await fetch(`/api/tasks`);
                    if (res.ok) {
                      const allTasks: Task[] = await res.json();
                      targetTask = allTasks.find((t) => t.id === completionAlert.taskId);
                    }
                  } catch {}
                }
                if (targetTask) setDetailTask(targetTask);
                setCompletionAlert(null);
              }}
            >
              📖 Xem báo cáo kết quả
            </button>
            <button
              className="small"
              onClick={() => setCompletionAlert(null)}
              title="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. TOP BADGE */}
      <div className="world-badge">
        <i
          style={{
            backgroundColor: isSupabaseActive
              ? isRunnerOnline
                ? '#22c55e'
                : '#ef4444'
              : wsConnected
              ? '#77915c'
              : '#d97706'
          }}
        ></i>
        <span id="worldCount">{agents.length} thành viên</span>
        <span className="badge-divider">/</span>
        {isSupabaseActive ? (
          <button
            className="runner-link-btn"
            onClick={() => setIsRunnerModalOpen(true)}
            title="Bấm để xem trạng thái và thư mục Runner Windows"
          >
            {isRunnerOnline ? '🟢 Runner Online' : '🔴 Runner Offline'}
          </button>
        ) : (
          <span>{wsConnected ? 'Antigravity CLI' : 'Đang kết nối...'}</span>
        )}
        {authSession?.user?.email ? (
          <>
            <span className="badge-divider">/</span>
            <span style={{ fontSize: '11px', opacity: 0.85 }} title={authSession.user.email}>
              👤 {authSession.user.email.split('@')[0]}
            </span>
            <button
              className="small"
              style={{
                marginLeft: '4px',
                fontSize: '10px',
                padding: '1px 6px',
                background: 'none',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={async () => {
                await supabase?.auth.signOut();
                setAuthSession(null);
                setOfficeId(null);
                setAgents([]);
                setTasks([]);
                setIsAuthModalOpen(true);
              }}
              title="Đăng xuất"
            >
              Thoát
            </button>
          </>
        ) : isSupabaseActive ? (
          <>
            <span className="badge-divider">/</span>
            <button
              className="primary small"
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                fontWeight: 'bold',
                backgroundColor: '#2563eb',
                color: '#fff',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none'
              }}
              onClick={() => setIsAuthModalOpen(true)}
              title="Bấm để đăng nhập vào văn phòng"
            >
              🔑 Đăng nhập
            </button>
          </>
        ) : null}
      </div>

      {/* 4. BOTTOM HELP TEXT */}
      <div className="world-help">Bấm nhân vật để giao việc</div>

      {/* 5. CAMERA & ANIMATION CONTROLS (Bottom Right) */}
      <div className="camera-tools" role="group" aria-label="Điều khiển văn phòng">
        <button
          id="fullscreen"
          title="Toàn màn hình"
          aria-label="Toàn màn hình"
          onClick={toggleFullscreen}
        >
          ⛶
        </button>
        <button
          id="motionToggle"
          title={motionPaused ? 'Tiếp tục hoạt ảnh' : 'Tạm dừng hoạt ảnh'}
          aria-label="Tạm dừng hoạt ảnh"
          aria-pressed={motionPaused}
          onClick={() => setMotionPaused(!motionPaused)}
        >
          {motionPaused ? '▶' : 'Ⅱ'}
        </button>
      </div>

      {/* 6. FLOATING SELECTION CHIP */}
      {selectedAgent && (
        <div id="selectionChip" className="selection-chip">
          <div className="avatar-mini">
            <ChibiPortrait
              index={agents.findIndex((a) => a.id === selectedAgent.id)}
              agent={selectedAgent}
            />
          </div>
          <div>
            <strong>{selectedAgent.name}</strong>
            <small title={selectedAgent.folder_path}>
              📁 {selectedAgent.folder_path.length > 25 ? '...' + selectedAgent.folder_path.slice(-22) : selectedAgent.folder_path}
            </small>
          </div>
          <button
            className="small"
            onClick={() => setProjectSelectAgentId(selectedAgent.id)}
            title="Đổi thư mục dự án cho Agent này"
          >
            📂 Đổi thư mục
          </button>
          <button
            className="small"
            onClick={() => setDetailedAgent(selectedAgent)}
            title="Tùy chỉnh vai trò và ngoại hình Agent"
          >
            🎨 Ngoại hình
          </button>
          {selectedAgent.isBusy ? (
            <button
              className="primary small"
              onClick={() => {
                const actTask = activeTasks.get(selectedAgent.id);
                if (actTask) setDetailTask(actTask);
                else {
                  const t = tasks.find(
                    (x) => x.agent_id === selectedAgent.id && (x.status === 'RUNNING' || x.status === 'doing')
                  );
                  if (t) setDetailTask(t);
                }
              }}
            >
              ⚡ Xem tiến độ
            </button>
          ) : (
            <>
              {(() => {
                const reviewTask = tasks.find(
                  (x) => x.agent_id === selectedAgent.id && x.status === 'SUCCESS' && x.review_status !== 'approved'
                );
                return reviewTask ? (
                  <button
                    className="primary small"
                    style={{ background: '#2563eb' }}
                    onClick={() => setDetailTask(reviewTask)}
                    title="Xem kết quả vừa hoàn thành chờ bạn duyệt"
                  >
                    📖 Xem kết quả
                  </button>
                ) : null;
              })()}
              <button
                className="primary small"
                onClick={() => handleOpenTaskForm(null, selectedAgent.id)}
              >
                Giao việc
              </button>
            </>
          )}
          <button
            className="small"
            onClick={() => setSelectedAgentId(null)}
            title="Bỏ chọn"
          >
            ✕
          </button>
        </div>
      )}

      {/* 7. SLIDE-UP BOTTOM PANEL */}
      <section
        id="bottomPanel"
        className={`bottom-panel ${currentView === 'office' ? 'hidden' : ''} ${isPanelExpanded ? 'expanded' : ''}`}
        aria-label="Bảng chức năng"
      >
        <div className="drawer-handle"></div>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">WORKSPACE CONTROL</div>
            <h2 id="panelTitle">{panelTitles[currentView]}</h2>
          </div>
          <div className="actions">
            <button
              id="expandPanel"
              className="small"
              aria-label={isPanelExpanded ? 'Thu gọn bảng' : 'Mở rộng bảng'}
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            >
              {isPanelExpanded ? '↕ Thu gọn' : '↕ Mở rộng'}
            </button>
            <button
              id="closePanel"
              className="small"
              aria-label="Đóng bảng"
              onClick={() => switchView('office')}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="drawer-content">
          {/* VIEW: BOARD (CÔNG VIỆC) */}
          {currentView === 'tasks' && (
            <section id="board">
              <div className="board-head">
                <div>
                  <h2>Bảng công việc</h2>
                  <p>Giao việc riêng, theo dõi tiến độ và duyệt kết quả.</p>
                </div>
                <div className="actions">
                  <select
                    id="agentFilter"
                    aria-label="Lọc theo agent"
                    style={{ width: 'auto' }}
                    value={agentFilter}
                    onChange={(e) => setAgentFilter(e.target.value)}
                  >
                    <option value="">Tất cả agent ({agents.length})</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="primary"
                    id="panelNewTask"
                    onClick={() => handleOpenTaskForm()}
                  >
                    ＋ Giao việc
                  </button>
                </div>
              </div>

              <div id="columns" className="columns">
                {/* Col 1: Chờ bắt đầu */}
                <div className="col">
                  <div className="col-title">
                    <span>Chờ bắt đầu</span>
                    <span className="count">{colTodo.length}</span>
                  </div>
                  {colTodo.map((t) => (
                    <TaskCard key={t.id} task={t} agents={agents} onClick={() => setDetailTask(t)} />
                  ))}
                  {colTodo.length === 0 && <div className="empty">Chưa có công việc</div>}
                </div>

                {/* Col 2: Đang làm */}
                <div className="col">
                  <div className="col-title">
                    <span>⚡ Đang làm</span>
                    <span className="count">{colDoing.length}</span>
                  </div>
                  {colDoing.map((t) => (
                    <TaskCard key={t.id} task={t} agents={agents} onClick={() => setDetailTask(t)} />
                  ))}
                  {colDoing.length === 0 && <div className="empty">Chưa có công việc đang chạy</div>}
                </div>

                {/* Col 3: Chờ bạn duyệt */}
                <div className="col">
                  <div className="col-title">
                    <span>Chờ bạn duyệt</span>
                    <span className="count">{colReview.length}</span>
                  </div>
                  {colReview.map((t) => (
                    <TaskCard key={t.id} task={t} agents={agents} onClick={() => setDetailTask(t)} />
                  ))}
                  {colReview.length === 0 && <div className="empty">Chưa có kết quả chờ duyệt</div>}
                </div>

                {/* Col 4: Hoàn tất */}
                <div className="col">
                  <div className="col-title">
                    <span>✓ Hoàn tất</span>
                    <span className="count">{colDone.length}</span>
                  </div>
                  {colDone.map((t) => (
                    <TaskCard key={t.id} task={t} agents={agents} onClick={() => setDetailTask(t)} />
                  ))}
                  {colDone.length === 0 && <div className="empty">Chưa có công việc</div>}
                </div>
              </div>
            </section>
          )}

          {/* VIEW: TEAM (ĐỘI AGENT) */}
          {currentView === 'team' && (
            <section id="teamView">
              <div className="board-head">
                <div>
                  <h2>Đội agent của bạn</h2>
                  <p>Mỗi thành viên, một chuyên môn riêng.</p>
                </div>
                <button
                  id="newAgent"
                  className="primary"
                  onClick={() => handleOpenAgentForm(null)}
                >
                  ＋ Tạo agent
                </button>
              </div>

              <div id="teamCards" className="list-team">
                {agents.map((ag, i) => (
                  <div key={ag.id} className="panel team-card">
                    <div className="avatar" style={{ '--color': ag.color || '#2563eb', marginBottom: '15px' } as any}>
                      <ChibiPortrait index={i} agent={ag} />
                    </div>
                    <h2>{ag.name}</h2>
                    <p>{ag.role}</p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '11px',
                      background: '#f4f6ee',
                      border: '1px solid #e1e7d8',
                      borderRadius: '8px',
                      padding: '5px 9px',
                      margin: '4px 0 12px 0'
                    }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)', fontFamily: 'monospace' }} title={ag.folder_path}>
                        📁 {ag.folder_path}
                      </div>
                      <button
                        type="button"
                        className="small"
                        style={{ padding: '2px 8px', fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}
                        onClick={() => setProjectSelectAgentId(ag.id)}
                        title="Đổi thư mục dự án cho Agent này"
                      >
                        📂 Đổi
                      </button>
                    </div>
                    <div className="actions">
                      <button
                        className="primary small"
                        onClick={() => handleOpenTaskForm(null, ag.id)}
                      >
                        Giao việc
                      </button>
                      <button
                        className="small"
                        onClick={() => setDetailedAgent(ag)}
                        title="Tùy chỉnh vai trò và ngoại hình Agent"
                      >
                        🎨 Ngoại hình
                      </button>
                      <button
                        className="small"
                        onClick={() => handleOpenAgentForm(ag)}
                      >
                        Chỉnh vai trò
                      </button>
                      <button
                        className="small"
                        onClick={() => handleResetConversation(ag.id)}
                        title="Tạo phiên hội thoại mới cho Agent này"
                      >
                        🔄 Phiên mới
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* VIEW: HISTORY (LỊCH SỬ) */}
          {currentView === 'history' && (
            <section id="historyView">
              <div className="board-head">
                <div>
                  <h2>Lịch sử công việc</h2>
                  <p>Kết quả đã duyệt trong văn phòng này.</p>
                </div>
              </div>
              <div id="historyList">
                {doneTasks.length > 0 ? (
                  doneTasks.map((t) => {
                    const ag = agents.find((a) => a.id === t.agent_id);
                    const agIdx = agents.findIndex((a) => a.id === t.agent_id);
                    return (
                      <div
                        key={t.id}
                        className="history-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailTask(t)}
                      >
                        <span className="history-check">✓</span>
                        {ag && (
                          <div className="avatar-mini">
                            <ChibiPortrait index={agIdx >= 0 ? agIdx : 0} agent={ag} />
                          </div>
                        )}
                        <div>
                          <strong>{t.title || t.prompt.slice(0, 50)}</strong>
                          <small>{ag?.name || t.agent_id}</small>
                        </div>
                        <span>Đã duyệt ↗</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty">
                    Chưa có công việc đã duyệt. Kết quả hoàn tất sẽ xuất hiện ở đây.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* VIEW: SETTINGS (CÀI ĐẶT & HƯỚNG DẪN) */}
          {currentView === 'settings' && (
            <section id="settingsView">
              <div className="settings-grid">
                <div>
                  <h2>Vận hành văn phòng đa thiết bị</h2>
                  <p>Mở website trên bất kỳ máy nào, giao việc cho agent chạy trên máy Windows trạm.</p>

                  {isSupabaseActive ? (
                    <div
                      style={{
                        backgroundColor: '#fff',
                        border: '2px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '14px',
                        marginBottom: '16px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '10px'
                        }}
                      >
                        <div>
                          <strong>Tài khoản văn phòng:</strong>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {authSession?.user?.email || 'Đã xác thực'}
                          </div>
                        </div>
                        <button
                          className="small"
                          onClick={async () => {
                            await supabase?.auth.signOut();
                            setAuthSession(null);
                            setOfficeId(null);
                            setIsAuthModalOpen(true);
                          }}
                        >
                          Đăng xuất
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '10px',
                          borderTop: '1px solid #f1f5f9'
                        }}
                      >
                        <div>
                          <strong>Windows Local Runner:</strong>
                          <div style={{ fontSize: '12px', color: isRunnerOnline ? '#16a34a' : '#dc2626' }}>
                            {isRunnerOnline ? '🟢 Đang trực tuyến và sẵn sàng' : '🔴 Ngoại tuyến (chưa chạy start-runner.ps1)'}
                          </div>
                        </div>
                        <button
                          className="primary small"
                          onClick={() => setIsRunnerModalOpen(true)}
                        >
                          Quản lý Runner
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: '6px',
                        padding: '12px',
                        marginBottom: '14px',
                        fontSize: '13px'
                      }}
                    >
                      Đang ở <strong>chế độ Local</strong> (lưu trong SQLite cục bộ).
                      {isSupabaseConfigured() && (
                        <div style={{ marginTop: '8px' }}>
                          <button
                            className="primary small"
                            onClick={() => {
                              localStorage.removeItem('pixel_office_local_mode');
                              setIsLocalOnlyMode(false);
                            }}
                          >
                            Bật chế độ Cloud Supabase
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <ol className="help">
                    <li>Khởi chạy Local Runner trên máy Windows: <code>powershell .\start-runner.ps1</code>.</li>
                    <li>Truy cập website từ bất kỳ máy nào, đăng nhập cùng tài khoản.</li>
                    <li>Giao việc: runner nhận task nguyên tử và thực thi trong đúng thư mục source đã gán.</li>
                    <li>Đóng/mở lại trình duyệt bất kỳ lúc nào để xem tiến độ và kết quả.</li>
                  </ol>
                </div>

                <div>
                  <h2>Thư mục & Cơ chế An toàn</h2>
                  <p>Mỗi agent gắn với một thư mục mã nguồn thật trên máy Windows Runner.</p>
                  <div style={{ margin: '14px 0', fontSize: '13px', lineHeight: '1.6' }}>
                    <div id="saveStatus" className="view-label">
                      ● Chế độ lưu trữ:{' '}
                      <code>
                        {isSupabaseActive ? 'Supabase Postgres + Realtime' : 'SQLite Local (pixel_office.db)'}
                      </code>
                    </div>
                  </div>
                  <p className="help">
                    Nút <strong>Ⅱ</strong> ở góc dưới bên phải chỉ tạm dừng hoạt ảnh bước đi của nhân vật. Nó{' '}
                    <strong>không dừng tiến trình CLI</strong>. Để dừng task thật sự, hãy bấm nút{' '}
                    <strong>🛑 Dừng tác vụ</strong> trong chi tiết công việc.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      {/* 8. FIXED BOTTOM DOCK (Thanh dưới 6 nút) */}
      <div className="dock-wrap">
        <div className="dock-status">
          <span
            className={`status-led ${
              isSupabaseActive
                ? isRunnerOnline
                  ? 'online'
                  : 'offline'
                : activeDoingTasks.length > 0
                ? 'running'
                : ''
            }`}
          ></span>
          <span id="dockSummary">
            {agents.length} agent · {activeDoingTasks.length} đang làm · {reviewTasks.length} chờ duyệt
          </span>
          {isSupabaseActive ? (
            <button
              className="runner-link-btn dock-mode"
              onClick={() => setIsRunnerModalOpen(true)}
              title="Bấm để xem trạng thái và thư mục Windows Runner"
            >
              {isRunnerOnline ? '🟢 RUNNER ONLINE' : '🔴 RUNNER OFFLINE'}
            </button>
          ) : (
            <span className="dock-mode">CLI ENGINE</span>
          )}
        </div>

        <nav className="game-dock" aria-label="Chức năng văn phòng">
          <button
            data-view="office"
            className={currentView === 'office' && !isDecorating ? 'active' : ''}
            onClick={() => {
              if (isDecorating) handleCancelDecorate();
              switchView('office');
            }}
          >
            <span className="dock-icon">{renderSvgIcon('office')}</span>
            <span>Văn phòng</span>
            <i></i>
          </button>

          <button
            type="button"
            className={`dock-decor-btn ${isDecorating ? 'active' : ''}`}
            onClick={handleToggleDecorating}
            title="Bật/Tắt chế độ trang trí văn phòng"
          >
            <span className="dock-icon">{renderSvgIcon('decor')}</span>
            <span>{isDecorating ? 'Đang trang trí' : 'Trang trí'}</span>
            <i></i>
          </button>

          <button
            data-view="team"
            className={currentView === 'team' ? 'active' : ''}
            onClick={() => {
              if (isDecorating) handleCancelDecorate();
              switchView('team');
            }}
          >
            <span className="dock-icon">{renderSvgIcon('team')}</span>
            <span>Đội agent</span>
            <i></i>
          </button>

          <div className="dock-separator"></div>

          <button
            id="newTask"
            className="dock-assign"
            onClick={() => handleOpenTaskForm()}
          >
            <span className="dock-icon">{renderSvgIcon('plus')}</span>
            <span>Giao việc</span>
          </button>

          <div className="dock-separator"></div>

          <button
            data-view="tasks"
            className={currentView === 'tasks' ? 'active' : ''}
            onClick={() => switchView('tasks')}
          >
            <span className="dock-icon">{renderSvgIcon('tasks')}</span>
            <span>Công việc</span>
            {activeDoingTasks.length > 0 && (
              <span className="dock-badge badge-running">⚡ {activeDoingTasks.length}</span>
            )}
            {activeDoingTasks.length === 0 && reviewTasks.length > 0 && (
              <span className="dock-badge badge-review">{reviewTasks.length}</span>
            )}
            <i></i>
          </button>

          <button
            data-view="history"
            className={currentView === 'history' ? 'active' : ''}
            onClick={() => switchView('history')}
          >
            <span className="dock-icon">{renderSvgIcon('history')}</span>
            <span>Lịch sử</span>
            <i></i>
          </button>

          <button
            data-view="settings"
            className={currentView === 'settings' ? 'active' : ''}
            onClick={() => switchView('settings')}
          >
            <span className="dock-icon">{renderSvgIcon('settings')}</span>
            <span>Cài đặt</span>
            <i></i>
          </button>
        </nav>
      </div>

      {/* 9. MODALS / DIALOGS */}
      {/* AGENT EDIT MODAL (Chỉnh sửa vai trò & Ngoại hình) */}
      {isAgentModalOpen && editingAgent && (
        <AgentEditModal
          agent={editingAgent}
          onClose={() => setIsAgentModalOpen(false)}
          onSave={async (updated) => {
            await handleUpdateAgent(editingAgent.id, updated);
          }}
          onDelete={() => handleDeleteAgent(editingAgent.id)}
        />
      )}

      {/* AGENT CREATE MODAL */}
      {isAgentModalOpen && !editingAgent && (
        <dialog open id="modal">
          <div className="modal-head">
            <h2 id="modalTitle">Thêm thành viên mới</h2>
            <button className="small" onClick={() => setIsAgentModalOpen(false)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSaveAgentForm} id="agentForm">
              <label htmlFor="aName">Tên agent</label>
              <input
                id="aName"
                name="aName"
                maxLength={40}
                required
                placeholder="Ví dụ: Hoàng"
              />

              <label htmlFor="aRole">Vai trò / chuyên môn</label>
              <input
                id="aRole"
                name="aRole"
                maxLength={100}
                required
                placeholder="Ví dụ: Backend Developer"
              />

              <label htmlFor="aBrief">Hướng dẫn làm việc</label>
              <textarea
                id="aBrief"
                name="aBrief"
                maxLength={8000}
                required
                placeholder="Chuyên môn, cách trả lời, tiêu chí đầu ra…"
              />

              <label htmlFor="aFolder">Thư mục nguồn dự án</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="aFolder"
                  name="aFolder"
                  required
                  defaultValue="C:\\"
                />
                <button
                  type="button"
                  className="small"
                  onClick={() => setProjectSelectAgentId('new')}
                >
                  Chọn dự án
                </button>
              </div>

              <label htmlFor="aColor">Màu đại diện</label>
              <input
                type="color"
                id="aColor"
                name="aColor"
                defaultValue="#2563eb"
              />

              <div className="modal-actions">
                <button type="submit" className="primary">
                  Lưu agent
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* DETAILED AGENT MODAL (Giao Task, Ngoại hình Chibi trực tiếp, Lịch sử) */}
      {detailedAgent && (
        <AgentModal
          agent={detailedAgent}
          onClose={() => setDetailedAgent(null)}
          onUpdateAgent={async (updated) => {
            await handleUpdateAgent(detailedAgent.id, updated);
            setDetailedAgent((prev) => (prev ? { ...prev, ...updated } : null));
          }}
          onAssignTask={async (_prompt) => {
            handleOpenTaskForm(null, detailedAgent.id);
            setDetailedAgent(null);
          }}
          onStopTask={async () => {
            await handleStopTask(detailedAgent.id);
          }}
          onResetConversation={async () => {
            await handleResetConversation(detailedAgent.id);
          }}
          activeTask={activeTasks.get(detailedAgent.id)}
          tasks={tasks.filter((t) => t.agent_id === detailedAgent.id)}
        />
      )}

      {/* FURNITURE CATALOG DOCK (DECORATION MODE) */}
      <FurnitureCatalogDock
        isOpen={isDecorating}
        onClose={handleCancelDecorate}
        selectedCatalogItem={selectedCatalogItem}
        onSelectCatalogItem={(item) => {
          setSelectedCatalogItem(item);
          if (item) setIsDeleteMode(false);
        }}
        selectedPlacedItem={selectedPlacedItem}
        onSelectPlacedItem={setSelectedPlacedItem}
        onDeletePlacedItem={handleDeletePlacedItem}
        onAssignDeskAgent={handleAssignDeskAgent}
        agents={agents}
        canUndo={undoStack.length > 0}
        onUndo={handleUndoDecorate}
        onSave={handleSaveDecorate}
        onCancel={handleCancelDecorate}
        isSaving={isSavingLayout}
        isDeleteMode={isDeleteMode}
        onToggleDeleteMode={() => {
          setIsDeleteMode(!isDeleteMode);
          if (!isDeleteMode) setSelectedCatalogItem(null);
        }}
      />

      {/* TASK FORM MODAL (Giao việc / Chỉnh sửa công việc) */}
      {isTaskFormModalOpen && (
        <dialog open id="modal">
          <div className="modal-head">
            <h2 id="modalTitle">{editingTask ? 'Chỉnh sửa công việc' : 'Giao việc cho agent'}</h2>
            <button className="small" onClick={() => setIsTaskFormModalOpen(false)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSaveTaskForm} id="taskForm">
              <label htmlFor="tAgent">Giao cho</label>
              <select
                id="tAgent"
                name="tAgent"
                value={taskFormAgentId}
                onChange={(e) => setTaskFormAgentId(e.target.value)}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.role}
                  </option>
                ))}
              </select>

              {(() => {
                const curAg = agents.find((a) => a.id === taskFormAgentId);
                return curAg ? (
                  <div style={{ background: '#f4f6f1', border: '1px solid #d4ded0', borderRadius: '8px', padding: '8px 12px', margin: '8px 0 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#2a624d', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={curAg.folder_path}>
                      📁 <strong>Thư mục nguồn:</strong> {curAg.folder_path}
                    </span>
                    <button
                      type="button"
                      className="small"
                      onClick={() => setProjectSelectAgentId(curAg.id)}
                      title="Chọn thư mục nguồn cho Agent"
                    >
                      📂 Đổi thư mục
                    </button>
                  </div>
                ) : null;
              })()}

              <label htmlFor="tTitle">Tên công việc</label>
              <input
                id="tTitle"
                name="tTitle"
                maxLength={160}
                required
                placeholder="Ví dụ: Kiểm tra mã nguồn và tối ưu cấu trúc"
                defaultValue={editingTask?.title || ''}
              />

              <label htmlFor="tDetail">Yêu cầu & đầu ra mong muốn</label>
              <textarea
                id="tDetail"
                name="tDetail"
                maxLength={30000}
                required
                placeholder="Mục tiêu, bối cảnh, thông tin đầu vào, định dạng kết quả…"
                defaultValue={editingTask?.prompt || ''}
              />

              <label htmlFor="tPriority">Ưu tiên</label>
              <select
                id="tPriority"
                name="tPriority"
                defaultValue={editingTask?.priority || 'Bình thường'}
              >
                <option value="Bình thường">Bình thường</option>
                <option value="Quan trọng">Quan trọng</option>
                <option value="Gấp">Gấp</option>
              </select>

              {editingTask && (
                <p className="help">
                  Sửa yêu cầu sẽ lưu lại thông tin công việc để tiếp tục thực hiện hoặc tham khảo.
                </p>
              )}

              <div className="modal-actions">
                <button type="submit" className="primary">
                  {editingTask ? 'Lưu thay đổi' : 'Tạo công việc'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* TASK DETAIL MODAL (Chi tiết công việc & Duyệt / Góp ý) */}
      {detailTask && (
        <dialog open id="modal">
          <div className="modal-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {(() => {
                const ag = agents.find((a) => a.id === detailTask.agent_id);
                const agIdx = agents.findIndex((a) => a.id === detailTask.agent_id);
                return ag ? (
                  <div className="avatar-mini" style={{ width: '32px', height: '32px' }}>
                    <ChibiPortrait index={agIdx >= 0 ? agIdx : 0} agent={ag} />
                  </div>
                ) : null;
              })()}
              <h2 id="modalTitle">{detailTask.title || detailTask.prompt.slice(0, 50)}</h2>
            </div>
            <button className="small" onClick={() => setDetailTask(null)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            {/* Status & actions */}
            <div className="actions" style={{ marginBottom: '14px' }}>
              <span className={`pill ${detailTask.status === 'RUNNING' || detailTask.status === 'doing' ? 'pill-doing' : detailTask.status === 'SUCCESS' ? 'pill-done' : ''}`}>
                {detailTask.status === 'RUNNING' || detailTask.status === 'doing'
                  ? '⚡ Đang làm'
                  : detailTask.status === 'SUCCESS' && detailTask.review_status === 'approved'
                  ? '✓ Hoàn tất'
                  : detailTask.status === 'SUCCESS'
                  ? 'Chờ bạn duyệt'
                  : detailTask.status === 'INTERRUPTED'
                  ? 'Gián đoạn'
                  : 'Lỗi'}
              </span>
              <span className="view-label">
                {agents.find((a) => a.id === detailTask.agent_id)?.name} · {detailTask.priority || 'Bình thường'}
              </span>
              <button
                className="small"
                onClick={() => {
                  setDetailTask(null);
                  handleOpenTaskForm(detailTask, detailTask.agent_id);
                }}
              >
                Chỉnh việc
              </button>
              <button
                className="small"
                onClick={() => handleResetConversation(detailTask.agent_id)}
                title="Tạo phiên hội thoại mới cho Agent này"
              >
                🔄 Phiên mới
              </button>
            </div>

            {/* Source Folder Path */}
            <div style={{ background: '#f4f6f1', border: '1px solid #d4ded0', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#2a624d', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detailTask.folder_path}>
                📁 <strong>Folder:</strong> {detailTask.folder_path}
              </span>
              {detailTask.status !== 'RUNNING' && detailTask.status !== 'running' && (
                <button
                  type="button"
                  className="small"
                  onClick={() => setProjectSelectAgentId(detailTask.agent_id)}
                  title="Chọn thư mục mới cho Agent"
                >
                  📂 Đổi thư mục
                </button>
              )}
            </div>

            {/* Prompt Requirement */}
            <label>Yêu cầu ban đầu</label>
            <div className="result">{detailTask.prompt}</div>

            {/* If Task is Running: Live progress stream and STOP button */}
            {(detailTask.status === 'RUNNING' || detailTask.status === 'doing') && (
              <div style={{ marginTop: '16px', background: '#fef3c7', padding: '14px', borderRadius: '10px', border: '1px solid #fcd34d' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: '#92400e' }}>
                    ⚡ Đang chạy trên Antigravity CLI...
                  </strong>
                  <button
                    className="danger small"
                    onClick={() => handleStopTask(detailTask.agent_id)}
                    title="Dừng tiến trình CLI thật sự"
                  >
                    🛑 Dừng tác vụ (Stop CLI)
                  </button>
                </div>
                {activeTasks.get(detailTask.agent_id)?.current_activity && (
                  <p style={{ margin: '4px 0 8px 0', fontSize: '12px', color: '#78350f' }}>
                    ⚙️ {activeTasks.get(detailTask.agent_id)?.current_activity}
                  </p>
                )}
                <label>Phản hồi trực tiếp từ CLI:</label>
                <div className="result" style={{ background: '#ffffff', maxHeight: '200px' }}>
                  {activeTasks.get(detailTask.agent_id)?.response_text || 'Đang kết nối Antigravity CLI...'}
                </div>
              </div>
            )}

            {/* Result display */}
            {detailTask.status !== 'RUNNING' && detailTask.status !== 'doing' && (
              <div style={{ marginTop: '14px' }}>
                <label>Kết quả từ Agent</label>
                <div className="result">
                  {detailTask.response_text || 'Chưa có kết quả phản hồi từ tiến trình.'}
                </div>
              </div>
            )}

            {/* Approve button */}
            {detailTask.status === 'SUCCESS' && detailTask.review_status !== 'approved' && (
              <div className="modal-actions" style={{ marginTop: '14px' }}>
                <button
                  className="primary"
                  onClick={() => handleApproveTask(detailTask.id)}
                >
                  ✓ Duyệt hoàn tất
                </button>
              </div>
            )}

            {/* Revision feedback */}
            <div style={{ marginTop: '16px' }}>
              <label>Góp ý / Yêu cầu chỉnh sửa</label>
              <textarea
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Cần sửa gì? Nhập yêu cầu để Agent tiếp tục chỉnh sửa trong cùng phiên làm việc..."
                defaultValue={detailTask.feedback || ''}
              />
              <button
                className="small"
                style={{ marginTop: '8px' }}
                onClick={() => handleReviseTask(detailTask.id, feedbackInput)}
              >
                Yêu cầu chỉnh sửa
              </button>
            </div>

            {/* Bottom actions */}
            <div className="modal-actions" style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
              <button
                className="danger small"
                onClick={() => handleDeleteTask(detailTask.id)}
              >
                Xóa công việc
              </button>
              <button
                className="small"
                onClick={() => handleDuplicateTask(detailTask)}
              >
                Nhân bản
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          getOrCreateOfficeId().then((oid) => {
            if (oid) setOfficeId(oid);
          });
        }}
        onUseLocalMode={() => {
          localStorage.setItem('pixel_office_local_mode', 'true');
          setIsLocalOnlyMode(true);
          setIsAuthModalOpen(false);
          loadAgents().then((ag) => {
            if (ag) loadAllTasks(ag);
          });
        }}
      />

      {/* RUNNER MANAGEMENT MODAL */}
      <RunnerModal
        isOpen={isRunnerModalOpen}
        onClose={() => setIsRunnerModalOpen(false)}
        runners={runners}
        projects={projects}
        onRefresh={loadRunnersAndProjects}
      />

      {/* PROJECT SELECT MODAL (Runner Registered Projects) */}
      <ProjectSelectModal
        isOpen={Boolean(projectSelectAgentId)}
        projects={projects}
        currentPath={
          projectSelectAgentId === 'new'
            ? ''
            : agents.find((a) => a.id === projectSelectAgentId)?.folder_path || ''
        }
        onClose={() => setProjectSelectAgentId(null)}
        onOpenLocalPicker={() => {
          setFolderBrowserAgentId(projectSelectAgentId);
          setProjectSelectAgentId(null);
        }}
        onSelect={async (newPath) => {
          if (projectSelectAgentId && projectSelectAgentId !== 'new') {
            if (isSupabaseActive && supabase) {
              const { error } = await supabase
                .from('agents')
                .update({ folder_path: newPath })
                .eq('id', projectSelectAgentId);
              if (!error) {
                setAgents((prev) =>
                  prev.map((a) => (a.id === projectSelectAgentId ? { ...a, folder_path: newPath } : a))
                );
                showToast(`Đã đổi thư mục dự án: ${newPath}`);
              } else {
                showToast(`Lỗi: ${error.message}`);
              }
            } else {
              try {
                const res = await fetch(`/api/agents/${projectSelectAgentId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folder_path: newPath })
                });
                if (res.ok) {
                  await loadAgents();
                  showToast(`Đã đổi thư mục: ${newPath}`);
                }
              } catch (err: any) {
                showToast(`Lỗi: ${err.message}`);
              }
            }
          }

          const folderInput = document.getElementById('aFolder') as HTMLInputElement | null;
          if (folderInput) folderInput.value = newPath;
          if (editingAgent) {
            setEditingAgent((prev) => (prev ? { ...prev, folder_path: newPath } : null));
          }
          setProjectSelectAgentId(null);
        }}
      />

      {/* FOLDER BROWSER MODAL (Windows folder picker fallback) */}
      {folderBrowserAgentId && (
        <FolderBrowserModal
          initialPath={
            folderBrowserAgentId === 'new'
              ? 'C:\\'
              : agents.find((a) => a.id === folderBrowserAgentId)?.folder_path || 'C:\\'
          }
          onSelect={async (newPath) => {
            if (folderBrowserAgentId !== 'new') {
              if (isSupabaseActive && supabase) {
                const { error } = await supabase
                  .from('agents')
                  .update({ folder_path: newPath })
                  .eq('id', folderBrowserAgentId);
                if (!error) {
                  setAgents((prev) =>
                    prev.map((a) => (a.id === folderBrowserAgentId ? { ...a, folder_path: newPath } : a))
                  );
                  showToast(`Đã đổi thư mục: ${newPath}`);
                } else {
                  showToast(`Lỗi: ${error.message}`);
                }
              } else {
                try {
                  const res = await fetch(`/api/agents/${folderBrowserAgentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folder_path: newPath })
                  });
                  if (res.ok) {
                    await loadAgents();
                    showToast(`Đã đổi thư mục: ${newPath}`);
                  } else {
                    const errData = await res.json();
                    showToast(`Lỗi: ${errData.error || 'Không thể lưu thư mục'}`);
                  }
                } catch (err: any) {
                  showToast(`Lỗi mạng: ${err.message}`);
                }
              }
            }
            // Update input if in form
            const folderInput = document.getElementById('aFolder') as HTMLInputElement | null;
            if (folderInput) folderInput.value = newPath;
            if (editingAgent) {
              setEditingAgent((prev) => (prev ? { ...prev, folder_path: newPath } : null));
            }
            setFolderBrowserAgentId(null);
          }}
          onClose={() => setFolderBrowserAgentId(null)}
        />
      )}

      {/* 10. TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// Chibi Portrait Component for team cards / lists
const ChibiPortrait: React.FC<{ index: number; agent: Agent }> = ({ index, agent }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawAgentSprite(
      canvasRef.current,
      {
        index,
        agent
      },
      'down',
      0
    );
  }, [index, agent, agent.avatar, agent.color]);

  return <canvas ref={canvasRef} width={32} height={40} aria-hidden="true" />;
};

// Kanban Task Card Component
const TaskCard: React.FC<{ task: Task; agents: Agent[]; onClick: () => void }> = ({
  task,
  agents,
  onClick
}) => {
  const agent = agents.find((a) => a.id === task.agent_id);
  const agentIndex = agents.findIndex((a) => a.id === task.agent_id);
  const title = task.title || task.prompt.slice(0, 50);

  return (
    <div className="task" role="button" tabIndex={0} onClick={onClick}>
      <span className="tag">{task.priority || 'Bình thường'}</span>
      <strong>{title}</strong>
      <p>{task.prompt}</p>
      <div className="task-foot">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {agent && (
            <div className="avatar-mini" style={{ width: '22px', height: '22px', borderRadius: '5px' }}>
              <ChibiPortrait index={agentIndex >= 0 ? agentIndex : 0} agent={agent} />
            </div>
          )}
          <span>{agent?.name || 'Agent'}</span>
        </span>
        <span>
          {new Date(task.started_at).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
};

// SVG Icon renderer matching ChatGPT reference
function renderSvgIcon(name: string) {
  const icons: Record<string, string> = {
    office:
      '<path d="M3 10 12 3l9 7v10H3Z"/><path d="M9 20v-7h6v7M7 9h.01M17 9h.01"/>',
    decor:
      '<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/>',
    team:
      '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v3"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    tasks:
      '<rect x="5" y="4" width="15" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h7M9 15h7"/>',
    history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v6l4 2"/>',
    settings:
      '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>'
  };

  const pathSvg = icons[name] || '';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: pathSvg }}
    />
  );
}
