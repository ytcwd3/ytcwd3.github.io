-- 创建 games 表
CREATE TABLE public.games (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT[] NOT NULL,
  subcategory TEXT[],
  code TEXT DEFAULT '',
  unzipcode TEXT DEFAULT '',
  quarkpan TEXT DEFAULT '',
  baidupan TEXT DEFAULT '',
  thunderpan TEXT DEFAULT '',
  updatedate TEXT DEFAULT ''
);

-- 启用RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- 创建允许读取的策略
CREATE POLICY "允许读取" ON public.games
  FOR SELECT USING (true);

-- 创建允许插入的策略
CREATE POLICY "允许插入" ON public.games
  FOR INSERT WITH CHECK (true);

-- 创建允许更新的策略
CREATE POLICY "允许更新" ON public.games
  FOR UPDATE USING (true);

-- 创建允许删除的策略
CREATE POLICY "允许删除" ON public.games
  FOR DELETE USING (true);
