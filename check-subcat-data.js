const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

// 查询前1000条，看看有哪些subcategory
fetch(SUPABASE_URL + '/rest/v1/games?select=id,name,category,subcategory&limit=100', {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY
  }
}).then(r => r.json()).then(data => {
  console.log('前100条数据示例:');
  data.slice(0, 20).forEach(g => {
    console.log(JSON.stringify(g));
  });

  // 统计必备软件
  const bibei = data.filter(g => g.subcategory && g.subcategory.includes('必备软件'));
  console.log('\n包含\"必备软件\"的记录数: ' + bibei.length);
  if (bibei.length > 0) {
    console.log('示例:', JSON.stringify(bibei[0]));
  }
}).catch(err => console.error('查询失败:', err));
