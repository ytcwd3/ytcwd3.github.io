const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

async function checkData() {
  // 检查最大 id
  console.log('=== 检查最大 ID ===');
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/games?select=id&order=id.desc&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );
  const data = await response.json();
  console.log('最大 ID:', data[0]?.id);

  // 检查总行数
  console.log('\n=== 检查总行数 (使用 Prefer: count=exact) ===');
  const countResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/games?select=id`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    }
  );
  const totalCount = countResponse.headers.get('content-range');
  console.log('Content-Range:', totalCount);

  // 检查 id 范围
  console.log('\n=== ID 范围 ===');
  const minResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/games?select=id&order=id.asc&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );
  const minData = await minResponse.json();
  console.log('最小 ID:', minData[0]?.id);

  // 检查空 id
  console.log('\n=== 检查是否有空 ID ===');
  const emptyResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/games?select=id&category=eq.null`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );
  const emptyData = await emptyResponse.json();
  console.log('空分类记录数:', emptyData.length);
}

checkData().catch(console.error);
