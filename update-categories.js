const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

// 子分类 -> 主分类 映射
const SUBCAT_TO_MAIN = {
  // PC
  '必备软件': 'PC', '各种合集': 'PC', '横版过关': 'PC', '平台跳跃': 'PC',
  '战棋策略': 'PC', 'RPG': 'PC', '双人': 'PC', '射击': 'PC', '动作': 'PC',
  '经营': 'PC', '魂类': 'PC', '竞速运动': 'PC', '潜行': 'PC', '解谜': 'PC',
  '格斗无双': 'PC', '恐怖': 'PC', '不正经': 'PC', '小游戏': 'PC',
  '修改器金手指': 'PC', '互动影游': 'PC', '网游单击': 'PC', '网游单机': 'PC',
  // NS
  'NS': 'NS', 'NS乙女': 'NS',
  // 任天堂掌机
  'GBA': '任天堂掌机', 'NDS': '任天堂掌机', '3DS': '任天堂掌机', 'GB': '任天堂掌机', 'GBC': '任天堂掌机',
  // 任天堂主机
  'Wii': '任天堂主机', 'NGC': '任天堂主机', 'Wii U': '任天堂主机',
  'N64': '任天堂主机', 'SFC': '任天堂主机', 'FC': '任天堂主机',
  // 索尼
  'PSP': '索尼', 'PS2': '索尼', 'PS3': '索尼', 'PS Vita': '索尼', 'PS1': '索尼', 'PS4': '索尼',
  // Ohter
  'MD': 'Ohter', 'SS': 'Ohter', 'DC': 'Ohter', 'Xbox': 'Ohter', '街机': 'Ohter',
  'Neogeo': 'Ohter', 'DOS': 'Ohter', '文曲星': 'Ohter', '步步高电子词典': 'Ohter',
  'JAVA': 'Ohter', 'Java': 'Ohter',
  'J2ME（诺基亚时代Java）': 'Ohter', 'J2ME（诺基亚时代java）': 'Ohter',
  '安卓': 'Ohter'
};

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
  console.log('=== 更新 Supabase 分类 ===\n');

  const allData = await queryAll();
  console.log(`总记录数: ${allData.length}\n`);

  let updated = 0;
  let errors = 0;
  let noMatch = [];

  console.log('开始更新...\n');

  for (const row of allData) {
    const cats = Array.isArray(row.category) ? row.category : [];
    const subcats = Array.isArray(row.subcategory) ? row.subcategory : [];
    const currentMain = cats[0];
    const subCat = subcats[0];

    const targetMain = SUBCAT_TO_MAIN[subCat];

    if (targetMain) {
      if (targetMain !== currentMain) {
        await updateRecord(row.id, targetMain, subCat);
        updated++;
        if (updated % 500 === 0) console.log(`已更新: ${updated}...`);
      }
    } else if (subCat) {
      noMatch.push({ id: row.id, subCat, currentMain });
    }
  }

  console.log(`\n更新完成: ${updated} 条`);
  if (noMatch.length > 0) {
    console.log(`无法匹配: ${noMatch.length} 条`);
    noMatch.slice(0, 5).forEach(item => {
      console.log(`  id=${item.id}, subCat="${item.subCat}", main="${item.currentMain}"`);
    });
  }
}

main().catch(console.error);
