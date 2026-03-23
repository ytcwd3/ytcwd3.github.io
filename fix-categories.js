const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

// 根据旧主分类 + 子分类 -> 新主分类
function getNewCategory(oldMainCat, subCat) {
  // NS 相关 -> NS
  if (['NS', 'NS乙女'].includes(subCat)) return 'NS';

  // 任天堂掌机相关 -> 任天堂掌机
  if (['3DS', 'NDS', 'GBA', 'GB', 'GBC'].includes(subCat)) return '任天堂掌机';

  // 任天堂主机相关 -> 任天堂主机
  if (['Wii', 'NGC', 'Wii U', 'N64', 'SFC', 'FC'].includes(subCat)) return '任天堂主机';

  // PC及安卓 -> PC
  if (oldMainCat === 'PC及安卓') return 'PC';

  // 其他平台 -> Ohter
  if (oldMainCat === '其他平台') return 'Ohter';

  // 索尼保持不变
  if (oldMainCat === '索尼') return '索尼';

  // 任天堂里没匹配到的，保留原样（或者根据子分类判断）
  if (oldMainCat === '任天堂') {
    // 任天堂主机的子分类
    if (['Wii', 'NGC', 'Wii U', 'N64', 'SFC', 'FC'].includes(subCat)) return '任天堂主机';
    // 任天堂掌机的子分类
    if (['3DS', 'NDS', 'GBA', 'GB', 'GBC'].includes(subCat)) return '任天堂掌机';
    // NS 的子分类
    if (['NS', 'NS乙女'].includes(subCat)) return 'NS';
  }

  // 未知分类返回原值
  return oldMainCat;
}

async function queryAll() {
  let allData = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/games?select=id,category,subcategory&order=id.asc&limit=${limit}&offset=${offset}`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allData = allData.concat(data);
    offset += limit;
    if (data.length < limit) break;
  }
  return allData;
}

async function updateRecord(id, category, subcategory) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/games?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ category: [category], subcategory: [subcategory] })
    }
  );
}

async function main() {
  console.log('=== 重新更新 Supabase 分类 ===\n');

  const allData = await queryAll();
  console.log(`总记录数: ${allData.length}\n`);

  let needUpdate = [];
  let noChange = 0;
  let unknown = [];

  allData.forEach(row => {
    const cats = Array.isArray(row.category) ? row.category : [];
    const subcats = Array.isArray(row.subcategory) ? row.subcategory : [];
    const oldMainCat = cats[0];
    const subCat = subcats[0];

    const newMainCat = getNewCategory(oldMainCat, subCat);

    if (newMainCat !== oldMainCat) {
      needUpdate.push({ id: row.id, oldMainCat, newMainCat, subCat });
    } else {
      noChange++;
    }
  });

  console.log(`需要更新: ${needUpdate.length} 条`);
  console.log(`无需更新: ${noChange} 条\n`);

  // 显示待更新的分布
  const updateGroups = {};
  needUpdate.forEach(item => {
    const key = `${item.oldMainCat} -> ${item.newMainCat}`;
    updateGroups[key] = (updateGroups[key] || 0) + 1;
  });
  console.log('更新分布:');
  Object.entries(updateGroups).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });

  console.log('\n开始更新...');
  let count = 0;
  for (const item of needUpdate) {
    await updateRecord(item.id, item.newMainCat, item.subCat);
    count++;
    if (count % 500 === 0) {
      console.log(`已更新: ${count}/${needUpdate.length}`);
    }
  }

  console.log(`\n=== 更新完成 ===`);
  console.log(`成功更新: ${count} 条`);
}

main().catch(console.error);
