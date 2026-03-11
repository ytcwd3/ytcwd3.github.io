// ====================== 优化版数据加载（按需加载） ======================

// 数据缓存
const dataCache = {
  index: null,  // 索引数据
  nintendo: null,
  sony: null,
  pc_android: null,
  other: null,
  misc: null
};

// 分类映射
const categoryMapping = {
  '任天堂': 'nintendo',
  '索尼': 'sony',
  'PC及安卓': 'pc_android',
  '其他平台': 'other',
  '其他': 'misc'
};

// 加载索引数据（首次加载，体积小）
async function loadIndexData() {
  if (dataCache.index) return dataCache.index;

  try {
    const res = await fetch('data/gameData_index.json');
    if (!res.ok) throw new Error('加载索引失败');
    dataCache.index = await res.json();
    console.log('✅ 索引加载成功', dataCache.index.length);
    return dataCache.index;
  } catch (e) {
    console.error('❌ 索引加载失败', e);
    return [];
  }
}

// 按需加载分类数据
async function loadCategoryData(category) {
  const key = categoryMapping[category] || 'misc';

  // 如果已缓存，直接返回
  if (dataCache[key]) {
    console.log(`✅ 使用缓存: ${category}`);
    return dataCache[key];
  }

  try {
    const res = await fetch(`data/gameData_${key}.json`);
    if (!res.ok) throw new Error(`加载${category}数据失败`);
    dataCache[key] = await res.json();
    console.log(`✅ ${category}数据加载成功`, dataCache[key].length);
    return dataCache[key];
  } catch (e) {
    console.error(`❌ ${category}数据加载失败`, e);
    return [];
  }
}

// 搜索函数（优化版）
async function searchOptimized(keyword, selectedCategory) {
  let results = [];

  if (selectedCategory) {
    // 如果选择了分类，只加载该分类数据
    const categoryData = await loadCategoryData(selectedCategory);
    results = categoryData.filter(game =>
      game.name.toLowerCase().includes(keyword.toLowerCase())
    );
  } else {
    // 如果没选分类，先在索引中搜索，再加载对应分类数据
    const indexData = await loadIndexData();
    const matchedGames = indexData.filter(game =>
      game.name.toLowerCase().includes(keyword.toLowerCase())
    );

    // 按分类分组
    const categoriesNeeded = new Set();
    matchedGames.forEach(game => {
      const cats = Array.isArray(game.category) ? game.category : [game.category];
      cats.forEach(cat => categoriesNeeded.add(cat));
    });

    // 加载所需分类的完整数据
    const loadPromises = Array.from(categoriesNeeded).map(cat => loadCategoryData(cat));
    const loadedData = await Promise.all(loadPromises);

    // 合并结果
    const allData = loadedData.flat();
    results = allData.filter(game =>
      game.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  return results;
}

// 使用示例：
// 1. 页面加载时只加载索引
// await loadIndexData();

// 2. 用户点击分类时加载对应数据
// const nintendoGames = await loadCategoryData('任天堂');

// 3. 搜索时按需加载
// const results = await searchOptimized('塞尔达', '任天堂');
