const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');

['PC', 'NS', '任天堂掌机', '任天堂主机', '索尼', 'other'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

  const subCat1Values = {};
  jsonData.forEach((row, idx) => {
    if (idx === 0) return; // 跳过表头
    const subCat = row[3]; // 子分类1是第4列(index 3)
    const key = subCat === undefined || subCat === '' ? '(空)' : String(subCat);
    if (!subCat1Values[key]) subCat1Values[key] = [];
    subCat1Values[key].push(idx + 1);
  });

  console.log('\n=== ' + sheetName + ' 子分类1统计 ===');
  Object.entries(subCat1Values).sort((a, b) => b[1].length - a[1].length).forEach(([k, rows]) => {
    console.log(k + ': ' + rows.length);
  });
});
