import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pixel_office.db');
export const db = new DatabaseSync(dbPath);

export interface AgentRecord {
  id: string;
  name: string;
  role: string;
  system_instructions: string;
  folder_path: string;
  conversation_id: string | null;
  avatar: string; // JSON: { skinColor, hairStyle, hairColor, clothesColor, accessory }
  desk_x: number;
  desk_y: number;
  created_at: number;
  updated_at: number;
}

export interface TaskRecord {
  id: string;
  agent_id: string;
  prompt: string;
  folder_path: string;
  conversation_id: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'ERROR' | 'INTERRUPTED';
  current_activity: string | null;
  response_text: string;
  error_text: string | null;
  duration_seconds: number | null;
  started_at: number;
  completed_at: number | null;
}

export function initDatabase() {
  // 1. Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      system_instructions TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      conversation_id TEXT,
      avatar TEXT NOT NULL,
      desk_x INTEGER NOT NULL,
      desk_y INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      conversation_id TEXT,
      status TEXT NOT NULL,
      current_activity TEXT,
      response_text TEXT NOT NULL DEFAULT '',
      error_text TEXT,
      duration_seconds REAL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (agent_id) REFERENCES agents (id)
    );
  `);

  // 2. Schema migrations: safely add columns if missing
  const taskCols = (db.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>).map((c) => c.name);
  if (!taskCols.includes('title')) db.exec("ALTER TABLE tasks ADD COLUMN title TEXT;");
  if (!taskCols.includes('priority')) db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'Bình thường';");
  if (!taskCols.includes('feedback')) db.exec("ALTER TABLE tasks ADD COLUMN feedback TEXT DEFAULT '';");
  if (!taskCols.includes('review_status')) db.exec("ALTER TABLE tasks ADD COLUMN review_status TEXT DEFAULT 'pending';");

  const agentCols = (db.prepare('PRAGMA table_info(agents)').all() as Array<{ name: string }>).map((c) => c.name);
  if (!agentCols.includes('color')) db.exec("ALTER TABLE agents ADD COLUMN color TEXT;");
  if (!agentCols.includes('brief')) db.exec("ALTER TABLE agents ADD COLUMN brief TEXT;");

  // 3. Mark any previously RUNNING task as INTERRUPTED on server startup
  // Rule: "Khởi động lại app vẫn giữ cấu hình và lịch sử; task bị gián đoạn phải được ghi nhận đúng, không tự chạy lại."
  db.exec(`
    UPDATE tasks
    SET status = 'INTERRUPTED',
        error_text = 'Tiến trình bị gián đoạn do khởi động lại ứng dụng.',
        completed_at = ${Date.now()}
    WHERE status = 'RUNNING';
  `);

  // 3. Seed default 2 agents if table is empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM agents');
  const result = countStmt.get() as { count: number };
  
  if (result.count === 0) {
    const newDefaultAgents = [
      {
        id: 'agent-huy',
        name: 'Huy (Leader)',
        role: 'Frontend Developer, Designer',
        brief: 'Leader phụ trách định hướng kiến trúc Frontend, UI/UX Design, kiểm duyệt chất lượng giao diện và điều phối công việc.',
        folder: 'C:\\Users\\tranp\\OneDrive\\Desktop\\TranPhuoc\\Work\\WeMastertrade\\WeGolden\\wegolden',
        color: '#2a624d',
        hairStyle: 'short',
        hairColor: '#2b231b',
        clothesColor: '#2a624d',
        accessory: 'glasses'
      },
      {
        id: 'agent-tuong',
        name: 'Tường',
        role: 'Frontend Developer, Designer',
        brief: 'Chuyên viên Frontend Developer & Designer. Chuyên môn: giao diện người dùng, responsive design và tối ưu trải nghiệm tương tác.',
        folder: 'C:\\Users\\tranp\\OneDrive\\Desktop\\TranPhuoc\\Work\\WeMastertrade\\WeGolden\\wegolden',
        color: '#2563eb',
        hairStyle: 'messy',
        hairColor: '#343f42',
        clothesColor: '#2563eb',
        accessory: 'none'
      },
      {
        id: 'agent-phuoc',
        name: 'Phước',
        role: 'Frontend Developer, Designer',
        brief: 'Chuyên viên Frontend Developer & Designer. Chuyên môn: phát triển component UI, thiết kế đồ họa pixel và tinh chỉnh giao diện web.',
        folder: 'C:\\Users\\tranp\\OneDrive\\Desktop\\TranPhuoc\\Work\\WeMastertrade\\WeGolden\\wegolden',
        color: '#7c3aed',
        hairStyle: 'short',
        hairColor: '#4a2c11',
        clothesColor: '#7c3aed',
        accessory: 'none'
      },
      {
        id: 'agent-toan',
        name: 'Toàn',
        role: 'Frontend Developer, Designer',
        brief: 'Chuyên viên Frontend Developer & Designer. Chuyên môn: CSS animation, thiết kế layout hiện đại và tối ưu hiệu suất hiển thị.',
        folder: 'C:\\Users\\tranp\\OneDrive\\Desktop\\TranPhuoc\\Work\\WeMastertrade\\WeMastertrade\\flatsome',
        color: '#d97706',
        hairStyle: 'parted',
        hairColor: '#575064',
        clothesColor: '#d97706',
        accessory: 'headset'
      },
      {
        id: 'agent-thanh',
        name: 'Thành',
        role: 'Frontend Developer, Designer',
        brief: 'Chuyên viên Frontend Developer & Designer. Chuyên môn: xây dựng giao diện tương tác, thiết kế prototype và đảm bảo tính thẩm mỹ cao.',
        folder: 'C:\\Users\\tranp\\OneDrive\\Desktop\\TranPhuoc\\Work\\AgentOffice',
        color: '#dc2626',
        hairStyle: 'short',
        hairColor: '#1e293b',
        clothesColor: '#dc2626',
        accessory: 'none'
      },
      {
        id: 'agent-long',
        name: 'Long',
        role: 'Frontend Developer, Designer',
        brief: 'Chuyên viên Frontend Developer & Designer. Chuyên môn: thiết kế UI hệ thống (Design Systems), style tokens và chuẩn hóa components.',
        folder: 'C:\\Users\\tranp\\OneDrive\\Desktop\\TranPhuoc\\Work\\AgentOffice\\test_workspace_alpha',
        color: '#059669',
        hairStyle: 'messy',
        hairColor: '#704934',
        clothesColor: '#059669',
        accessory: 'glasses'
      },
      {
        id: 'agent-hieu',
        name: 'Hiếu',
        role: 'Frontend Developer, Designer',
        brief: 'Chuyên viên Frontend Developer & Designer. Chuyên môn: tối ưu trải nghiệm người dùng (UX), thiết kế responsive đa nền tảng và kiểm thử giao diện.',
        folder: 'C:\\Users\\tranp\\OneDrive\\Desktop\\TranPhuoc\\Work\\AgentOffice\\test_workspace_beta',
        color: '#db2777',
        hairStyle: 'short',
        hairColor: '#343a3b',
        clothesColor: '#db2777',
        accessory: 'headset'
      }
    ];

    const insertAgent = db.prepare(`
      INSERT INTO agents (id, name, role, system_instructions, folder_path, conversation_id, avatar, desk_x, desk_y, created_at, updated_at, color, brief)
      VALUES (?, ?, ?, ?, ?, NULL, ?, 200, 150, ?, ?, ?, ?)
    `);

    const now = Date.now();
    for (let i = 0; i < newDefaultAgents.length; i++) {
      const a = newDefaultAgents[i];
      const avatar = JSON.stringify({
        skinColor: ['#f4c39e', '#edbb90', '#e5ac85', '#f1c4a5'][i % 4],
        hairStyle: a.hairStyle,
        hairColor: a.hairColor,
        clothesColor: a.clothesColor,
        accessory: a.accessory
      });
      insertAgent.run(a.id, a.name, a.role, a.brief, a.folder, avatar, now + i * 1000, now + i * 1000, a.color, a.brief);
    }
  }
}
