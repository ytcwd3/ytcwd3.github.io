const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

// 获取所有不同的子分类
fetch(SUPABASE_URL + '/rest/v1/games?select=subcategory,category&limit=1000', {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY
  }
}).then(r => r.json()).then(data => {
  const subcats = {};
  data.forEach(g => {
    const cat = g.category?.[0] || 'unknown';
    const subcat = g.subcategory?.[0] || 'unknown';
    if (!subcats[cat]) subcats[cat] = new Set();
    subcats[cat].add(subcat);
  });

  console.log('数据库中的分类统计:');
  Object.keys(subcats).forEach(cat => {
    console.log(cat + ':', Array.from(subcats[cat]).join(', '));
  });
}).catch(err => console.error('查询失败:', err));
