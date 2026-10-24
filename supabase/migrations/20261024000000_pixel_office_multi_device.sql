-- ============================================================================
-- PIXEL OFFICE MULTI-DEVICE MIGRATION
-- Supabase Postgres Schema with RLS, Realtime & Atomic Runner Leases
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. OFFICES TABLE
CREATE TABLE IF NOT EXISTS public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'The Workroom',
    layout JSONB DEFAULT NULL,
    layout_version INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_office_owner UNIQUE (owner_id)
);

ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS layout JSONB DEFAULT NULL;
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS layout_version INT DEFAULT 1;

-- 3. RUNNERS TABLE (Máy Windows chạy Antigravity CLI)
CREATE TABLE IF NOT EXISTS public.runners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Windows Runner',
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
    secret_token_hash TEXT NOT NULL,
    last_heartbeat_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PROJECTS TABLE (Thư mục mã nguồn được Runner đăng ký)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    runner_id UUID NOT NULL REFERENCES public.runners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_runner_project_path UNIQUE (runner_id, path)
);

-- 5. AGENTS TABLE
CREATE TABLE IF NOT EXISTS public.agents (
    id TEXT PRIMARY KEY,
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    runner_id UUID REFERENCES public.runners(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    brief TEXT,
    system_instructions TEXT,
    color TEXT NOT NULL DEFAULT '#2563eb',
    avatar JSONB NOT NULL DEFAULT '{}'::jsonb,
    folder_path TEXT,
    conversation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    runner_id UUID REFERENCES public.runners(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    folder_path TEXT NOT NULL,
    conversation_id TEXT,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Bình thường' CHECK (priority IN ('Bình thường', 'Quan trọng', 'Gấp')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'review', 'success', 'error', 'interrupted')),
    current_activity TEXT,
    response_text TEXT NOT NULL DEFAULT '',
    error_text TEXT,
    duration_seconds DOUBLE PRECISION,
    feedback TEXT DEFAULT '',
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    cancel_requested BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TASK_EVENTS TABLE (Streaming events từ Antigravity CLI)
CREATE TABLE IF NOT EXISTS public.task_events (
    id BIGSERIAL PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('init', 'tool', 'text_delta', 'completed', 'error', 'interrupted')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_office_status ON public.tasks (office_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON public.tasks (agent_id);
CREATE INDEX IF NOT EXISTS idx_task_events_task ON public.task_events (task_id, id);
CREATE INDEX IF NOT EXISTS idx_runners_office_hb ON public.runners (office_id, last_heartbeat_at);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

-- OFFICES
CREATE POLICY "Users can view own office" ON public.offices
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Users can create own office" ON public.offices
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own office" ON public.offices
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid());

-- RUNNERS
CREATE POLICY "Users can view runners of own office" ON public.runners
    FOR SELECT TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage runners of own office" ON public.runners
    FOR ALL TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

-- PROJECTS
CREATE POLICY "Users can view projects of own office" ON public.projects
    FOR SELECT TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage projects of own office" ON public.projects
    FOR ALL TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

-- AGENTS
CREATE POLICY "Users can view agents of own office" ON public.agents
    FOR SELECT TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage agents of own office" ON public.agents
    FOR ALL TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

-- TASKS
CREATE POLICY "Users can view tasks of own office" ON public.tasks
    FOR SELECT TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage tasks of own office" ON public.tasks
    FOR ALL TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

-- TASK_EVENTS
CREATE POLICY "Users can view task events of own office" ON public.task_events
    FOR SELECT TO authenticated
    USING (office_id IN (SELECT id FROM public.offices WHERE owner_id = auth.uid()));

-- ============================================================================
-- 9. HELPER RPC FUNCTIONS FOR AUTH & RUNNER ATOMIC OPS
-- ============================================================================

-- Function: Get or Create Office for Authenticated User
CREATE OR REPLACE FUNCTION public.get_or_create_user_office()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_office_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT id INTO v_office_id FROM public.offices WHERE owner_id = v_user_id LIMIT 1;
    IF v_office_id IS NULL THEN
        INSERT INTO public.offices (owner_id, name)
        VALUES (v_user_id, 'The Workroom')
        RETURNING id INTO v_office_id;
    END IF;

    RETURN v_office_id;
END;
$$;

-- Function: Runner Heartbeat
CREATE OR REPLACE FUNCTION public.runner_heartbeat(
    p_runner_id UUID,
    p_secret_token_hash TEXT,
    p_status TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_found UUID;
BEGIN
    SELECT id INTO v_found
    FROM public.runners
    WHERE id = p_runner_id AND secret_token_hash = p_secret_token_hash;

    IF v_found IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE public.runners
    SET status = p_status,
        last_heartbeat_at = now(),
        metadata = p_metadata,
        updated_at = now()
    WHERE id = p_runner_id;

    RETURN TRUE;
END;
$$;

-- Function: Atomic Claim Next Queued Task for Runner
-- Prevents double execution or race conditions across runners
CREATE OR REPLACE FUNCTION public.claim_next_task(
    p_runner_id UUID,
    p_secret_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_office_id UUID;
    v_task RECORD;
BEGIN
    SELECT office_id INTO v_office_id
    FROM public.runners
    WHERE id = p_runner_id AND secret_token_hash = p_secret_token_hash;

    IF v_office_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Select oldest queued task for this runner/office with row lock (SKIP LOCKED)
    SELECT * INTO v_task
    FROM public.tasks
    WHERE office_id = v_office_id
      AND status = 'queued'
      AND (runner_id = p_runner_id OR runner_id IS NULL)
    ORDER BY started_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_task.id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE public.tasks
    SET status = 'running',
        runner_id = p_runner_id,
        claimed_at = now(),
        updated_at = now()
    WHERE id = v_task.id;

    RETURN to_jsonb(v_task);
END;
$$;

-- Function: Register or Sync Runner Projects (Local directories on Windows)
CREATE OR REPLACE FUNCTION public.sync_runner_projects(
    p_runner_id UUID,
    p_secret_token_hash TEXT,
    p_projects JSONB -- Array of { name: string, path: string }
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_office_id UUID;
    v_item JSONB;
    v_count INTEGER := 0;
BEGIN
    SELECT office_id INTO v_office_id
    FROM public.runners
    WHERE id = p_runner_id AND secret_token_hash = p_secret_token_hash;

    IF v_office_id IS NULL THEN
        RETURN 0;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_projects)
    LOOP
        INSERT INTO public.projects (office_id, runner_id, name, path, updated_at)
        VALUES (
            v_office_id,
            p_runner_id,
            v_item->>'name',
            v_item->>'path',
            now()
        )
        ON CONFLICT (runner_id, path) DO UPDATE
        SET name = EXCLUDED.name,
            updated_at = now();
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Function: Update Task Progress and Event Stream from Runner
CREATE OR REPLACE FUNCTION public.report_task_progress(
    p_runner_id UUID,
    p_secret_token_hash TEXT,
    p_task_id TEXT,
    p_event_type TEXT,
    p_current_activity TEXT,
    p_response_delta TEXT,
    p_final_status TEXT,
    p_error_text TEXT,
    p_duration_seconds DOUBLE PRECISION,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_office_id UUID;
BEGIN
    SELECT office_id INTO v_office_id
    FROM public.runners
    WHERE id = p_runner_id AND secret_token_hash = p_secret_token_hash;

    IF v_office_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Insert event into task_events
    INSERT INTO public.task_events (task_id, office_id, event_type, payload)
    VALUES (p_task_id, v_office_id, p_event_type, p_payload);

    -- Update task record
    IF p_final_status IS NOT NULL THEN
        UPDATE public.tasks
        SET status = p_final_status,
            current_activity = NULL,
            error_text = p_error_text,
            duration_seconds = p_duration_seconds,
            completed_at = now(),
            cancel_requested = false,
            response_text = CASE 
                WHEN p_payload->>'response' IS NOT NULL THEN p_payload->>'response'
                ELSE response_text || COALESCE(p_response_delta, '')
            END,
            updated_at = now()
        WHERE id = p_task_id AND office_id = v_office_id;
    ELSE
        UPDATE public.tasks
        SET current_activity = COALESCE(p_current_activity, current_activity),
            response_text = response_text || COALESCE(p_response_delta, ''),
            updated_at = now()
        WHERE id = p_task_id AND office_id = v_office_id;
    END IF;

    -- Sync conversation_id if present in payload
    IF p_payload->>'conversation_id' IS NOT NULL THEN
        UPDATE public.tasks
        SET conversation_id = p_payload->>'conversation_id'
        WHERE id = p_task_id AND office_id = v_office_id;

        UPDATE public.agents
        SET conversation_id = p_payload->>'conversation_id'
        WHERE id = (SELECT agent_id FROM public.tasks WHERE id = p_task_id) AND office_id = v_office_id;
    END IF;

    RETURN TRUE;
END;
$$;

-- Function: User requests task cancellation
CREATE OR REPLACE FUNCTION public.request_task_cancellation(
    p_task_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_task RECORD;
    v_runner RECORD;
    v_is_runner_stale BOOLEAN := false;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT t.* INTO v_task
    FROM public.tasks t
    JOIN public.offices o ON t.office_id = o.id
    WHERE t.id = p_task_id AND o.owner_id = v_user_id;

    IF v_task.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found or unauthorized');
    END IF;

    IF v_task.status NOT IN ('queued', 'running') THEN
        RETURN jsonb_build_object('success', true, 'message', 'Task already completed or stopped');
    END IF;

    -- If task is queued and not yet claimed, interrupt immediately
    IF v_task.status = 'queued' THEN
        UPDATE public.tasks
        SET status = 'interrupted',
            error_text = 'Người dùng đã hủy trước khi thực thi.',
            completed_at = now(),
            updated_at = now()
        WHERE id = p_task_id;
        RETURN jsonb_build_object('success', true, 'status', 'interrupted');
    END IF;

    -- Check runner heartbeat
    IF v_task.runner_id IS NOT NULL THEN
        SELECT * INTO v_runner FROM public.runners WHERE id = v_task.runner_id;
        IF v_runner.last_heartbeat_at IS NULL OR v_runner.last_heartbeat_at < (now() - INTERVAL '30 seconds') THEN
            v_is_runner_stale := true;
        END IF;
    ELSE
        v_is_runner_stale := true;
    END IF;

    -- If runner is offline/stale, mark interrupted immediately
    IF v_is_runner_stale THEN
        UPDATE public.tasks
        SET status = 'interrupted',
            error_text = 'Runner ngoại tuyến, tác vụ đã được đánh dấu gián đoạn.',
            completed_at = now(),
            cancel_requested = false,
            updated_at = now()
        WHERE id = p_task_id;
        RETURN jsonb_build_object('success', true, 'status', 'interrupted');
    END IF;

    -- Runner is online: signal cancellation request
    UPDATE public.tasks
    SET cancel_requested = true,
        updated_at = now()
    WHERE id = p_task_id;

    RETURN jsonb_build_object('success', true, 'status', 'cancelling');
END;
$$;

-- Function: Create or Pair Windows Runner for authenticated user
CREATE OR REPLACE FUNCTION public.create_runner_pair(
    p_name TEXT DEFAULT 'Windows Runner'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_office_id UUID;
    v_runner_id UUID := gen_random_uuid();
    v_raw_token TEXT;
    v_token_hash TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT id INTO v_office_id FROM public.offices WHERE owner_id = v_user_id LIMIT 1;
    IF v_office_id IS NULL THEN
        INSERT INTO public.offices (owner_id, name)
        VALUES (v_user_id, 'The Workroom')
        RETURNING id INTO v_office_id;
    END IF;

    -- Generate random token
    v_raw_token := 'rnt_' || encode(gen_random_bytes(24), 'hex');
    v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

    INSERT INTO public.runners (id, office_id, name, status, secret_token_hash)
    VALUES (v_runner_id, v_office_id, p_name, 'offline', v_token_hash);

    RETURN jsonb_build_object(
        'runner_id', v_runner_id,
        'secret_token', v_raw_token,
        'token_hash', v_token_hash,
        'name', p_name
    );
END;
$$;

-- ============================================================================
-- 10. REALTIME CONFIGURATION
-- ============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.runners;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_events;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- 11. SEED DEFAULT 7 AGENTS (Chạy an toàn, không trùng lặp)
-- ============================================================================
DO $$
DECLARE
    v_office_id UUID;
BEGIN
    -- Lấy văn phòng đầu tiên
    SELECT id INTO v_office_id FROM public.offices LIMIT 1;

    IF v_office_id IS NOT NULL THEN
        -- 1. Huy (Leader) - Cột 1, Bàn 1
        INSERT INTO public.agents (id, office_id, name, role, brief, system_instructions, color, folder_path, avatar, created_at, updated_at)
        VALUES (
            'agent-huy',
            v_office_id,
            'Huy (Leader)',
            'Frontend Developer, Designer',
            'Leader phụ trách định hướng kiến trúc Frontend, UI/UX Design, kiểm duyệt chất lượng giao diện và điều phối công việc.',
            'Leader phụ trách định hướng kiến trúc Frontend, UI/UX Design, kiểm duyệt chất lượng giao diện và điều phối công việc.',
            '#2a624d',
            'C:\Users\tranp\OneDrive\Desktop\TranPhuoc\Work\WeMastertrade\WeGolden\wegolden',
            '{"skinColor":"#f1c4a5","hairStyle":"short","hairColor":"#2b231b","clothesColor":"#2a624d","accessory":"glasses"}'::jsonb,
            '2026-10-24 07:38:48.85+00',
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            office_id = EXCLUDED.office_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            brief = EXCLUDED.brief,
            system_instructions = EXCLUDED.system_instructions,
            color = EXCLUDED.color,
            folder_path = EXCLUDED.folder_path,
            avatar = EXCLUDED.avatar,
            updated_at = now();

        -- 2. Tường - Cột 1, Bàn 2
        INSERT INTO public.agents (id, office_id, name, role, brief, system_instructions, color, folder_path, avatar, created_at, updated_at)
        VALUES (
            'agent-tuong',
            v_office_id,
            'Tường',
            'Frontend Developer, Designer',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: giao diện người dùng, responsive design và tối ưu trải nghiệm tương tác.',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: giao diện người dùng, responsive design và tối ưu trải nghiệm tương tác.',
            '#2563eb',
            'C:\Users\tranp\OneDrive\Desktop\TranPhuoc\Work\WeMastertrade\WeGolden\wegolden',
            '{"skinColor":"#f1c4a5","hairStyle":"messy","hairColor":"#343f42","clothesColor":"#2563eb","accessory":"none"}'::jsonb,
            '2026-10-24 07:38:49.85+00',
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            office_id = EXCLUDED.office_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            brief = EXCLUDED.brief,
            system_instructions = EXCLUDED.system_instructions,
            color = EXCLUDED.color,
            folder_path = EXCLUDED.folder_path,
            avatar = EXCLUDED.avatar,
            updated_at = now();

        -- 3. Phước - Cột 1, Bàn 3
        INSERT INTO public.agents (id, office_id, name, role, brief, system_instructions, color, folder_path, avatar, created_at, updated_at)
        VALUES (
            'agent-phuoc',
            v_office_id,
            'Phước',
            'Frontend Developer, Designer',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: phát triển component UI, thiết kế đồ họa pixel và tinh chỉnh giao diện web.',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: phát triển component UI, thiết kế đồ họa pixel và tinh chỉnh giao diện web.',
            '#7c3aed',
            'C:\Users\tranp\OneDrive\Desktop\TranPhuoc\Work\WeMastertrade\WeGolden\wegolden',
            '{"skinColor":"#f1c4a5","hairStyle":"short","hairColor":"#4a2c11","clothesColor":"#7c3aed","accessory":"none"}'::jsonb,
            '2026-10-24 07:38:50.85+00',
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            office_id = EXCLUDED.office_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            brief = EXCLUDED.brief,
            system_instructions = EXCLUDED.system_instructions,
            color = EXCLUDED.color,
            folder_path = EXCLUDED.folder_path,
            avatar = EXCLUDED.avatar,
            updated_at = now();

        -- 4. Toàn - Cột 1, Bàn 4
        INSERT INTO public.agents (id, office_id, name, role, brief, system_instructions, color, folder_path, avatar, created_at, updated_at)
        VALUES (
            'agent-toan',
            v_office_id,
            'Toàn',
            'Frontend Developer, Designer',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: CSS animation, thiết kế layout hiện đại và tối ưu hiệu suất hiển thị.',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: CSS animation, thiết kế layout hiện đại và tối ưu hiệu suất hiển thị.',
            '#d97706',
            'C:\Users\tranp\OneDrive\Desktop\TranPhuoc\Work\WeMastertrade\WeMastertrade\flatsome',
            '{"skinColor":"#f1c4a5","hairStyle":"parted","hairColor":"#575064","clothesColor":"#d97706","accessory":"headset"}'::jsonb,
            '2026-10-24 07:38:51.85+00',
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            office_id = EXCLUDED.office_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            brief = EXCLUDED.brief,
            system_instructions = EXCLUDED.system_instructions,
            color = EXCLUDED.color,
            folder_path = EXCLUDED.folder_path,
            avatar = EXCLUDED.avatar,
            updated_at = now();

        -- 5. Thành - Cột 2, Bàn 1
        INSERT INTO public.agents (id, office_id, name, role, brief, system_instructions, color, folder_path, avatar, created_at, updated_at)
        VALUES (
            'agent-thanh',
            v_office_id,
            'Thành',
            'Frontend Developer, Designer',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: xây dựng giao diện tương tác, thiết kế prototype và đảm bảo tính thẩm mỹ cao.',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: xây dựng giao diện tương tác, thiết kế prototype và đảm bảo tính thẩm mỹ cao.',
            '#dc2626',
            'C:\Users\tranp\OneDrive\Desktop\TranPhuoc\Work\AgentOffice',
            '{"skinColor":"#f1c4a5","hairStyle":"short","hairColor":"#1e293b","clothesColor":"#dc2626","accessory":"none"}'::jsonb,
            '2026-10-24 07:38:52.85+00',
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            office_id = EXCLUDED.office_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            brief = EXCLUDED.brief,
            system_instructions = EXCLUDED.system_instructions,
            color = EXCLUDED.color,
            folder_path = EXCLUDED.folder_path,
            avatar = EXCLUDED.avatar,
            updated_at = now();

        -- 6. Long - Cột 2, Bàn 2
        INSERT INTO public.agents (id, office_id, name, role, brief, system_instructions, color, folder_path, avatar, created_at, updated_at)
        VALUES (
            'agent-long',
            v_office_id,
            'Long',
            'Frontend Developer, Designer',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: thiết kế UI hệ thống (Design Systems), style tokens và chuẩn hóa components.',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: thiết kế UI hệ thống (Design Systems), style tokens và chuẩn hóa components.',
            '#059669',
            'C:\Users\tranp\OneDrive\Desktop\TranPhuoc\Work\AgentOffice\test_workspace_alpha',
            '{"skinColor":"#f1c4a5","hairStyle":"messy","hairColor":"#704934","clothesColor":"#059669","accessory":"glasses"}'::jsonb,
            '2026-10-24 07:38:53.85+00',
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            office_id = EXCLUDED.office_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            brief = EXCLUDED.brief,
            system_instructions = EXCLUDED.system_instructions,
            color = EXCLUDED.color,
            folder_path = EXCLUDED.folder_path,
            avatar = EXCLUDED.avatar,
            updated_at = now();

        -- 7. Hiếu - Cột 2, Bàn 3
        INSERT INTO public.agents (id, office_id, name, role, brief, system_instructions, color, folder_path, avatar, created_at, updated_at)
        VALUES (
            'agent-hieu',
            v_office_id,
            'Hiếu',
            'Frontend Developer, Designer',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: tối ưu trải nghiệm người dùng (UX), thiết kế responsive đa nền tảng và kiểm thử giao diện.',
            'Chuyên viên Frontend Developer & Designer. Chuyên môn: tối ưu trải nghiệm người dùng (UX), thiết kế responsive đa nền tảng và kiểm thử giao diện.',
            '#0284c7',
            'C:\Users\tranp\OneDrive\Desktop\TranPhuoc\Work\AgentOffice\test_workspace_beta',
            '{"skinColor":"#f1c4a5","hairStyle":"parted","hairColor":"#1c1917","clothesColor":"#0284c7","accessory":"none"}'::jsonb,
            '2026-10-24 07:38:54.85+00',
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            office_id = EXCLUDED.office_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            brief = EXCLUDED.brief,
            system_instructions = EXCLUDED.system_instructions,
            color = EXCLUDED.color,
            folder_path = EXCLUDED.folder_path,
            avatar = EXCLUDED.avatar,
            updated_at = now();
    END IF;
END $$;

