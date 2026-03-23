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

// 构建游戏数据列表
const games = [];

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
      games.push({
        name: String(gameName),
        category: [mainCat],
        subcategory: [subCat],
        code: row[5] || '',
        quarkpan: row[6] || '',
        baidupan: row[7] || '',
        thunderpan: row[8] || '',
        unzipcode: row[9] || '',
        updatedate: row[10] || ''
      });
    }
  });
});

console.log('从Excel读取了 ' + games.length + ' 条游戏数据');

// 删除所有现有数据
async function deleteAllData() {
  console.log('\n开始删除现有数据...');

  // 先获取所有ID
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/games?select=id&order=id.asc',
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    }
  );

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    console.log('数据库已经是空的');
    return 0;
  }

  console.log('数据库有 ' + data.length + ' 条记录需要删除');

  // 使用DELETE删除所有记录
  const deleteResponse = await fetch(
    SUPABASE_URL + '/rest/v1/games?select=id',
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal'
      }
    }
  );

  if (deleteResponse.ok) {
    console.log('删除成功！');
    return data.length;
  } else {
    console.log('删除失败:', await deleteResponse.text());
    return 0;
  }
}

// 批量上传数据
async function uploadGames(games) {
  console.log('\n开始上传 ' + games.length + ' 条数据...');

  const batchSize = 100;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);

    try {
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/games',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(batch)
        }
      );

      if (response.ok) {
        success += batch.length;
      } else {
        failed += batch.length;
        console.log('上传失败:', await response.text());
      }
    } catch (err) {
      failed += batch.length;
      console.error('错误:', err.message);
    }

    if ((i + batchSize) % 500 === 0 || i + batchSize >= games.length) {
      console.log('已上传 ' + Math.min(i + batchSize, games.length) + '/' + games.length);
    }
  }

  return { success, failed };
}

// 主函数
async function main() {
  const deleted = await deleteAllData();

  if (deleted > 0) {
    console.log('已删除 ' + deleted + ' 条记录');
  }

  const result = await uploadGames(games);

  console.log('\n=== 完成 ===');
  console.log('成功上传: ' + result.success);
  console.log('上传失败: ' + result.failed);
}

main().catch(err => {
  console.error('错误:', err);
});
