const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');

['PC', 'NS', '任天堂掌机', '任天堂主机', '索尼', 'other'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

  console.log('\n=== ' + sheetName + ' 空子分类1的行 ===');
  let emptyRows = [];
  jsonData.forEach((row, idx) => {
    if (idx === 0) return; // 跳过表头
    const subCat = row[3]; // 子分类1
    if (subCat === undefined || subCat === '') {
      emptyRows.push({rowNum: idx + 1, gameName: row[0], platform1: row[1], platform2: row[2]});
    }
  });

  console.log('共 ' + emptyRows.length + ' 条空行');
  emptyRows.slice(0, 10).forEach(r => {
    console.log('行' + r.rowNum + ': 游戏名=' + r.gameName + ', 平台1=' + r.platform1 + ', 平台2=' + r.platform2);
  });
});
