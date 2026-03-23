const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');

const SHEET_CATEGORIES = {
  'PC': 'PC',
  'NS': 'NS',
  '任天堂掌机': '任天堂掌机',
  '任天堂主机': '任天堂主机',
  '索尼': '索尼',
  'other': 'Ohter'
};

Object.entries(SHEET_CATEGORIES).forEach(([sheetName, mainCat]) => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

  const subCatCount = {};
  let total = 0;
  let emptyCount = 0;

  jsonData.forEach((row, idx) => {
    if (idx === 0) return;
    const gameName = row[0];
    if (gameName === undefined || gameName === '') return;

    total++;
    // 子分类：优先用子分类1，如果为空则用子分类2
    // 但如果子分类1="NS"且子分类2="NS乙女"，则子分类应该是"NS乙女"
    let subCat = row[3];
    const subCat2 = row[4];

    // 特殊处理NS乙女
    if (subCat === 'NS' && subCat2 && subCat2 !== '') {
      subCat = subCat2;
    } else if (subCat === undefined || subCat === '') {
      subCat = subCat2 || '(无子分类)';
    }

    const key = String(subCat);
    if (!subCatCount[key]) subCatCount[key] = 0;
    subCatCount[key]++;
  });

  console.log('\n=== ' + sheetName + ' (主分类: ' + mainCat + ') ===');
  console.log('总计: ' + total);
  Object.entries(subCatCount).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log('  ' + k + ': ' + v);
  });
});
