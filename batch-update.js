const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

const SUBCAT_TO_MAIN = {
  '必备软件': 'PC', '各种合集': 'PC', '横版过关': 'PC', '平台跳跃': 'PC',
  '战棋策略': 'PC', 'RPG': 'PC', '双人': 'PC', '射击': 'PC', '动作': 'PC',
  '经营': 'PC', '魂类': 'PC', '竞速运动': 'PC', '潜行': 'PC', '解谜': 'PC',
  '格斗无双': 'PC', '恐怖': 'PC', '不正经': 'PC', '小游戏': 'PC',
  '修改器金手指': 'PC', '互动影游': 'PC', '网游单击': 'PC', '网游单机': 'PC',
  'NS': 'NS', 'NS乙女': 'NS',
  'GBA': '任天堂掌机', 'NDS': '任天堂掌机', '3DS': '任天堂掌机', 'GB': '任天堂掌机', 'GBC': '任天堂掌机',
  'Wii': '任天堂主机', 'NGC': '任天堂主机', 'Wii U': '任天堂主机',
  'N64': '任天堂主机', 'SFC': '任天堂主机', 'FC': '任天堂主机',
  'PSP': '索尼', 'PS2': '索尼', 'PS3': '索尼', 'PS Vita': '索尼', 'PS1': '索尼', 'PS4': '索尼',
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

async function batchUpdate(updates) {
  if (updates.length === 0) return;

  const ids = updates.map(u => u.id);
  const newCategory = updates[0].newCategory;

  // 使用子分类来匹配
  for (const update of updates) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/games?id=eq.${update.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ category: [update.newCategory], subcategory: [update.newSubcat] })
      }
    );
  }
}

async function main() {
  console.log('=== 批量更新 Supabase 分类 ===\n');

  const allData = await queryAll();
  console.log(`总记录数: ${allData.length}\n`);

  // 按 (当前主分类, 目标主分类, 子分类) 分组
  const updates = [];
  let skip = 0;

  allData.forEach(row => {
    const cats = Array.isArray(row.category) ? row.category : [];
    const subcats = Array.isArray(row.subcategory) ? row.subcategory : [];
    const currentMain = cats[0];
    const subCat = subcats[0];

    const targetMain = SUBCAT_TO_MAIN[subCat];

    if (targetMain && targetMain !== currentMain) {
      updates.push({ id: row.id, newCategory: targetMain, newSubcat: subCat });
    } else if (!targetMain && subCat) {
      skip++;
    }
  });

  console.log(`需要更新: ${updates.length} 条`);
  console.log(`跳过(无法匹配): ${skip} 条\n`);

  console.log('开始更新...');
  let count = 0;
  const batchSize = 50;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await batchUpdate(batch);
    count += batch.length;
    console.log(`已更新: ${count}/${updates.length}`);
  }

  console.log(`\n=== 更新完成 ===`);
  console.log(`成功更新: ${count} 条`);
}

main().catch(console.error);
