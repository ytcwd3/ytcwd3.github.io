const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

// 获取所有数据
fetch(SUPABASE_URL + '/rest/v1/games?select=id,name,category,subcategory&limit=10000', {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY
  }
}).then(r => r.json()).then(data => {
  // 统计所有subcategory的出现次数
  const subcatCount = {};

  data.forEach(g => {
    if (g.subcategory && Array.isArray(g.subcategory)) {
      g.subcategory.forEach(s => {
        subcatCount[s] = (subcatCount[s] || 0) + 1;
      });
    }
  });

  // 按数量排序
  const sorted = Object.entries(subcatCount).sort((a, b) => b[1] - a[1]);

  console.log('数据库中所有子类的数量统计:');
  sorted.forEach(([subcat, count]) => {
    console.log(subcat + ': ' + count + '条');
  });

  console.log('\n检查前端有的子类:');
  const frontendSubcats = ['动作', '经营', '魂类', '竞速运动', '潜行', '解谜', '格斗无双', '恐怖', '不正经', '小游戏', '修改器金手指', '互动影游', '网游单击', '安卓'];
  frontendSubcats.forEach(subcat => {
    const count = subcatCount[subcat] || 0;
    console.log(subcat + ': ' + count + '条 ' + (count > 0 ? '✓' : '✗'));
  });
}).catch(err => console.error('查询失败:', err));
