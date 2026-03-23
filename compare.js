const XLSX = require('xlsx');
const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

async function querySupabaseAll() {
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

async function main() {
  // ========== 读取 Excel ==========
  console.log('=== 读取 Excel ===');
  const workbook = XLSX.readFile('./自己分.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json(worksheet);

  // 统计 Excel
  const excelStats = {};
  let excelTotal = 0;
  excelData.forEach(row => {
    const mainCat = row['平台1'] || row['平台2'] || '(无)';
    const subCat = row['子分类1'] || row['子分类2'] || '(无)';
    if (!excelStats[mainCat]) excelStats[mainCat] = {};
    excelStats[mainCat][subCat] = (excelStats[mainCat][subCat] || 0) + 1;
    excelTotal++;
  });

  // ========== 查询 Supabase ==========
  console.log('=== 查询 Supabase ===');
  const supabaseData = await querySupabaseAll();

  // 统计 Supabase
  const supabaseStats = {};
  let supabaseTotal = 0;
  supabaseData.forEach(row => {
    const cats = Array.isArray(row.category) ? row.category : [];
    const subcats = Array.isArray(row.subcategory) ? row.subcategory : [];
    const mainCat = cats[0] || '(无)';
    const subCat = subcats[0] || '(无)';
    if (!supabaseStats[mainCat]) supabaseStats[mainCat] = {};
    supabaseStats[mainCat][subCat] = (supabaseStats[mainCat][subCat] || 0) + 1;
    supabaseTotal++;
  });

  // ========== 对比 ==========
  console.log('\n=== 数据对比 ===\n');

  const userData = {
    'PC': {
      '必备软件': 44, '各种合集': 20, '网游单击': 27, '横版过关': 113,
      '平台跳跃': 57, '战棋策略': 195, 'RPG': 403, '双人': 40,
      '射击': 176, '动作': 92, '经营': 123, '魂类': 28,
      '竞速运动': 82, '潜行': 40, '解谜': 60, '格斗无双': 53,
      '恐怖': 70, '不正经': 32, '小游戏': 135, '修改器金手指': 12, '互动影游': 86
    },
    'NS': { 'NS': 2658, 'NS乙女': 105 },
    '任天堂掌机': { '3DS': 324, 'NDS': 782, 'GBA': 531, 'GB': 2, 'GBC': 274 },
    '任天堂主机': { 'Wii U': 66, 'NGC': 34, 'Wii': 1685, 'N64': 23, 'SFC': 135, 'FC': 11 },
    '索尼': { 'PSP': 519, 'PS2': 220, 'PS3': 263, 'PS Vita': 454, 'PS1': 202, 'PS4': 56 },
    'Ohter': { 'MD': 134, 'SS': 43, 'DC': 50, '步步高电子词典': 1, '街机': 6, 'Xbox': 3,
      'Java': 1, 'Neogeo': 1, 'DOS': 1, '文曲星': 1, 'J2ME（诺基亚时代Java）': 1, '安卓': 61 }
  };

  let totalUser = 0;
  let totalDiff = 0;
  let allMatch = true;

  Object.entries(userData).forEach(([mainCat, subcats]) => {
    let userCatTotal = 0;
    let supaCatTotal = 0;

    console.log(`【${mainCat}】`);

    Object.entries(subcats).forEach(([subcat, userCount]) => {
      userCatTotal += userCount;
      const supaCount = supabaseStats[mainCat]?.[subcat] || 0;
      supaCatTotal += supaCount;

      const diff = userCount - supaCount;
      if (diff !== 0) {
        console.log(`  ${subcat}: 用户=${userCount}, 数据库=${supaCount}, 差=${diff > 0 ? '+' : ''}${diff} ⚠️`);
        totalDiff += diff;
        allMatch = false;
      } else {
        console.log(`  ${subcat}: ${userCount} ✅`);
      }
    });

    totalUser += userCatTotal;
    console.log(`  小计: 用户${userCatTotal}, 数据库${supaCatTotal}`);
    if (userCatTotal !== supaCatTotal) {
      console.log(`  ⚠️ 主分类差异: ${userCatTotal - supaCatTotal}`);
    }
    console.log('');
  });

  console.log('=== 汇总 ===');
  console.log(`用户总计: ${totalUser}`);
  console.log(`Excel总计: ${excelTotal}`);
  console.log(`Supabase总计: ${supabaseTotal}`);
  console.log(`与用户差异: ${totalDiff !== 0 ? totalDiff + ' (需补)' : '完全一致 ✅'}`);

  if (allMatch && totalDiff === 0) {
    console.log('\n🎉 数据完全匹配！');
  }
}

main().catch(console.error);
