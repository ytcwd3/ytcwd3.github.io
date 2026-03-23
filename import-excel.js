const XLSX = require('xlsx');
const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

async function deleteAll() {
  console.log('1. 清空 games 表...');
  // 分批删除
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/games?select=id&limit=${limit}&offset=${offset}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    // 删除这批
    const ids = data.map(d => d.id).join(',');
    await fetch(
      `${SUPABASE_URL}/rest/v1/games?id=in.(${ids})`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    offset += limit;
    console.log(`   已删除 ${offset} 条...`);

    if (data.length < limit) break;
  }
  console.log('   清空完成！\n');
}

async function insertBatch(records) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/games`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(records)
    }
  );
  return response.ok;
}

async function main() {
  // ========== 读取 Excel ==========
  console.log('2. 读取 Excel 文件...');
  const workbook = XLSX.readFile('./自己分.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);
  console.log(`   Excel 总行数: ${rawData.length}\n`);

  // 转换数据格式
  const records = rawData.map((row, index) => {
    const name = row['游戏名'] || '';
    const platform1 = row['平台1'] || '';
    const platform2 = row['平台2'] || '';
    const subcat1 = row['子分类1'] || '';
    const subcat2 = row['子分类2'] || '';

    // 主分类：优先用平台1
    const category = platform1 || platform2 || '';
    // 子分类：优先用子分类1
    const subcategory = subcat1 || subcat2 || '';

    return {
      name,
      category: category ? [category] : null,
      subcategory: subcategory ? [subcategory] : null,
      code: row['提取码'] || '',
      quarkpan: row['夸克'] || '',
      baidupan: row['百度'] || '',
      thunderpan: row['迅雷'] || '',
      unzipcode: row['解压码'] || '',
      updatedate: row['日期'] || ''
    };
  }).filter(r => r.name); // 过滤掉没有名字的记录

  console.log(`   有效记录数: ${records.length}\n`);

  // ========== 清空旧数据 ==========
  await deleteAll();

  // ========== 批量插入新数据 ==========
  console.log('3. 导入新数据...');
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const success = await insertBatch(batch);
    if (success) {
      inserted += batch.length;
      console.log(`   已导入 ${inserted}/${records.length} 条...`);
    } else {
      console.log(`   导入失败，位置: ${i}`);
    }
  }

  console.log(`\n=== 导入完成 ===`);
  console.log(`成功导入: ${inserted} 条`);
}

main().catch(console.error);
