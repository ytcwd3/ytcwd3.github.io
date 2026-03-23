const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');
const sheet = workbook.Sheets['任天堂掌机'];
const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

console.log('=== 检查GB相关行 ===');
jsonData.forEach((row, idx) => {
  if (idx === 0) return;
  const gameName = String(row[0] || '');
  if (gameName.includes('GB') || (row[3] && String(row[3]).includes('GB')) || (row[4] && String(row[4]).includes('GB'))) {
    console.log('行' + (idx + 1) + ': 游戏名=' + row[0] + ', 子分类1=' + row[3] + ', 子分类2=' + row[4]);
  }
});
