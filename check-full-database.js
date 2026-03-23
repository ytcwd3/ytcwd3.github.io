const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

// 获取全部数据
fetch(SUPABASE_URL + '/rest/v1/games?select=id,name,category,subcategory', {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY
  }
}).then(r => r.json()).then(data => {
  console.log('总记录数:', data.length);

  // 统计所有subcategory
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

  console.log('\n数据库中所有子类的数量统计（共' + sorted.length + '个）:');
  sorted.forEach(([subcat, count]) => {
    console.log('[' + subcat + ']: ' + count + '条');
  });

  // 检查特定的
  console.log('\n检查\"动作\":', subcatCount['动作'] || 0, '条');
  console.log('检查\"经营\":', subcatCount['经营'] || 0, '条');
  console.log('检查\"安卓\":', subcatCount['安卓'] || 0, '条');
  console.log('检查\"NS\":', subcatCount['NS'] || 0, '条');
  console.log('检查\"RPG\":', subcatCount['RPG'] || 0, '条');

  // 显示几个\"动作\"的样例
  console.log('\n\"动作\"子类示例（前5条）:');
  const dongzuo = data.filter(g => g.subcategory && g.subcategory.includes('动作'));
  dongzuo.slice(0, 5).forEach(g => {
    console.log('- ' + g.name + ' | ' + JSON.stringify(g.subcategory));
  });
}).catch(err => console.error('查询失败:', err));
