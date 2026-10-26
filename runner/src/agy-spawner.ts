import { spawn, exec, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';

export interface ProgressCallbackData {
  eventType: 'init' | 'tool' | 'text_delta' | 'completed' | 'error' | 'interrupted';
  currentActivity?: string;
  responseDelta?: string;
  finalStatus?: 'success' | 'error' | 'interrupted';
  errorText?: string;
  durationSeconds?: number;
  payload?: any;
}

export type ProgressCallback = (data: ProgressCallbackData) => Promise<void> | void;

export interface ActiveExecution {
  child: ChildProcess;
  taskId: string;
  agentId: string;
  isStopping?: boolean;
}

let activeExecution: ActiveExecution | null = null;

export function getActiveExecution(): ActiveExecution | null {
  return activeExecution;
}

export function findAgyBinary(): string {
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\Default';
  const geminiAgyPath = path.join(userProfile, '.gemini', 'bin', 'agy.exe');
  if (fs.existsSync(geminiAgyPath)) {
    return geminiAgyPath;
  }

  const localAppData =
    process.env.LOCALAPPDATA ||
    path.join(userProfile, 'AppData\\Local');
  const standardAgyPath = path.join(localAppData, 'agy', 'bin', 'agy.exe');

  if (fs.existsSync(standardAgyPath)) {
    return standardAgyPath;
  }
  return 'agy.exe'; // fallback to PATH
}

export function formatToolActivity(toolName: string, params: any): string {
  switch (toolName) {
    case 'read_file':
    case 'view_file':
      return `Đang đọc file: ${params?.Path || params?.AbsolutePath ? path.basename(params.Path || params.AbsolutePath) : ''}`;
    case 'write_to_file':
    case 'replace_file_content':
    case 'multi_replace_file_content':
      return `Đang cập nhật file: ${params?.TargetFile ? path.basename(params.TargetFile) : ''}`;
    case 'run_command':
      return `Đang thực thi lệnh: ${params?.CommandLine ? params.CommandLine.slice(0, 45) : ''}...`;
    case 'list_dir':
      return `Đang kiểm tra thư mục: ${params?.DirectoryPath ? path.basename(params.DirectoryPath) : ''}`;
    case 'grep_search':
      return `Đang tìm kiếm mã nguồn: "${params?.Query || ''}"...`;
    default:
      return `Đang thực thi công cụ: ${toolName}`;
  }
}

export async function executeTaskWithAgy(
  taskId: string,
  agentId: string,
  prompt: string,
  folderPath: string,
  existingConversationId: string | null,
  onProgress: ProgressCallback
): Promise<void> {
  if (activeExecution) {
    throw new Error('Runner đang bận thực thi một tác vụ khác.');
  }

  // Verify folderPath exists on Windows machine
  if (!fs.existsSync(folderPath)) {
    const errorMsg = `Thư mục dự án không tồn tại trên máy runner: ${folderPath}`;
    console.error(`[Runner] ${errorMsg}`);
    await onProgress({
      eventType: 'error',
      finalStatus: 'error',
      errorText: errorMsg
    });
    return;
  }

  const binary = findAgyBinary();
  const args: string[] = ['--dangerously-skip-permissions'];

  if (existingConversationId && existingConversationId.trim().length > 0) {
    args.push('--conversation', existingConversationId.trim());
  }

  args.push('--print', prompt);
  args.push('--output-format', 'stream-json');

  console.log(`[Runner] Spawning agy for agent ${agentId} (task ${taskId}) in: ${folderPath}`);
  console.log(`[Runner] Executable: ${binary}`);

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
    const errorMsg = `Không thể khởi chạy Antigravity CLI: ${err.message}`;
    console.error(`[Runner] ${errorMsg}`);
    await onProgress({
      eventType: 'error',
      finalStatus: 'error',
      errorText: errorMsg
    });
    return;
  }

  const execution: ActiveExecution = { child, taskId, agentId };
  activeExecution = execution;

  let accumulatedResponse = '';
  let activeConversationId = existingConversationId;

  if (child.stdout) {
    const rl = readline.createInterface({
      input: child.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('{')) return;

      try {
        const payload = JSON.parse(trimmed);

        // 1. Init event
        if (payload.event === 'init') {
          activeConversationId = payload.conversation_id || null;
          await onProgress({
            eventType: 'init',
            currentActivity: 'Khởi tạo phiên làm việc...',
            payload: {
              conversation_id: activeConversationId,
              cwd: payload.init?.cwd
            }
          });
        }

        // 2. Step update event
        else if (payload.event === 'step_update' && payload.step_update) {
          const step = payload.step_update;

          // Tool activity event
          if (step.step_type === 'tool' && step.tool_name) {
            const toolDesc = formatToolActivity(step.tool_name, step.tool_info?.parameters);
            await onProgress({
              eventType: 'tool',
              currentActivity: toolDesc,
              payload: {
                toolName: step.tool_name,
                activity: toolDesc,
                state: step.state
              }
            });
          }

          // Text delta event (only response text, thoughts are stripped)
          else if (step.step_type === 'agent_response' && step.text_delta) {
            accumulatedResponse += step.text_delta;
            await onProgress({
              eventType: 'text_delta',
              responseDelta: step.text_delta,
              payload: {
                fullText: accumulatedResponse
              }
            });
          }
        }

        // 3. Result event
        else if (payload.event === 'result' && payload.result) {
          const res = payload.result;
          const status = res.status === 'SUCCESS' ? 'success' : 'error';
          const finalText = res.response || accumulatedResponse;
          const errorMsg = res.error || undefined;
          const duration = res.duration_seconds || undefined;

          await onProgress({
            eventType: status === 'success' ? 'completed' : 'error',
            finalStatus: status,
            responseDelta: '',
            errorText: errorMsg,
            durationSeconds: duration,
            payload: {
              response: finalText,
              conversation_id: activeConversationId
            }
          });
        }
      } catch (parseErr) {
        // Not JSON, ignore
      }
    });
  }

  let stderrOutput = '';
  if (child.stderr) {
    child.stderr.on('data', (chunk) => {
      stderrOutput += chunk.toString();
    });
  }

  return new Promise<void>((resolve) => {
    child.on('close', async (code) => {
      console.log(`[Runner] agy exited with code ${code} for task ${taskId}`);
      const wasStopping = activeExecution?.isStopping;
      activeExecution = null;

      if (wasStopping) {
        await onProgress({
          eventType: 'interrupted',
          finalStatus: 'interrupted',
          errorText: 'Người dùng đã dừng tiến trình trên website.'
        });
      } else if (code !== 0 && !accumulatedResponse) {
        await onProgress({
          eventType: 'error',
          finalStatus: 'error',
          errorText: stderrOutput.trim() || `CLI exited with code ${code}`
        });
      }
      resolve();
    });

    child.on('error', async (err) => {
      console.error(`[Runner] Process error:`, err);
      activeExecution = null;
      await onProgress({
        eventType: 'error',
        finalStatus: 'error',
        errorText: `Lỗi tiến trình: ${err.message}`
      });
      resolve();
    });
  });
}

export function stopActiveExecution(): boolean {
  if (!activeExecution || !activeExecution.child) {
    return false;
  }

  activeExecution.isStopping = true;
  const pid = activeExecution.child.pid;

  if (pid) {
    console.log(`[Runner] Terminating process tree for PID ${pid}...`);
    try {
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          console.warn(`[Runner] taskkill note:`, err.message);
        }
      });
    } catch {
      activeExecution.child.kill('SIGKILL');
    }
  }
  return true;
}
