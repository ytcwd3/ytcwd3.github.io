const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

async function queryAllData() {
  let allData = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/games?select=id,category,subcategory&order=id.asc&limit=${limit}&offset=${offset}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
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
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/games?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        category: [category],
        subcategory: [subcategory]
      })
    }
  );
  return response.ok;
}

async function main() {
  console.log('=== 开始更新 Supabase 数据 ===\n');

  // 获取所有数据
  console.log('1. 获取所有数据...');
  const allData = await queryAllData();
  console.log(`   总共 ${allData.length} 条记录\n`);

  // 定义分类映射
  // 子分类 -> 主分类
  const subcatToMainCat = {
    // PC
    '必备软件': 'PC', '各种合集': 'PC', '网游单击': 'PC', '横版过关': 'PC',
    '平台跳跃': 'PC', '战棋策略': 'PC', 'RPG': 'PC', '双人': 'PC',
    '射击': 'PC', '动作': 'PC', '经营': 'PC', '魂类': 'PC',
    '竞速运动': 'PC', '潜行': 'PC', '解谜': 'PC', '格斗无双': 'PC',
    '恐怖': 'PC', '不正经': 'PC', '小游戏': 'PC', '修改器金手指': 'PC', '互动影游': 'PC',
    '安卓': 'PC',

    // NS
    'NS': 'NS', 'NS乙女': 'NS',

    // 任天堂掌机
    '3DS': '任天堂掌机', 'NDS': '任天堂掌机', 'GBA': '任天堂掌机',
    'GB': '任天堂掌机', 'GBC': '任天堂掌机',

    // 任天堂主机
    'Wii U': '任天堂主机', 'NGC': '任天堂主机', 'Wii': '任天堂主机',
    'N64': '任天堂主机', 'SFC': '任天堂主机', 'FC': '任天堂主机',

    // 索尼 (保持不变)
    'PSP': '索尼', 'PS2': '索尼', 'PS3': '索尼', 'PS Vita': '索尼',
    'PS1': '索尼', 'PS4': '索尼',

    // Ohter
    'MD': 'Ohter', 'SS': 'Ohter', 'DC': 'Ohter', '步步高电子词典': 'Ohter',
    '街机': 'Ohter', 'Xbox': 'Ohter', 'JAVA': 'Ohter', 'Neogeo': 'Ohter',
    'DOS': 'Ohter', '文曲星': 'Ohter', 'J2ME（诺基亚时代java）': 'Ohter', 'J2ME（诺基亚时代Java）': 'Ohter'
  };

  // 统计需要更新的记录
  console.log('2. 分析数据...');
  let needUpdate = 0;
  let noMatch = [];

  allData.forEach(row => {
    const cats = Array.isArray(row.category) ? row.category : [];
    const subcats = Array.isArray(row.subcategory) ? row.subcategory : [];
    const mainCat = cats[0];
    const subCat = subcats[0];

    // 检查是否需要更新
    const targetCat = subcatToMainCat[subCat];
    if (targetCat && targetCat !== mainCat) {
      needUpdate++;
    } else if (!targetCat && subCat) {
      noMatch.push({ id: row.id, subCat, mainCat });
    }
  });

  console.log(`   需要更新: ${needUpdate} 条`);
  console.log(`   无法匹配: ${noMatch.length} 条`);
  if (noMatch.length > 0) {
    console.log('   无法匹配的子分类:');
    noMatch.slice(0, 10).forEach(item => {
      console.log(`     id=${item.id}, subCat="${item.subCat}", mainCat="${item.mainCat}"`);
    });
  }

  // 确认是否继续
  console.log('\n3. 开始更新...');
  let updated = 0;
  let errors = 0;

  for (const row of allData) {
    const cats = Array.isArray(row.category) ? row.category : [];
    const subcats = Array.isArray(row.subcategory) ? row.subcategory : [];
    const mainCat = cats[0];
    const subCat = subcats[0];

    const targetCat = subcatToMainCat[subCat];
    if (targetCat && targetCat !== mainCat) {
      const success = await updateRecord(row.id, targetCat, subCat);
      if (success) {
        updated++;
      } else {
        errors++;
      }

      if (updated % 500 === 0) {
        console.log(`   已更新 ${updated} 条...`);
      }
    }
  }

  console.log(`\n=== 更新完成 ===`);
  console.log(`成功更新: ${updated} 条`);
  console.log(`更新失败: ${errors} 条`);
}

main().catch(console.error);
