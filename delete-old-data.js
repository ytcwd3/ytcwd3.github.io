const SUPABASE_URL = 'https://mjrqvffiinflzdwnzvte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA';

const OLD_CATEGORIES = ['PC及安卓', '任天堂', '其他平台'];

// 获取旧分类的记录ID
async function getOldCategoryIds() {
  console.log('查找旧分类的记录...');

  const ids = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/games?select=id,category&limit=' + limit + '&offset=' + offset,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        }
      }
    );

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    data.forEach(game => {
      if (Array.isArray(game.category) && OLD_CATEGORIES.includes(game.category[0])) {
        ids.push(game.id);
      }
    });

    offset += limit;
    if (data.length < limit) break;
  }

  return ids;
}

// 逐条删除
async function deleteByIds(ids) {
  console.log('开始删除 ' + ids.length + ' 条旧记录...');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < ids.length; i++) {
    try {
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/games?id=eq.' + ids[i],
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Prefer': 'return=minimal'
          }
        }
      );

      if (response.ok) {
        success++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }

    if ((i + 1) % 100 === 0) {
      console.log('已删除 ' + (i + 1) + '/' + ids.length);
    }
  }

  return { success, failed };
}

async function main() {
  const ids = await getOldCategoryIds();
  console.log('找到 ' + ids.length + ' 条旧记录');

  if (ids.length > 0) {
    const result = await deleteByIds(ids);
    console.log('\n删除完成!');
    console.log('成功: ' + result.success);
    console.log('失败: ' + result.failed);
  }
}

main().catch(err => {
  console.error('错误:', err);
});
