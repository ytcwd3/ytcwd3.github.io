const XLSX = require('xlsx');

const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

const SHEET_CATEGORIES = {
  'PC': 'PC',
  'NS': 'NS',
  '任天堂掌机': '任天堂掌机',
  '任天堂主机': '任天堂主机',
  '索尼': '索尼',
  'other': 'Ohter'
};

// 读取Excel文件
const workbook = XLSX.readFile('./自己分.xlsx');

// 构建游戏分类映射
const gameCategoryMap = new Map(); // key: 游戏名 -> {category, subcategory}

Object.entries(SHEET_CATEGORIES).forEach(([sheetName, mainCat]) => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

  jsonData.forEach((row, idx) => {
    if (idx === 0) return; // 跳过表头
    const gameName = row[0];
    if (gameName === undefined || gameName === '') return; // 跳过空行

    let subCat = row[3]; // 子分类1
    const subCat2 = row[4]; // 子分类2

    // 特殊处理NS乙女
    if (subCat === 'NS' && subCat2 && subCat2 !== '') {
      subCat = subCat2;
    } else if (subCat === undefined || subCat === '') {
      subCat = subCat2 || null;
    }

    // 任天堂掌机需要根据游戏文件后缀来判断
    if (sheetName === '任天堂掌机' && subCat) {
      const gName = String(gameName).toLowerCase();
      if (gName.includes('.nds')) {
        subCat = 'NDS';
      } else if (gName.includes('.gba')) {
        subCat = 'GBA';
      } else if (gName.includes('.3ds')) {
        subCat = '3DS';
      } else if (gName.includes('.gbc')) {
        subCat = 'GBC';
      } else if (gName.includes('.gb') && !gName.includes('.gba') && !gName.includes('.gbc')) {
        subCat = 'GB';
      }
    }

    if (subCat) {
      gameCategoryMap.set(String(gameName), {
        category: [mainCat],
        subcategory: [subCat]
      });
    }
  });
});

console.log('从Excel读取了 ' + gameCategoryMap.size + ' 条游戏分类');

// 读取数据库现有数据
async function fetchAllGames() {
  let allData = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/games?select=id,name,category,subcategory&order=id.asc&limit=' + limit + '&offset=' + offset,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        }
      }
    );

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    allData = allData.concat(data);
    offset += limit;

    if (data.length < limit) break;
    console.log('已读取 ' + allData.length + ' 条...');
  }

  return allData;
}

// 批量更新数据库
async function updateGames(updates) {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    try {
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/games?id=eq.' + update.id,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            category: update.newCat,
            subcategory: update.newSubCat
          })
        }
      );

      if (response.ok) {
        success++;
      } else {
        failed++;
        console.log('更新失败:', update.id, await response.text());
      }

      if ((i + 1) % 500 === 0) {
        console.log('已更新 ' + (i + 1) + '/' + updates.length);
      }
    } catch (err) {
      failed++;
      console.error('错误:', err.message);
    }
  }

  return { success, failed };
}

// 统计
async function analyzeAndUpdate() {
  console.log('\n开始读取数据库...');
  const dbGames = await fetchAllGames();
  console.log('数据库共有 ' + dbGames.length + ' 条记录');

  let needUpdate = 0;
  let alreadyCorrect = 0;
  let notFound = 0;
  const updateList = [];

  dbGames.forEach(game => {
    const gameName = String(game.name || '');
    const excelData = gameCategoryMap.get(gameName);

    if (!excelData) {
      notFound++;
      return;
    }

    const dbCat = Array.isArray(game.category) ? game.category[0] : null;
    const dbSubCat = Array.isArray(game.subcategory) ? game.subcategory[0] : null;
    const excelCat = excelData.category[0];
    const excelSubCat = excelData.subcategory[0];

    if (dbCat === excelCat && dbSubCat === excelSubCat) {
      alreadyCorrect++;
    } else {
      needUpdate++;
      updateList.push({
        id: game.id,
        gameName: gameName,
        oldCat: dbCat,
        oldSubCat: dbSubCat,
        newCat: excelCat,
        newSubCat: excelSubCat
      });
    }
  });

  console.log('\n=== 分析结果 ===');
  console.log('无需更新: ' + alreadyCorrect);
  console.log('需要更新: ' + needUpdate);
  console.log('数据库有但Excel没有: ' + notFound);

  // 按新旧分类分组
  const updateGroups = {};
  updateList.forEach(item => {
    const key = (item.oldCat || '(无)') + ' -> ' + item.newCat;
    if (!updateGroups[key]) updateGroups[key] = [];
    updateGroups[key].push(item);
  });

  console.log('\n更新分布:');
  Object.entries(updateGroups).sort((a, b) => b[1].length - a[1].length).forEach(([key, items]) => {
    console.log('  ' + key + ': ' + items.length);
  });

  return { updateList, alreadyCorrect, notFound };
}

// 主函数
async function main() {
  const result = await analyzeAndUpdate();

  if (result.updateList.length === 0) {
    console.log('\n没有需要更新的记录');
    return;
  }

  console.log('\n开始更新数据库...');
  const updateResult = await updateGames(result.updateList);
  console.log('\n更新完成!');
  console.log('成功: ' + updateResult.success);
  console.log('失败: ' + updateResult.failed);
}

main().catch(err => {
  console.error('错误:', err);
});
