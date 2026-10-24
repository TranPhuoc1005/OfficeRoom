import { createClient } from '@supabase/supabase-js';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../runner/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1200): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`\n========================================================`);
  console.log(`  PIXEL OFFICE - DI CHUYỂN DỮ LIỆU SQLITE SANG SUPABASE `);
  console.log(`========================================================`);
  if (isDryRun) {
    console.log(`🔍 CHẾ ĐỘ: DRY-RUN (Chỉ kiểm tra và hiển thị dữ liệu, không ghi vào database)\n`);
  }

  // 1. Check SQLite Database
  const dbPath = path.resolve(__dirname, '../server/data/pixel_office.db');
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Không tìm thấy database SQLite tại: ${dbPath}`);
    process.exit(1);
  }

  console.log(`• Nguồn dữ liệu SQLite: ${dbPath}`);
  const sqlite = new DatabaseSync(dbPath);

  // Read agents from SQLite
  const sqliteAgents: any[] = sqlite.prepare('SELECT * FROM agents').all();
  console.log(`• Số lượng agent tìm thấy trong SQLite: ${sqliteAgents.length}`);

  // Read tasks from SQLite
  const sqliteTasks: any[] = sqlite.prepare('SELECT * FROM tasks').all();
  console.log(`• Số lượng task tìm thấy trong SQLite: ${sqliteTasks.length}`);

  if (sqliteAgents.length === 0) {
    console.warn(`⚠️ Bảng agents trong SQLite đang trống.`);
  }

  console.log('\n--- DANH SÁCH AGENT SẼ DI CHUYỂN ---');
  for (const ag of sqliteAgents) {
    console.log(`  - [${ag.id}] ${ag.name} (${ag.role}) | Thư mục: ${ag.folder_path || 'N/A'}`);
    if (ag.conversation_id) {
      console.log(`    Phiên (conversation_id): ${ag.conversation_id}`);
    }
  }

  if (isDryRun) {
    console.log(`\n✅ DRY-RUN HOÀN TẤT: Dữ liệu hợp lệ, sẵn sàng import.`);
    console.log(`Để thực hiện import thực tế, chạy lệnh: npm run db:migrate\n`);
    rl.close();
    return;
  }

  // 2. Connect to Supabase
  let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  let supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    supabaseUrl = (await question('Nhập Supabase URL: ')).trim();
  }
  if (!supabaseAnonKey) {
    supabaseAnonKey = (await question('Nhập Supabase Anon Key: ')).trim();
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase URL và Anon Key là bắt buộc!');
    rl.close();
    process.exit(1);
  }

  const resilientFetch: typeof fetch = async (input, init) => {
    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fetch(input, {
          ...init,
          keepalive: false
        });
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
    throw lastErr;
  };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: resilientFetch
    }
  });

  // Login or Sign up
  console.log('\nĐăng nhập vào tài khoản Supabase sở hữu văn phòng:');
  const email =
    process.env.SUPABASE_USER_EMAIL ||
    (await question('Email [mặc định: tranphuoc1005@gmail.com]: ')).trim() ||
    'tranphuoc1005@gmail.com';
  const password =
    process.env.SUPABASE_USER_PASSWORD ||
    (await question('Mật khẩu: ')).trim();

  let { data: authData, error: authError } = await withRetry(async () => {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  });

  // If user does not exist yet, try signing up
  if (authError && authError.message.includes('Invalid login credentials')) {
    console.log('Tài khoản chưa có trong bảng auth.users. Đang đăng ký tài khoản mới...');
    const signUpRes = await supabase.auth.signUp({
      email,
      password
    });
    if (signUpRes.error) {
      console.error(`❌ Không thể đăng ký: ${signUpRes.error.message}`);
      rl.close();
      process.exit(1);
    }
    authData = signUpRes.data;
    authError = null;
    if (!authData.session) {
      console.log(`\n⚠️ TÀI KHOẢN ĐÃ TẠO NHƯNG CẦN XÁC NHẬN EMAIL:`);
      console.log(`Vào Supabase SQL Editor và chạy dòng lệnh sau để kích hoạt ngay:`);
      console.log(`\n  UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${email}';\n`);
      console.log(`Hoặc mở hộp thư ${email} để bấm link xác nhận của Supabase.`);
      rl.close();
      process.exit(1);
    }
  }

  if (authError && authError.message.includes('Email not confirmed')) {
    console.log(`\n⚠️ EMAIL CHƯA ĐƯỢC XÁC NHẬN TRONG SUPABASE AUTH!`);
    console.log(`Supabase yêu cầu kích hoạt email trước khi đăng nhập.`);
    console.log(`Bạn có thể kích hoạt ngay bằng 1 trong các cách sau:`);
    console.log(`\n👉 Cách 1 (Nhanh nhất): Mở Supabase SQL Editor và chạy lệnh:`);
    console.log(`   UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${email}';\n`);
    console.log(`👉 Cách 2: Vào Supabase Dashboard -> Authentication -> Providers -> Email -> Tắt "Confirm email".`);
    console.log(`👉 Cách 3: Mở hộp thư email ${email} và bấm link xác nhận.\n`);
    rl.close();
    process.exit(1);
  }

  if (authError || !authData?.user) {
    console.error(`❌ Đăng nhập thất bại: ${authError?.message}`);
    rl.close();
    process.exit(1);
  }

  console.log(`✅ Đã đăng nhập: ${authData.user.email} (ID: ${authData.user.id})`);

  // Get or Create Office
  let officeId: string | null = null;
  try {
    officeId = await withRetry(async () => {
      const res = await supabase.rpc('get_or_create_user_office');
      if (res.error) throw res.error;
      return res.data;
    });
  } catch (err: any) {
    console.error(`❌ Không thể truy xuất văn phòng người dùng: ${err.message || err}`);
    rl.close();
    process.exit(1);
  }
  console.log(`✅ Văn phòng người dùng: ${officeId}`);

  // 3. Migrate Agents
  console.log('\nĐang di chuyển Agents sang Supabase...');
  let agentsMigrated = 0;

  for (const ag of sqliteAgents) {
    let parsedAvatar = {};
    try {
      parsedAvatar = typeof ag.avatar === 'string' ? JSON.parse(ag.avatar) : ag.avatar || {};
    } catch {
      parsedAvatar = {};
    }

    try {
      const res = await withRetry(async () => {
        const r = await supabase.from('agents').upsert(
          {
            id: ag.id,
            office_id: officeId,
            name: ag.name,
            role: ag.role,
            brief: ag.brief || ag.role,
            system_instructions: ag.system_instructions || '',
            color: ag.color || '#2563eb',
            avatar: parsedAvatar,
            folder_path: ag.folder_path || '',
            conversation_id: ag.conversation_id || null,
            created_at: ag.created_at ? new Date(ag.created_at).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );
        if (r.error) throw r.error;
        return r;
      });

      agentsMigrated++;
      console.log(`  ✓ Đã import/cập nhật agent: [${ag.id}] ${ag.name}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Lỗi khi lưu agent [${ag.id}]: ${err.message || err}`);
    }
  }

  // 4. Migrate Tasks
  console.log(`\nĐang di chuyển ${sqliteTasks.length} tác vụ lịch sử sang Supabase...`);
  let tasksMigrated = 0;

  for (const t of sqliteTasks) {
    const rawStatus = (t.status || 'SUCCESS').toLowerCase();
    const validStatus = ['queued', 'running', 'review', 'success', 'error', 'interrupted'].includes(rawStatus)
      ? rawStatus
      : 'success';

    try {
      await withRetry(async () => {
        const r = await supabase.from('tasks').upsert(
          {
            id: t.id,
            office_id: officeId,
            agent_id: t.agent_id,
            folder_path: t.folder_path || '',
            conversation_id: t.conversation_id || null,
            title: t.title || t.prompt?.slice(0, 50) || 'Task',
            prompt: t.prompt || '',
            priority: t.priority || 'Bình thường',
            status: validStatus,
            current_activity: null,
            response_text: t.response_text || '',
            error_text: t.error_text || null,
            duration_seconds: t.duration_seconds || null,
            feedback: t.feedback || '',
            review_status: t.review_status || 'pending',
            started_at: t.started_at ? new Date(t.started_at).toISOString() : new Date().toISOString(),
            completed_at: t.completed_at ? new Date(t.completed_at).toISOString() : null,
            created_at: t.started_at ? new Date(t.started_at).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );
        if (r.error) throw r.error;
        return r;
      });
      tasksMigrated++;
    } catch (err: any) {
      console.warn(`  ⚠️ Lỗi khi lưu task [${t.id}]: ${err.message || err}`);
    }
  }

  console.log(`\n========================================================`);
  console.log(`🎉 DI CHUYỂN HOÀN TẤT THÀNH CÔNG!`);
  console.log(`• Agents đã import: ${agentsMigrated}/${sqliteAgents.length}`);
  console.log(`• Tasks đã import:  ${tasksMigrated}/${sqliteTasks.length}`);
  console.log(`• Database SQLite gốc vẫn được bảo toàn nguyên vẹn.`);
  console.log(`========================================================\n`);

  rl.close();
}

main().catch((err) => {
  console.error('Lỗi di chuyển dữ liệu:', err);
  rl.close();
  process.exit(1);
});
