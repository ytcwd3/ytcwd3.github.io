const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

// 获取所有数据，仔细检查subcategory
fetch(SUPABASE_URL + '/rest/v1/games?select=id,name,category,subcategory&limit=500', {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY
  }
}).then(r => r.json()).then(data => {
  console.log('总记录数:', data.length);
  console.log('\n检查\"动作\"子类的记录:');
  const dongzuo = data.filter(g => g.subcategory && g.subcategory.includes('动作'));
  console.log('找到', dongzuo.length, '条');
  if (dongzuo.length > 0) {
    dongzuo.slice(0, 3).forEach(g => {
      console.log('- ' + g.name + ' | ' + JSON.stringify(g.subcategory));
    });
  }

  console.log('\n检查\"经营\"子类的记录:');
  const jingying = data.filter(g => g.subcategory && g.subcategory.includes('经营'));
  console.log('找到', jingying.length, '条');
  if (jingying.length > 0) {
    jingying.slice(0, 3).forEach(g => {
      console.log('- ' + g.name + ' | ' + JSON.stringify(g.subcategory));
    });
  }

  console.log('\n检查\"安卓\"子类的记录:');
  const anzhuo = data.filter(g => g.subcategory && g.subcategory.includes('安卓'));
  console.log('找到', anzhuo.length, '条');
  if (anzhuo.length > 0) {
    anzhuo.slice(0, 3).forEach(g => {
      console.log('- ' + g.name + ' | ' + JSON.stringify(g.subcategory));
    });
  }

  // 检查所有唯一的subcategory
  console.log('\n数据库中所有唯一的subcategory值:');
  const allSubcats = new Set();
  data.forEach(g => {
    if (g.subcategory && Array.isArray(g.subcategory)) {
      g.subcategory.forEach(s => allSubcats.add(s));
    }
  });
  console.log(Array.from(allSubcats).sort().join(' | '));
}).catch(err => console.error('查询失败:', err));
