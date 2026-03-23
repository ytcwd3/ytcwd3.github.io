const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');

['PC', 'NS', '任天堂掌机', '任天堂主机', '索尼', 'other'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

  console.log('\n=== ' + sheetName + ' 子分类为空的行 ===');
  let count = 0;
  jsonData.forEach((row, idx) => {
    if (idx === 0) return;
    const subCat = row[3];
    if (subCat === undefined || subCat === '') {
      count++;
      if (count <= 15) {
        console.log('行' + (idx+1) + ': 游戏名=' + row[0] + ', 平台1=' + row[1] + ', 子分类1=' + row[3]);
      }
    }
  });
  console.log('共 ' + count + ' 条');
});
