const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');

['PC', 'NS', '任天堂掌机', '任天堂主机', '索尼', 'other'].forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

  const subCat1Values = {};
  let validCount = 0;
  let emptyCount = 0;
  let titleCount = 0; // 大标题行

  jsonData.forEach((row, idx) => {
    if (idx === 0) return; // 跳过表头
    const gameName = row[0];
    const platform1 = row[1];
    const subCat = row[3]; // 子分类1

    // 如果游戏名也是空的，才是真正的空数据
    if (gameName === undefined || gameName === '') {
      // 检查是否是标题行
      const strGame = String(gameName || '');
      if (strGame.includes('.') && (strGame.includes('必备软件') || strGame.includes('各种合集') || strGame.includes('网游单机') ||
          strGame.includes('横版过关') || strGame.includes('平台跳跃') || strGame.includes('战棋策略') ||
          strGame.includes('RPG') || strGame.includes('双人') || strGame.includes('射击') ||
          strGame.includes('NS') || strGame.includes('3DS') || strGame.includes('NDS') ||
          strGame.includes('GBA') || strGame.includes('GB') || strGame.includes('GBC') ||
          strGame.includes('Wii') || strGame.includes('NGC') || strGame.includes('N64') ||
          strGame.includes('SFC') || strGame.includes('FC') || strGame.includes('PSP') ||
          strGame.includes('PS2') || strGame.includes('PS3') || strGame.includes('PS Vita') ||
          strGame.includes('PS1') || strGame.includes('PS4') || strGame.includes('MD') ||
          strGame.includes('SS') || strGame.includes('DC') || strGame.includes('街机') ||
          strGame.includes('Xbox') || strGame.includes('JAVA') || strGame.includes('Neogeo') ||
          strGame.includes('DOS') || strGame.includes('文曲星') || strGame.includes('步步高') ||
          strGame.includes('J2ME') || strGame.includes('安卓'))) {
        titleCount++;
      } else {
        emptyCount++;
      }
      return;
    }

    validCount++;
    const key = subCat === undefined || subCat === '' ? '(无子分类)' : String(subCat);
    if (!subCat1Values[key]) subCat1Values[key] = 0;
    subCat1Values[key]++;
  });

  console.log('\n=== ' + sheetName + ' ===');
  console.log('有效数据: ' + validCount);
  console.log('标题行: ' + titleCount);
  console.log('真正空数据: ' + emptyCount);
  console.log('\n子分类统计:');
  Object.entries(subCat1Values).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log('  ' + k + ': ' + v);
  });
});
