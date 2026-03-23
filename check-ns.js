const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');
const sheet = workbook.Sheets['NS'];
const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

const subCat1Values = {};
jsonData.forEach((row, idx) => {
  if (idx === 0) return;
  const subCat = row[3];
  const key = subCat === undefined || subCat === '' ? '(空)' : String(subCat);
  if (!subCat1Values[key]) subCat1Values[key] = 0;
  subCat1Values[key]++;
});

console.log('=== NS Sheet 子分类1 ===');
Object.entries(subCat1Values).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(k + ': ' + v);
});

console.log('\n=== 包含NS乙女的行 ===');
jsonData.forEach((row, idx) => {
  if (idx === 0) return;
  const gameName = String(row[0] || '');
  const subCat = String(row[3] || '');
  if (gameName.includes('NS乙女') || subCat.includes('NS乙女')) {
    console.log('行' + (idx + 1) + ': 游戏名=' + row[0] + ', 子分类1=' + row[3]);
  }
});
