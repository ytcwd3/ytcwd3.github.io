const XLSX = require('xlsx');

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

console.log('Excel中总记录数:', games.length);

// 统计所有subcategory
const subcatCount = {};
games.forEach(g => {
  if (g.subcategory && Array.isArray(g.subcategory)) {
    g.subcategory.forEach(s => {
      subcatCount[s] = (subcatCount[s] || 0) + 1;
    });
  }
});

// 按数量排序
const sorted = Object.entries(subcatCount).sort((a, b) => b[1] - a[1]);

console.log('\nExcel中所有子类的数量统计（共' + sorted.length + '个）:');
sorted.forEach(([subcat, count]) => {
  console.log('[' + subcat + ']: ' + count + '条');
});

console.log('\n检查\"动作\":', subcatCount['动作'] || 0, '条');
console.log('检查\"经营\":', subcatCount['经营'] || 0, '条');
console.log('检查\"安卓\":', subcatCount['安卓'] || 0, '条');
console.log('检查\"NS\":', subcatCount['NS'] || 0, '条');
console.log('检查\"RPG\":', subcatCount['RPG'] || 0, '条');
