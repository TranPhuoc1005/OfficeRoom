import { addLocalProject } from './projects';
import readline from 'node:readline';
import fs from 'node:fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log(`\n========================================================`);
  console.log(`       THÊM THƯ MỤC DỰ ÁN CHO WINDOWS RUNNER            `);
  console.log(`========================================================\n`);

  const name = (await question('Nhập tên hiển thị dự án (ví dụ: MyWebsite): ')).trim();
  const folderPath = (await question('Nhập đường dẫn thư mục đầy đủ trên Windows: ')).trim();

  if (!name || !folderPath) {
    console.error('❌ Tên và đường dẫn không được để trống!');
    rl.close();
    process.exit(1);
  }

  if (!fs.existsSync(folderPath)) {
    console.warn(`⚠️ CẢNH BÁO: Thư mục "${folderPath}" hiện chưa tồn tại trên máy.`);
  }

  const updated = addLocalProject(name, folderPath);
  console.log(`\n✅ Đã lưu dự án "${name}" (${folderPath}) vào danh sách!`);
  console.log(`Danh sách hiện có: ${updated.length} dự án.`);
  console.log(`Runner sẽ tự động đồng bộ lên giao diện web khi chạy.`);
  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
