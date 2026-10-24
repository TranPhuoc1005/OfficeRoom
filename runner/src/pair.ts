import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log(`\n========================================================`);
  console.log(`     GHÉP NỐI WINDOWS RUNNER VỚI PIXEL OFFICE          `);
  console.log(`========================================================\n`);

  let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  let supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl) {
    supabaseUrl = (await question('Nhập Supabase URL (ví dụ https://xyz.supabase.co): ')).trim();
  } else {
    console.log(`Supabase URL: ${supabaseUrl}`);
  }

  if (!supabaseAnonKey) {
    supabaseAnonKey = (await question('Nhập Supabase Anon Key: ')).trim();
  } else {
    console.log(`Supabase Anon Key: [Đã cấu hình]`);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase URL và Anon Key là bắt buộc!');
    rl.close();
    process.exit(1);
  }

  console.log('\nChọn phương thức ghép nối:');
  console.log('1. Đăng nhập tài khoản Supabase (Tự động tạo Runner và lưu .env)');
  console.log('2. Nhập trực tiếp Runner ID và Secret Token (Đã copy từ giao diện web)');
  const choice = (await question('\nLựa chọn (1 hoặc 2) [mặc định: 1]: ')).trim() || '1';

  let runnerId = '';
  let secretToken = '';

  if (choice === '2') {
    runnerId = (await question('Nhập Runner ID: ')).trim();
    secretToken = (await question('Nhập Secret Token: ')).trim();
  } else {
    const email = (await question('Nhập Email đăng nhập: ')).trim();
    const password = (await question('Nhập Mật khẩu: ')).trim();

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      console.error(`❌ Đăng nhập thất bại: ${authError?.message || 'Không thể xác thực'}`);
      rl.close();
      process.exit(1);
    }

    console.log(`✅ Đã đăng nhập tài khoản: ${authData.user.email}`);
    console.log('Đang đăng ký Windows Runner vào văn phòng...');

    const { data: pairData, error: pairError } = await client.rpc('create_runner_pair', {
      p_name: `Windows Runner (${process.env.COMPUTERNAME || 'PC'})`
    });

    if (pairError || !pairData) {
      console.error(`❌ Lỗi tạo Runner: ${pairError?.message}`);
      rl.close();
      process.exit(1);
    }

    runnerId = pairData.runner_id;
    secretToken = pairData.secret_token;
    console.log(`✅ Đã tạo Runner thành công! ID: ${runnerId}`);
  }

  // Save to runner/.env
  const envContent = `# Pixel Office Windows Runner Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}
RUNNER_ID=${runnerId}
RUNNER_SECRET_TOKEN=${secretToken}
RUNNER_NAME=Windows Workstation (${process.env.COMPUTERNAME || 'PC'})
`;

  const envPath = path.resolve(__dirname, '../.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`\n🎉 ĐÃ LƯU CẤU HÌNH THÀNH CÔNG VÀO: ${envPath}`);
  console.log(`Bây giờ bạn có thể khởi động Runner bằng lệnh:`);
  console.log(`  npm --prefix runner start`);
  console.log(`hoặc chạy script PowerShell:`);
  console.log(`  powershell .\\start-runner.ps1\n`);

  rl.close();
}

main().catch((err) => {
  console.error('Lỗi ghép nối:', err);
  rl.close();
  process.exit(1);
});
