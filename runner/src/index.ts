import { createClient } from '@supabase/supabase-js';
import https from 'node:https';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { loadLocalProjects } from './projects';
import {
  executeTaskWithAgy,
  stopActiveExecution,
  getActiveExecution,
  findAgyBinary,
  ProgressCallbackData
} from './agy-spawner';

// 1. Load Environment Configuration
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also fallback to root .env if runner/.env is missing
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const RUNNER_ID = process.env.RUNNER_ID;
const RUNNER_SECRET_TOKEN = process.env.RUNNER_SECRET_TOKEN;
const RUNNER_NAME = process.env.RUNNER_NAME || `Windows Workstation (${os.hostname()})`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ THIẾU CẤU HÌNH SUPABASE!');
  console.error('Vui lòng thiết lập SUPABASE_URL và SUPABASE_ANON_KEY trong file runner/.env.');
  console.error('Ví dụ:\nSUPABASE_URL=https://xyz.supabase.co\nSUPABASE_ANON_KEY=eyJ...\n');
  process.exit(1);
}

if (!RUNNER_ID || !RUNNER_SECRET_TOKEN) {
  console.error('\n❌ RUNNER CHƯA ĐƯỢC GHÉP NỐI!');
  console.error('Vui lòng thiết lập RUNNER_ID và RUNNER_SECRET_TOKEN trong file runner/.env.');
  console.error('Bạn có thể tạo Runner mới từ giao diện web (Vào tab Runner/Cài đặt) hoặc chạy script ghép nối:\n');
  console.error('  powershell .\\start-runner.ps1 -Pair\n');
  process.exit(1);
}

// Compute SHA-256 hash of secret token
const secretTokenHash = crypto.createHash('sha256').update(RUNNER_SECRET_TOKEN).digest('hex');

// Persistent HTTPS Agent with keepAlive connection pooling
const persistentAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 5,
  timeout: 15000
});

// 2. Initialize Supabase Client with robust HTTPS fetch and connection pooling
const httpsFetch: typeof fetch = (input: any, init: any = {}): Promise<Response> => {
  const urlStr = typeof input === 'string' ? input : input.url;
  const u = new URL(urlStr);
  const reqHeaders: Record<string, string> = {};
  if (init.headers) {
    if (typeof init.headers.forEach === 'function') {
      init.headers.forEach((v: string, k: string) => {
        reqHeaders[k] = v;
      });
    } else {
      Object.assign(reqHeaders, init.headers);
    }
  }

  const makeRequest = (attempt = 0): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: init.method || 'GET',
          headers: reqHeaders,
          agent: persistentAgent
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const mockResponse = {
              ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
              status: res.statusCode || 200,
              statusText: res.statusMessage || 'OK',
              headers: new Headers(res.headers as any),
              text: async () => body,
              json: async () => JSON.parse(body || '{}')
            } as unknown as Response;
            resolve(mockResponse);
          });
        }
      );

      req.on('error', async (err: any) => {
        if (attempt < 2 && (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message?.includes('socket hang up'))) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          try {
            const retryRes = await makeRequest(attempt + 1);
            resolve(retryRes);
          } catch (retryErr) {
            reject(retryErr);
          }
        } else {
          reject(err);
        }
      });

      if (init.body) {
        req.write(typeof init.body === 'string' ? init.body : JSON.stringify(init.body));
      }
      req.end();
    });
  };

  return makeRequest();
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: httpsFetch
  }
});

let isRunning = true;
let isPolling = false;

// 3. Heartbeat Function
async function sendHeartbeat(status: 'online' | 'offline' | 'busy') {
  try {
    const activeExec = getActiveExecution();
    const metadata = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      agyBinary: findAgyBinary(),
      activeTaskId: activeExec?.taskId || null,
      activeAgentId: activeExec?.agentId || null,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase.rpc('runner_heartbeat', {
      p_runner_id: RUNNER_ID,
      p_secret_token_hash: secretTokenHash,
      p_status: status,
      p_metadata: metadata
    });

    if (error) {
      console.warn(`[Runner] Heartbeat warning: ${error.message}`);
    } else if (data === false) {
      console.error(`[Runner] ❌ Runner ID hoặc Secret Token không hợp lệ trong văn phòng này.`);
    }
  } catch (err: any) {
    console.warn(`[Runner] Lỗi kết nối gửi heartbeat: ${err.message}`);
  }
}

// 4. Sync Local Projects to Supabase
async function syncProjects() {
  const projects = loadLocalProjects();
  console.log(`[Runner] Đang đồng bộ ${projects.length} thư mục dự án cục bộ lên Supabase...`);

  try {
    const { data, error } = await supabase.rpc('sync_runner_projects', {
      p_runner_id: RUNNER_ID,
      p_secret_token_hash: secretTokenHash,
      p_projects: projects
    });

    if (error) {
      console.warn(`[Runner] Lỗi đồng bộ thư mục dự án: ${error.message}`);
    } else {
      console.log(`[Runner] ✅ Đã đồng bộ ${data || 0} thư mục dự án.`);
    }
  } catch (err: any) {
    console.warn(`[Runner] Không thể kết nối đồng bộ dự án: ${err.message}`);
  }
}

// 5. Claim and Process Next Task
async function claimAndRunTask(): Promise<boolean> {
  if (isPolling || getActiveExecution()) {
    return false;
  }

  isPolling = true;
  try {
    const { data: task, error } = await supabase.rpc('claim_next_task', {
      p_runner_id: RUNNER_ID,
      p_secret_token_hash: secretTokenHash
    });

    if (error) {
      console.warn(`[Runner] Lỗi nhận task: ${error.message}`);
      return false;
    }

    if (!task || !task.id) {
      return false; // No queued tasks
    }

    console.log(`\n========================================================`);
    console.log(`[Runner] 🚀 ĐÃ NHẬN TÁC VỤ MỚI: [${task.id}]`);
    console.log(`[Runner] Agent: ${task.agent_id}`);
    console.log(`[Runner] Title: ${task.title || 'Không có tiêu đề'}`);
    console.log(`[Runner] Thư mục: ${task.folder_path}`);
    console.log(`[Runner] Prompt: ${task.prompt}`);
    console.log(`========================================================\n`);

    // Notify task started
    await supabase.rpc('report_task_progress', {
      p_runner_id: RUNNER_ID,
      p_secret_token_hash: secretTokenHash,
      p_task_id: task.id,
      p_event_type: 'init',
      p_current_activity: 'Đang khởi động Antigravity CLI...',
      p_response_delta: '',
      p_final_status: null,
      p_error_text: null,
      p_duration_seconds: null,
      p_payload: { status: 'running' }
    });

    // Update heartbeat to busy
    await sendHeartbeat('busy');

    // Throttled progress reporter to prevent database rate limits
    let lastReportTime = Date.now();
    let pendingTextDelta = '';

    const flushProgress = async (data: ProgressCallbackData, forceFlush = false) => {
      const now = Date.now();
      if (data.responseDelta) {
        pendingTextDelta += data.responseDelta;
      }

      // Flush if forced, or is terminal event, or every 500ms
      if (forceFlush || data.finalStatus || data.eventType !== 'text_delta' || (now - lastReportTime >= 500 && pendingTextDelta.length > 0)) {
        const deltaToSend = pendingTextDelta;
        pendingTextDelta = '';
        lastReportTime = now;

        await supabase.rpc('report_task_progress', {
          p_runner_id: RUNNER_ID,
          p_secret_token_hash: secretTokenHash,
          p_task_id: task.id,
          p_event_type: data.eventType,
          p_current_activity: data.currentActivity || null,
          p_response_delta: deltaToSend || null,
          p_final_status: data.finalStatus || null,
          p_error_text: data.errorText || null,
          p_duration_seconds: data.durationSeconds || null,
          p_payload: data.payload || {}
        });
      }
    };

    // Execute agy.exe
    await executeTaskWithAgy(
      task.id,
      task.agent_id,
      task.prompt,
      task.folder_path,
      task.conversation_id,
      async (data) => {
        await flushProgress(data, !!data.finalStatus);
      }
    );

    console.log(`[Runner] ✅ Hoàn tất xử lý tác vụ: ${task.id}`);
    await sendHeartbeat('online');
    return true;
  } catch (err: any) {
    console.error(`[Runner] Lỗi trong quá trình chạy tác vụ:`, err);
    await sendHeartbeat('online');
    return false;
  } finally {
    isPolling = false;
  }
}

// 6. Setup Realtime Subscriptions
function setupRealtimeListeners() {
  console.log('[Runner] Đang kết nối Supabase Realtime channel...');

  const channel = supabase
    .channel('runner-listener')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks'
      },
      (payload) => {
        const updated = payload.new as any;
        const currentExec = getActiveExecution();

        // Check cancellation request from user on website
        if (currentExec && updated.id === currentExec.taskId && updated.cancel_requested === true) {
          console.log(`[Runner] ⚠️ Nhận yêu cầu hủy tác vụ ${updated.id} từ website!`);
          stopActiveExecution();
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tasks'
      },
      (payload) => {
        const newTask = payload.new as any;
        if (newTask.status === 'queued') {
          console.log(`[Runner] 🔔 Phát hiện task mới được gửi lên: ${newTask.id}. Đang claim...`);
          claimAndRunTask();
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Runner] Trạng thái Realtime: ${status}`);
    });

  return channel;
}

// 7. Main Runner Bootstrap
async function startRunner() {
  console.log(`========================================================`);
  console.log(`   PIXEL OFFICE - WINDOWS LOCAL RUNNER (ANTIGRAVITY)    `);
  console.log(`========================================================`);
  console.log(`• Tên Runner:    ${RUNNER_NAME}`);
  console.log(`• Runner ID:     ${RUNNER_ID}`);
  console.log(`• Supabase URL:  ${SUPABASE_URL}`);
  console.log(`• Antigravity:   ${findAgyBinary()}`);
  console.log(`========================================================\n`);

  // Initial heartbeat
  await sendHeartbeat('online');

  // Sync projects
  await syncProjects();

  // Setup Realtime
  setupRealtimeListeners();

  // Heartbeat interval (every 10 seconds)
  const heartbeatTimer = setInterval(async () => {
    if (!isRunning) return;
    const currentExec = getActiveExecution();
    await sendHeartbeat(currentExec ? 'busy' : 'online');
  }, 10000);

  // Fallback polling loop (every 12 seconds when idle, Realtime handles instant trigger)
  const pollTimer = setInterval(async () => {
    if (!isRunning || getActiveExecution()) return;
    await claimAndRunTask();
  }, 12000);

  // Initial task check
  await claimAndRunTask();

  // Graceful shutdown
  const shutdown = async () => {
    if (!isRunning) return;
    isRunning = false;
    console.log('\n[Runner] Đang tắt Runner...');
    clearInterval(heartbeatTimer);
    clearInterval(pollTimer);

    if (getActiveExecution()) {
      console.log('[Runner] Dừng tiến trình agy đang chạy...');
      stopActiveExecution();
    }

    try {
      await sendHeartbeat('offline');
      console.log('[Runner] Đã thông báo trạng thái offline lên Supabase.');
    } catch {
      // ignore on exit
    }

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startRunner().catch((err) => {
  console.error('[Runner] Lỗi khởi động Runner:', err);
  process.exit(1);
});
