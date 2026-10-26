import { spawn, exec, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';
import { db } from './db';

export interface CliStreamEvent {
  type: 'init' | 'tool' | 'text_delta' | 'completed' | 'error' | 'interrupted';
  agentId: string;
  taskId: string;
  conversationId?: string;
  data?: any;
}

export type EventBroadcaster = (event: CliStreamEvent) => void;

interface ActiveRun {
  child: ChildProcess;
  taskId: string;
  agentId: string;
  isStopping?: boolean;
}

const activeRuns = new Map<string, ActiveRun>();
let broadcaster: EventBroadcaster = () => {};

export function setBroadcaster(fn: EventBroadcaster) {
  broadcaster = fn;
}

export function isAgentBusy(agentId: string): boolean {
  return activeRuns.has(agentId);
}

export function getActiveTaskId(agentId: string): string | undefined {
  return activeRuns.get(agentId)?.taskId;
}

export function findAgyBinary(): string {
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\Default';
  const geminiAgyPath = path.join(userProfile, '.gemini', 'bin', 'agy.exe');
  if (fs.existsSync(geminiAgyPath)) {
    return geminiAgyPath;
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData\\Local');
  const standardAgyPath = path.join(localAppData, 'agy', 'bin', 'agy.exe');
  
  if (fs.existsSync(standardAgyPath)) {
    return standardAgyPath;
  }
  return 'agy.exe'; // fallback to PATH
}

export async function executeAgentTask(
  agentId: string,
  taskId: string,
  prompt: string,
  folderPath: string,
  existingConversationId: string | null
): Promise<void> {
  if (activeRuns.has(agentId)) {
    throw new Error('Agent đang bận thực hiện một tác vụ khác.');
  }

  const binary = findAgyBinary();
  const args: string[] = ['--dangerously-skip-permissions'];

  if (existingConversationId && existingConversationId.trim().length > 0) {
    args.push('--conversation', existingConversationId.trim());
  }

  args.push('--print', prompt);
  args.push('--output-format', 'stream-json');

  console.log(`[CLI-Runner] Spawning agy for agent ${agentId} in ${folderPath}`);
  console.log(`[CLI-Runner] Command: ${binary} ${args.join(' ')}`);

  let child: ChildProcess;
  try {
    child = spawn(binary, args, {
      cwd: folderPath,
      windowsHide: true,
      env: {
        ...process.env
      }
    });
  } catch (err: any) {
    db.prepare(`
      UPDATE tasks 
      SET status = 'ERROR', error_text = ?, completed_at = ?
      WHERE id = ?
    `).run(`Không thể khởi chạy Antigravity CLI: ${err.message}`, Date.now(), taskId);

    broadcaster({
      type: 'error',
      agentId,
      taskId,
      data: { error: `Lỗi khởi chạy tiến trình: ${err.message}` }
    });
    return;
  }

  const runInfo: ActiveRun = { child, taskId, agentId };
  activeRuns.set(agentId, runInfo);

  let accumulatedResponse = '';
  let activeConversationId = existingConversationId;

  if (child.stdout) {
    const rl = readline.createInterface({
      input: child.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('{')) return;

      try {
        const payload = JSON.parse(trimmed);

        // 1. Init event
        if (payload.event === 'init') {
          activeConversationId = payload.conversation_id || null;
          if (activeConversationId) {
            // Persist conversation ID to agent record if not set
            db.prepare('UPDATE agents SET conversation_id = ? WHERE id = ?').run(activeConversationId, agentId);
            db.prepare('UPDATE tasks SET conversation_id = ? WHERE id = ?').run(activeConversationId, taskId);
          }

          broadcaster({
            type: 'init',
            agentId,
            taskId,
            conversationId: activeConversationId || undefined,
            data: { cwd: payload.init?.cwd }
          });
        }

        // 2. Step update event
        else if (payload.event === 'step_update' && payload.step_update) {
          const step = payload.step_update;

          // Tool activity event
          if (step.step_type === 'tool' && step.tool_name) {
            const toolDesc = formatToolActivity(step.tool_name, step.tool_info?.parameters);
            db.prepare('UPDATE tasks SET current_activity = ? WHERE id = ?').run(toolDesc, taskId);

            broadcaster({
              type: 'tool',
              agentId,
              taskId,
              data: {
                toolName: step.tool_name,
                activity: toolDesc,
                state: step.state
              }
            });
          }

          // Text delta event (agent response)
          // Note: Thoughts are not in text_delta, so we stream purely clean response content
          else if (step.step_type === 'agent_response' && step.text_delta) {
            accumulatedResponse += step.text_delta;
            db.prepare('UPDATE tasks SET response_text = ? WHERE id = ?').run(accumulatedResponse, taskId);

            broadcaster({
              type: 'text_delta',
              agentId,
              taskId,
              data: {
                delta: step.text_delta,
                fullText: accumulatedResponse
              }
            });
          }
        }

        // 3. Result event
        else if (payload.event === 'result' && payload.result) {
          const res = payload.result;
          const status = res.status === 'SUCCESS' ? 'SUCCESS' : 'ERROR';
          const finalText = res.response || accumulatedResponse;
          const errorMsg = res.error || null;
          const duration = res.duration_seconds || null;

          db.prepare(`
            UPDATE tasks
            SET status = ?, response_text = ?, error_text = ?, duration_seconds = ?, completed_at = ?, current_activity = NULL
            WHERE id = ?
          `).run(status, finalText, errorMsg, duration, Date.now(), taskId);

          broadcaster({
            type: status === 'SUCCESS' ? 'completed' : 'error',
            agentId,
            taskId,
            data: {
              status,
              response: finalText,
              error: errorMsg,
              duration
            }
          });
        }
      } catch (parseErr) {
        // Line was not valid JSON, ignore
      }
    });
  }

  let stderrOutput = '';
  if (child.stderr) {
    child.stderr.on('data', (chunk) => {
      stderrOutput += chunk.toString();
    });
  }

  child.on('close', (code) => {
    console.log(`[CLI-Runner] agy exited with code ${code} for agent ${agentId}`);
    activeRuns.delete(agentId);

    // Verify task status in database
    const currentTask = db.prepare('SELECT status, response_text FROM tasks WHERE id = ?').get(taskId) as { status: string; response_text: string } | undefined;

    if (currentTask && currentTask.status === 'RUNNING') {
      if (runInfo.isStopping) {
        db.prepare(`
          UPDATE tasks
          SET status = 'INTERRUPTED', error_text = 'Người dùng đã dừng tiến trình.', completed_at = ?, current_activity = NULL
          WHERE id = ?
        `).run(Date.now(), taskId);

        broadcaster({
          type: 'interrupted',
          agentId,
          taskId,
          data: { message: 'Tiến trình đã được dừng theo yêu cầu của người dùng.' }
        });
      } else {
        const isSuccess = code === 0;
        const status = isSuccess ? 'SUCCESS' : 'ERROR';
        const errText = !isSuccess ? (stderrOutput.trim() || `CLI exited with code ${code}`) : null;

        db.prepare(`
          UPDATE tasks
          SET status = ?, error_text = ?, completed_at = ?, current_activity = NULL
          WHERE id = ?
        `).run(status, errText, Date.now(), taskId);

        broadcaster({
          type: isSuccess ? 'completed' : 'error',
          agentId,
          taskId,
          data: {
            status,
            response: currentTask.response_text || '',
            error: errText
          }
        });
      }
    }
  });

  child.on('error', (err) => {
    console.error(`[CLI-Runner] Process error for agent ${agentId}:`, err);
    activeRuns.delete(agentId);

    db.prepare(`
      UPDATE tasks
      SET status = 'ERROR', error_text = ?, completed_at = ?, current_activity = NULL
      WHERE id = ?
    `).run(`Lỗi tiến trình: ${err.message}`, Date.now(), taskId);

    broadcaster({
      type: 'error',
      agentId,
      taskId,
      data: { error: err.message }
    });
  });
}

export function stopAgentTask(agentId: string): boolean {
  const run = activeRuns.get(agentId);
  if (!run || !run.child) {
    return false;
  }

  run.isStopping = true;
  const pid = run.child.pid;

  if (pid) {
    try {
      // On Windows, kill process tree cleanly
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          console.warn(`[CLI-Runner] taskkill notice:`, err.message);
        }
      });
    } catch {
      run.child.kill('SIGKILL');
    }
  }

  return true;
}

function formatToolActivity(toolName: string, params: any): string {
  switch (toolName) {
    case 'read_file':
    case 'view_file':
      return `Đang đọc file: ${params?.Path ? path.basename(params.Path) : ''}`;
    case 'write_to_file':
    case 'replace_file_content':
      return `Đang ghi file: ${params?.TargetFile ? path.basename(params.TargetFile) : ''}`;
    case 'run_command':
      return `Đang chạy lệnh terminal: ${params?.CommandLine?.slice(0, 40) || ''}...`;
    case 'list_dir':
      return `Đang kiểm tra danh sách file thư mục...`;
    case 'grep_search':
      return `Đang tìm kiếm mã nguồn: "${params?.Query || ''}"...`;
    default:
      return `Đang thực thi công cụ: ${toolName}`;
  }
}
