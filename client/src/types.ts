export interface AgentAvatar {
  skinColor?: string;
  hairStyle?: string;
  hairColor?: string;
  clothesColor?: string;
  accessory?: string;
  spriteVariant?: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  system_instructions: string;
  brief?: string;
  color?: string;
  spriteVariant?: number;
  folder_path: string;
  conversation_id: string | null;
  avatar: AgentAvatar;
  desk_x: number;
  desk_y: number;
  isBusy: boolean;
  activeTaskId: string | null;
}

export interface Task {
  id: string;
  agent_id: string;
  prompt: string;
  title?: string;
  priority?: string;
  feedback?: string;
  review_status?: string;
  folder_path: string;
  conversation_id: string | null;
  status:
    | 'RUNNING'
    | 'SUCCESS'
    | 'ERROR'
    | 'INTERRUPTED'
    | 'todo'
    | 'doing'
    | 'review'
    | 'done'
    | 'queued'
    | 'running'
    | 'success'
    | 'error'
    | 'interrupted';
  current_activity: string | null;
  response_text: string;
  error_text: string | null;
  duration_seconds: number | null;
  started_at: number;
  completed_at: number | null;
}

export interface CliStreamEvent {
  type: 'init' | 'tool' | 'text_delta' | 'completed' | 'error' | 'interrupted';
  agentId: string;
  taskId: string;
  conversationId?: string;
  data?: any;
}
