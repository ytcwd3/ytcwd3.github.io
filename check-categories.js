const XLSX = require('xlsx');
const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

async function querySupabaseAll() {
  let allData = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/games?select=id,category,subcategory&order=id.asc&limit=${limit}&offset=${offset}`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allData = allData.concat(data);
    offset += limit;
    if (data.length < limit) break;
  }
  return allData;
}

async function main() {
  // Excel
  const workbook = XLSX.readFile('./自己分.xlsx');
  const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  const excelStats = {};
  excelData.forEach(row => {
    const mainCat = row['平台1'] || row['平台2'] || '(无)';
    const subCat = row['子分类1'] || row['子分类2'] || '(无)';
    if (!excelStats[mainCat]) excelStats[mainCat] = {};
    excelStats[mainCat][subCat] = (excelStats[mainCat][subCat] || 0) + 1;
  });

  // Supabase
  const supabaseData = await querySupabaseAll();
  const supabaseStats = {};
  supabaseData.forEach(row => {
    const cats = Array.isArray(row.category) ? row.category : [];
    const subcats = Array.isArray(row.subcategory) ? row.subcategory : [];
    const mainCat = cats[0] || '(无)';
    const subCat = subcats[0] || '(无)';
    if (!supabaseStats[mainCat]) supabaseStats[mainCat] = {};
    supabaseStats[mainCat][subCat] = (supabaseStats[mainCat][subCat] || 0) + 1;
  });

  console.log('=== Excel 实际分类 ===');
  let excelTotal = 0;
  Object.entries(excelStats).sort((a,b) => Object.values(b[1]).reduce((s,n)=>s+n,0) - Object.values(a[1]).reduce((s,n)=>s+n,0)).forEach(([mainCat, subcats]) => {
    let catTotal = 0;
    Object.entries(subcats).forEach(([subCat, count]) => {
      catTotal += count;
    });
    excelTotal += catTotal;
    console.log(`${mainCat}: ${catTotal}`);
    Object.entries(subcats).sort((a,b) => b[1] - a[1]).forEach(([subCat, count]) => {
      console.log(`  ${subCat}: ${count}`);
    });
  });
  console.log(`总计: ${excelTotal}`);

  console.log('\n=== Supabase 实际分类 ===');
  let supaTotal = 0;
  Object.entries(supabaseStats).sort((a,b) => Object.values(b[1]).reduce((s,n)=>s+n,0) - Object.values(a[1]).reduce((s,n)=>s+n,0)).forEach(([mainCat, subcats]) => {
    let catTotal = 0;
    Object.entries(subcats).forEach(([subCat, count]) => {
      catTotal += count;
    });
    supaTotal += catTotal;
    console.log(`${mainCat}: ${catTotal}`);
    Object.entries(subcats).sort((a,b) => b[1] - a[1]).forEach(([subCat, count]) => {
      console.log(`  ${subCat}: ${count}`);
    });
  });
  console.log(`总计: ${supaTotal}`);
}

main().catch(console.error);
