-- 更新guestbook表，添加回复和删除相关字段
ALTER TABLE public.guestbook ADD COLUMN IF NOT EXISTS parent_id INTEGER;
ALTER TABLE public.guestbook ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE public.guestbook ADD COLUMN IF NOT EXISTS is_reply BOOLEAN DEFAULT FALSE;

-- 添加外键约束（可选）
-- ALTER TABLE public.guestbook ADD CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES public.guestbook(id) ON DELETE CASCADE;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_guestbook_parent_id ON public.guestbook(parent_id);
CREATE INDEX IF NOT EXISTS idx_guestbook_is_reply ON public.guestbook(is_reply);
