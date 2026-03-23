const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');
const sheet = workbook.Sheets['NS'];
const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

console.log('=== NS Sheet 检查子分类2 ===');
const subCat2Values = {};
jsonData.forEach((row, idx) => {
  if (idx === 0) return;
  const subCat2 = row[4]; // 子分类2
  const key = subCat2 === undefined || subCat2 === '' ? '(空)' : String(subCat2);
  if (!subCat2Values[key]) subCat2Values[key] = 0;
  subCat2Values[key]++;
});

Object.entries(subCat2Values).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(k + ': ' + v);
});

// 检查最后几行
console.log('\n=== NS Sheet 最后10行 ===');
const startIdx = Math.max(0, jsonData.length - 10);
for (let i = startIdx; i < jsonData.length; i++) {
  console.log('行' + (i+1) + ': 游戏名=' + jsonData[i][0] + ', 平台1=' + jsonData[i][1] + ', 平台2=' + jsonData[i][2] + ', 子分类1=' + jsonData[i][3] + ', 子分类2=' + jsonData[i][4]);
}
