// 模拟前端的筛选逻辑
const games = [
  {id: 1, name: "常见问题解答", category: ["PC"], subcategory: ["必备软件"]},
  {id: 2, name: "游戏运行库", category: ["PC"], subcategory: ["必备软件"]},
  {id: 3, name: "RPG游戏", category: ["PC"], subcategory: ["RPG"]},
  {id: 4, name: "射击游戏", category: ["PC"], subcategory: ["射击"]},
  {id: 5, name: "NS游戏", category: ["NS"], subcategory: ["NS"]},
];

const selectedTag = { category: "PC及安卓", value: "必备软件" };

// 测试筛选逻辑
function testFilter() {
  let result = [...games];

  console.log('测试筛选逻辑:');
  console.log('选中的标签:', JSON.stringify(selectedTag));
  console.log('原始数据:', games.length, '条');

  if (selectedTag) {
    result = result.filter((g) => {
      const subcats = g.subcategory || [];
      console.log('游戏:', g.name, '| subcategory:', JSON.stringify(subcats), '| 是否匹配:', subcats.includes(selectedTag.value));
      return subcats.includes(selectedTag.value);
    });
  }

  console.log('\n筛选结果:', result.length, '条');
  result.forEach(g => {
    console.log('- ' + g.name);
  });
}

testFilter();
