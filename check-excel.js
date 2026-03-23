const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');
const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
console.log('Excel总行数:', excelData.length);

// 统计
const stats = {};
excelData.forEach(row => {
  const mainCat = row['平台1'] || row['平台2'] || '(无)';
  const subCat = row['子分类1'] || row['子分类2'] || '(无)';
  if (!stats[mainCat]) stats[mainCat] = {};
  stats[mainCat][subCat] = (stats[mainCat][subCat] || 0) + 1;
});

console.log('\n=== Excel分类统计 ===\n');
let total = 0;
Object.entries(stats).sort((a,b) => Object.values(b[1]).reduce((s,n)=>s+n,0) - Object.values(a[1]).reduce((s,n)=>s+n,0)).forEach(([mainCat, subcats]) => {
  let catTotal = 0;
  Object.entries(subcats).forEach(([subCat, count]) => {
    catTotal += count;
  });
  total += catTotal;
  console.log(mainCat + ': ' + catTotal);
  Object.entries(subcats).sort((a,b) => b[1] - a[1]).forEach(([subCat, count]) => {
    console.log('  ' + subCat + ': ' + count);
  });
});
console.log('\nExcel总计:', total);
