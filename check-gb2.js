const XLSX = require('xlsx');
const workbook = XLSX.readFile('./自己分.xlsx');
const sheet = workbook.Sheets['任天堂掌机'];
const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1});

console.log('=== 检查可能是GB的游戏 ===');
let gbCount = 0;
let gbcCount = 0;
jsonData.forEach((row, idx) => {
  if (idx === 0) return;
  const gameName = String(row[0] || '');
  if (gameName === '') return;

  const gName = gameName.toLowerCase();
  // 检查是否同时包含多个后缀
  const hasNDS = gName.includes('.nds');
  const hasGBA = gName.includes('.gba');
  const hasGBC = gName.includes('.gbc') || gName.includes('.gbc ');
  const hasGB = (gName.includes('.gb') && !hasGBA && !hasGBC) || gName.endsWith('.gb');

  if (hasGB || gName.includes('gb[') || gName.includes('gb(') || gName.includes('gb ')) {
    gbCount++;
    if (gbCount <= 10) {
      console.log('行' + (idx+1) + ': ' + gameName.substring(0, 60));
    }
  }
});
console.log('GB相关总条数:', gbCount);
