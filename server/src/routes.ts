import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, AgentRecord, TaskRecord } from './db';
import { isAgentBusy, getActiveTaskId, executeAgentTask, stopAgentTask } from './cli-runner';
import { openNativeFolderPicker } from './folder-picker';
import { validateFolderPath } from './security';

export const apiRouter = Router();

// Standard default palette matching ChatGPT preview
const DEFAULT_PALETTE = ['#6b9272', '#b38b67', '#778fa6', '#aa8296'];

// 1. List all agents
apiRouter.get('/agents', (req: Request, res: Response) => {
  const agents = db.prepare('SELECT * FROM agents ORDER BY created_at ASC').all() as unknown as any[];
  
  const formatted = agents.map((agent, i) => {
    let parsedAvatar: any = {};
    try {
      parsedAvatar = JSON.parse(agent.avatar || '{}');
    } catch {
      parsedAvatar = {};
    }
    const color = agent.color || parsedAvatar.clothesColor || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
    const brief = agent.brief || agent.system_instructions || '';

    return {
      ...agent,
      color,
      brief,
      avatar: parsedAvatar,
      isBusy: isAgentBusy(agent.id),
      activeTaskId: getActiveTaskId(agent.id) || null
    };
  });

  res.json(formatted);
});

// 2. Create new agent
apiRouter.post('/agents', (req: Request, res: Response) => {
  const { name, role, brief, system_instructions, folder_path, color } = req.body;

  if (!name || !role) {
    res.status(400).json({ error: 'Tên và vai trò của Agent không được để trống.' });
    return;
  }

  const agentId = 'agent-' + crypto.randomUUID().slice(0, 8);
  const instructions = system_instructions || brief || `Bạn là ${name}, chuyên môn: ${role}.`;
  
  let targetFolder = folder_path;
  if (!targetFolder || typeof targetFolder !== 'string' || targetFolder.trim() === '') {
    targetFolder = path.resolve(__dirname, '../../test_workspace');
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
  }

  const folderVal = validateFolderPath(targetFolder);
  if (!folderVal.valid) {
    res.status(400).json({ error: folderVal.error });
    return;
  }

  const agentsCount = (db.prepare('SELECT COUNT(*) as c FROM agents').get() as { c: number }).c;
  const agentColor = color || DEFAULT_PALETTE[agentsCount % DEFAULT_PALETTE.length];
  const now = Date.now();

  const avatarObj = {
    skinColor: '#ffe0bd',
    hairStyle: 'short',
    hairColor: '#4a2c11',
    clothesColor: agentColor,
    accessory: 'none'
  };

  db.prepare(`
    INSERT INTO agents (id, name, role, system_instructions, folder_path, conversation_id, avatar, desk_x, desk_y, created_at, updated_at, color, brief)
    VALUES (?, ?, ?, ?, ?, NULL, ?, 200, 150, ?, ?, ?, ?)
  `).run(
    agentId,
    name.trim(),
    role.trim(),
    instructions.trim(),
    targetFolder.trim(),
    JSON.stringify(avatarObj),
    now,
    now,
    agentColor,
    instructions.trim()
  );

  res.json({
    success: true,
    agent: {
      id: agentId,
      name: name.trim(),
      role: role.trim(),
      system_instructions: instructions.trim(),
      brief: instructions.trim(),
      folder_path: targetFolder.trim(),
      conversation_id: null,
      avatar: avatarObj,
      color: agentColor,
      isBusy: false,
      activeTaskId: null
    }
  });
});

// 3. Get single agent details
apiRouter.get('/agents/:id', (req: Request, res: Response) => {
  const agentId = String(req.params.id);
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as unknown as any;
  if (!agent) {
    res.status(404).json({ error: 'Không tìm thấy Agent.' });
    return;
  }

  let parsedAvatar: any = {};
  try {
    parsedAvatar = JSON.parse(agent.avatar || '{}');
  } catch {
    parsedAvatar = {};
  }

  res.json({
    ...agent,
    color: agent.color || parsedAvatar.clothesColor || '#2563eb',
    brief: agent.brief || agent.system_instructions || '',
    avatar: parsedAvatar,
    isBusy: isAgentBusy(agent.id),
    activeTaskId: getActiveTaskId(agent.id) || null
  });
});

// 4. Update agent settings (folder, role, instructions, avatar, color)
apiRouter.put('/agents/:id', (req: Request, res: Response) => {
  const agentId = String(req.params.id);
  const { name, role, system_instructions, brief, folder_path, avatar, color } = req.body;

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as unknown as any;
  if (!agent) {
    res.status(404).json({ error: 'Không tìm thấy Agent.' });
    return;
  }

  if (folder_path) {
    const val = validateFolderPath(folder_path);
    if (!val.valid) {
      res.status(400).json({ error: val.error });
      return;
    }
  }

  const newName = name ?? agent.name;
  const newRole = role ?? agent.role;
  const newInstructions = system_instructions ?? brief ?? agent.system_instructions;
  const newFolder = folder_path ?? agent.folder_path;
  const newColor = color ?? agent.color;
  
  let newAvatarStr = agent.avatar;
  if (avatar) {
    newAvatarStr = JSON.stringify(avatar);
  } else if (newColor) {
    try {
      const parsed = JSON.parse(agent.avatar || '{}');
      parsed.clothesColor = newColor;
      newAvatarStr = JSON.stringify(parsed);
    } catch {}
  }

  db.prepare(`
    UPDATE agents 
    SET name = ?, role = ?, system_instructions = ?, folder_path = ?, avatar = ?, updated_at = ?, color = ?, brief = ?
    WHERE id = ?
  `).run(newName, newRole, newInstructions, newFolder, newAvatarStr, Date.now(), newColor, newInstructions, agentId);

  res.json({ success: true, message: 'Đã cập nhật thông tin Agent thành công.' });
});

// 5. Delete agent
apiRouter.delete('/agents/:id', (req: Request, res: Response) => {
  const agentId = String(req.params.id);

  if (isAgentBusy(agentId)) {
    res.status(400).json({ error: 'Agent đang chạy tác vụ. Vui lòng dừng tác vụ trước khi xóa.' });
    return;
  }

  // Delete all tasks associated with agent
  db.prepare('DELETE FROM tasks WHERE agent_id = ?').run(agentId);
  db.prepare('DELETE FROM agents WHERE id = ?').run(agentId);

  res.json({ success: true, message: 'Đã xóa Agent thành công.' });
});

// 6. Assign task to agent
apiRouter.post('/agents/:id/tasks', async (req: Request, res: Response) => {
  const agentId = String(req.params.id);
  const { prompt, detail, title, priority } = req.body;

  const taskPrompt = (detail || prompt || '').trim();
  if (!taskPrompt) {
    res.status(400).json({ error: 'Nội dung tác vụ không được để trống.' });
    return;
  }

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as unknown as AgentRecord | undefined;
  if (!agent) {
    res.status(404).json({ error: 'Không tìm thấy Agent.' });
    return;
  }

  if (isAgentBusy(agentId)) {
    res.status(400).json({ error: 'Agent đang bận xử lý một tác vụ khác. Vui lòng đợi hoàn thành hoặc nhấn nút Dừng.' });
    return;
  }

  const folderVal = validateFolderPath(agent.folder_path);
  if (!folderVal.valid) {
    res.status(400).json({ error: `Thư mục nguồn của Agent không hợp lệ: ${folderVal.error}` });
    return;
  }

  const taskId = crypto.randomUUID();
  const startedAt = Date.now();
  const taskTitle = (title || taskPrompt.slice(0, 50)).trim();
  const taskPriority = priority || 'Bình thường';

  // Insert initial task record in SQLite
  db.prepare(`
    INSERT INTO tasks (id, agent_id, prompt, folder_path, conversation_id, status, current_activity, response_text, started_at, title, priority, feedback, review_status)
    VALUES (?, ?, ?, ?, ?, 'RUNNING', 'Đang kết nối Antigravity CLI...', '', ?, ?, ?, '', 'pending')
  `).run(taskId, agentId, taskPrompt, agent.folder_path, agent.conversation_id, startedAt, taskTitle, taskPriority);

  let finalPrompt = taskPrompt;
  if (!agent.conversation_id && agent.system_instructions) {
    finalPrompt = `[System Instructions: ${agent.system_instructions}]\n\nUser Task: ${finalPrompt}`;
  }

  executeAgentTask(agentId, taskId, finalPrompt, agent.folder_path, agent.conversation_id).catch((err) => {
    console.error(`Task execution failed for agent ${agentId}:`, err);
  });

  res.json({
    success: true,
    taskId,
    agentId,
    status: 'RUNNING',
    message: 'Tác vụ đã được giao cho Agent.'
  });
});

// 7. Stop running task
apiRouter.post('/agents/:id/stop', (req: Request, res: Response) => {
  const agentId = String(req.params.id);
  const stopped = stopAgentTask(agentId);

  if (!stopped) {
    res.status(400).json({ error: 'Agent hiện không có tác vụ nào đang chạy.' });
    return;
  }

  res.json({ success: true, message: 'Đã gửi yêu cầu dừng tiến trình của Agent.' });
});

// 8. Get task history for agent
apiRouter.get('/agents/:id/tasks', (req: Request, res: Response) => {
  const agentId = String(req.params.id);
  const tasks = db.prepare(`
    SELECT * FROM tasks 
    WHERE agent_id = ? 
    ORDER BY started_at DESC
  `).all(agentId) as unknown as any[];

  res.json(tasks);
});

// 9. Reset agent conversation history
apiRouter.post('/agents/:id/reset-conversation', (req: Request, res: Response) => {
  const agentId = String(req.params.id);
  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId);
  if (!agent) {
    res.status(404).json({ error: 'Không tìm thấy Agent.' });
    return;
  }

  if (isAgentBusy(agentId)) {
    res.status(400).json({ error: 'Không thể tạo phiên mới khi Agent đang chạy tác vụ.' });
    return;
  }

  db.prepare('UPDATE agents SET conversation_id = NULL, updated_at = ? WHERE id = ?').run(Date.now(), agentId);

  res.json({ success: true, message: 'Đã làm mới phiên hội thoại của Agent.' });
});

// 9b. List all tasks
apiRouter.get('/tasks', (req: Request, res: Response) => {
  const tasks = db.prepare(`
    SELECT * FROM tasks 
    ORDER BY started_at DESC
  `).all() as unknown as any[];

  res.json(tasks);
});

// 9c. Duplicate task
apiRouter.post('/tasks/:id/duplicate', (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) {
    res.status(404).json({ error: 'Không tìm thấy công việc.' });
    return;
  }

  const newId = crypto.randomUUID();
  const now = Date.now();
  const newTitle = `${task.title || 'Công việc'} (bản sao)`;

  db.prepare(`
    INSERT INTO tasks (id, agent_id, prompt, folder_path, conversation_id, status, current_activity, response_text, started_at, title, priority, feedback, review_status)
    VALUES (?, ?, ?, ?, ?, 'SUCCESS', '', ?, ?, ?, ?, '', 'pending')
  `).run(
    newId,
    task.agent_id,
    task.prompt,
    task.folder_path,
    task.conversation_id,
    task.response_text || '',
    now,
    newTitle,
    task.priority || 'Bình thường'
  );

  const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(newId);
  res.json({ success: true, task: created });
});

// 10. Edit task (title, detail/prompt, priority)
apiRouter.put('/tasks/:id', (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const { title, prompt, detail, priority } = req.body;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) {
    res.status(404).json({ error: 'Không tìm thấy công việc.' });
    return;
  }

  const newPrompt = (prompt ?? detail ?? task.prompt).trim();
  const newTitle = (title ?? task.title ?? newPrompt.slice(0, 50)).trim();
  const newPriority = priority ?? task.priority ?? 'Bình thường';

  db.prepare(`
    UPDATE tasks
    SET title = ?, prompt = ?, priority = ?
    WHERE id = ?
  `).run(newTitle, newPrompt, newPriority, taskId);

  res.json({ success: true, message: 'Đã cập nhật công việc thành công.' });
});

// 11. Delete task
apiRouter.delete('/tasks/:id', (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const task = db.prepare('SELECT agent_id, status FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) {
    res.status(404).json({ error: 'Không tìm thấy công việc.' });
    return;
  }

  if (task.status === 'RUNNING' && isAgentBusy(task.agent_id)) {
    res.status(400).json({ error: 'Không thể xóa công việc đang chạy. Vui lòng dừng tiến trình trước.' });
    return;
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  res.json({ success: true, message: 'Đã xóa công việc.' });
});

// 12. Approve task (marks review_status: 'approved')
apiRouter.post('/tasks/:id/approve', (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) {
    res.status(404).json({ error: 'Không tìm thấy công việc.' });
    return;
  }

  db.prepare(`
    UPDATE tasks
    SET review_status = 'approved', status = 'SUCCESS'
    WHERE id = ?
  `).run(taskId);

  res.json({ success: true, message: 'Đã duyệt hoàn tất công việc.' });
});

// 13. Revise task (submit feedback and re-run on agent CLI)
apiRouter.post('/tasks/:id/revise', async (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const { feedback } = req.body;

  if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
    res.status(400).json({ error: 'Nội dung góp ý / chỉnh sửa không được để trống.' });
    return;
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) {
    res.status(404).json({ error: 'Không tìm thấy công việc.' });
    return;
  }

  const agentId = task.agent_id;
  if (isAgentBusy(agentId)) {
    res.status(400).json({ error: 'Agent đang bận xử lý tác vụ khác.' });
    return;
  }

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any;
  if (!agent) {
    res.status(404).json({ error: 'Không tìm thấy Agent phụ trách.' });
    return;
  }

  const trimmedFeedback = feedback.trim();
  const revisionPrompt = `Yêu cầu chỉnh sửa công việc "${task.title || task.prompt.slice(0, 40)}":\n${trimmedFeedback}\n\n(Vui lòng điều chỉnh theo yêu cầu và trả về kết quả cập nhật)`;

  db.prepare(`
    UPDATE tasks
    SET feedback = ?, status = 'RUNNING', current_activity = 'Đang chỉnh sửa theo góp ý...', started_at = ?, review_status = 'pending'
    WHERE id = ?
  `).run(trimmedFeedback, Date.now(), taskId);

  executeAgentTask(agentId, taskId, revisionPrompt, agent.folder_path, agent.conversation_id).catch((err) => {
    console.error(`Revision execution failed for agent ${agentId}:`, err);
  });

  res.json({ success: true, message: 'Đã gửi yêu cầu chỉnh sửa tới Agent.' });
});

// 14. Native Folder Picker (Windows PowerShell Dialog)
apiRouter.post('/utils/pick-folder', async (req: Request, res: Response) => {
  const result = await openNativeFolderPicker();
  res.json({ selectedPath: result });
});

// 15. In-App Folder Browser (File System Tree)
apiRouter.get('/utils/browse-folder', (req: Request, res: Response) => {
  try {
    let targetPath = typeof req.query.path === 'string' ? req.query.path : '';

    const drives = ['C:', 'D:', 'E:', 'F:'];
    const availableDrives = drives.filter((d) => {
      try {
        return fs.existsSync(d + '\\');
      } catch {
        return false;
      }
    });

    const userProfile = process.env.USERPROFILE || 'C:\\Users\\Default';
    const shortcuts = [
      { name: '💼 Thư mục hiện tại (AgentOffice)', path: path.resolve(__dirname, '../../') },
      { name: '🖥️ Desktop', path: path.join(userProfile, 'Desktop') },
      { name: '📂 Documents', path: path.join(userProfile, 'Documents') },
      { name: '👤 User Profile', path: userProfile }
    ].filter(s => fs.existsSync(s.path));

    if (!targetPath || targetPath.trim() === '') {
      targetPath = path.resolve(__dirname, '../../');
    }

    let resolved = path.resolve(targetPath);
    let warning: string | undefined;
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      warning = `Thư mục "${targetPath}" không tồn tại. Đã chuyển về thư mục mặc định.`;
      resolved = fs.existsSync('C:\\') ? 'C:\\' : path.resolve(__dirname, '../../');
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const folders = entries
      .filter((entry) => {
        try {
          if (!entry.isDirectory()) return false;
          if (entry.name.startsWith('$') || entry.name === 'System Volume Information') return false;
          return true;
        } catch {
          return false;
        }
      })
      .map((dir) => ({
        name: dir.name,
        path: path.join(resolved, dir.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parent = path.dirname(resolved);
    const parentPath = parent !== resolved ? parent : null;

    res.json({
      currentPath: resolved,
      parentPath,
      drives: availableDrives,
      shortcuts,
      folders,
      warning
    });
  } catch (err: any) {
    res.status(500).json({ error: `Lỗi đọc thư mục: ${err.message}` });
  }
});

// 16. Validate folder path
apiRouter.post('/utils/validate-folder', (req: Request, res: Response) => {
  const { folderPath } = req.body;
  const result = validateFolderPath(folderPath);
  res.json(result);
});

// 17. Get office decoration layout
apiRouter.get('/layout', (req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM office_layouts WHERE id = ?').get('default-office') as {
      id: string;
      layout: string;
      version: number;
      updated_at: number;
    } | undefined;

    if (!row) {
      res.json({ layout: null, version: 1, updated_at: Date.now() });
      return;
    }

    res.json({
      layout: JSON.parse(row.layout),
      version: row.version,
      updated_at: row.updated_at
    });
  } catch (err: any) {
    res.status(500).json({ error: `Lỗi tải bố cục phòng: ${err.message}` });
  }
});

// 18. Save office decoration layout with optimistic concurrency / version checking
apiRouter.put('/layout', (req: Request, res: Response) => {
  try {
    const { layout, version } = req.body;
    if (!layout || !Array.isArray(layout)) {
      res.status(400).json({ error: 'Dữ liệu bố cục không hợp lệ (cần danh sách đồ nội thất).' });
      return;
    }

    const current = db.prepare('SELECT version FROM office_layouts WHERE id = ?').get('default-office') as {
      version: number;
    } | undefined;

    // Check version conflict
    if (current && version !== undefined && version < current.version) {
      res.status(409).json({
        conflict: true,
        error: 'Bố cục phòng đã được cập nhật từ một phiên làm việc khác. Vui lòng tải lại trang.',
        currentVersion: current.version
      });
      return;
    }

    const nextVersion = current ? current.version + 1 : 1;
    const now = Date.now();

    db.prepare(`
      INSERT INTO office_layouts (id, layout, version, updated_at)
      VALUES ('default-office', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        layout = excluded.layout,
        version = excluded.version,
        updated_at = excluded.updated_at
    `).run(JSON.stringify(layout), nextVersion, now);

    res.json({
      success: true,
      version: nextVersion,
      updated_at: now
    });
  } catch (err: any) {
    res.status(500).json({ error: `Lỗi lưu bố cục phòng: ${err.message}` });
  }
});

