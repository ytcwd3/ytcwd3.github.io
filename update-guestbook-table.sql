-- 删除旧的guestbook表（如果需要重新创建）
DROP TABLE IF EXISTS public.guestbook;

-- 创建留言板表（不含邮箱）
CREATE TABLE public.guestbook (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.guestbook ENABLE ROW LEVEL SECURITY;

-- 创建允许读取的策略
CREATE POLICY "允许读取留言" ON public.guestbook
  FOR SELECT USING (true);

-- 创建允许插入的策略
CREATE POLICY "允许留言" ON public.guestbook
  FOR INSERT WITH CHECK (true);
