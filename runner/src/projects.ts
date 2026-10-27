import fs from 'node:fs';
import path from 'node:path';

export interface ProjectEntry {
  name: string;
  path: string;
}

const DEFAULT_PROJECT_FILE = path.resolve(__dirname, '../runner-projects.json');

export function loadLocalProjects(filePath: string = DEFAULT_PROJECT_FILE): ProjectEntry[] {
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => p && typeof p.name === 'string' && typeof p.path === 'string');
      }
    } catch (err) {
      console.warn(`[Runner] Error reading ${filePath}:`, err);
    }
  }

  // Initialize with sensible defaults for this Windows workstation
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\Admin';
  const defaults: ProjectEntry[] = [
    {
      name: 'AgentOffice',
      path: path.resolve(__dirname, '../../')
    },
    {
      name: 'flatsome',
      path: path.join(userProfile, 'Desktop\\PhuocTH\\Work\\WeMasterTrade\\wordpress-global\\wp-content\\themes\\flatsome')
    },
    {
      name: 'wordpress-global',
      path: path.join(userProfile, 'Desktop\\PhuocTH\\Work\\WeMasterTrade\\wordpress-global')
    },
    {
      name: 'wegolden',
      path: path.join(userProfile, 'Desktop\\PhuocTH\\Work\\WeGolden\\wegolden')
    },
    {
      name: 'test_workspace_alpha',
      path: path.resolve(__dirname, '../../test_workspace_alpha')
    },
    {
      name: 'test_workspace_beta',
      path: path.resolve(__dirname, '../../test_workspace_beta')
    }
  ];

  // Filter only existing paths
  const existing = defaults.filter((d) => fs.existsSync(d.path));
  const result = existing.length > 0 ? existing : defaults;
  saveLocalProjects(result, filePath);
  return result;
}

export function saveLocalProjects(projects: ProjectEntry[], filePath: string = DEFAULT_PROJECT_FILE): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Runner] Failed to save projects to ${filePath}:`, err);
  }
}

export function addLocalProject(name: string, targetPath: string, filePath: string = DEFAULT_PROJECT_FILE): ProjectEntry[] {
  const current = loadLocalProjects(filePath);
  const normalized = path.normalize(targetPath);

  const existingIndex = current.findIndex((p) => path.normalize(p.path).toLowerCase() === normalized.toLowerCase());
  if (existingIndex >= 0) {
    current[existingIndex].name = name;
  } else {
    current.push({ name, path: normalized });
  }

  saveLocalProjects(current, filePath);
  return current;
}
