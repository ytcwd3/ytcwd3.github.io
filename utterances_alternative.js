// ====================== Utterances留言板（更简单的替代方案） ======================
function initUtterances() {
  // 检查是否已经加载过
  if (document.querySelector('#giscus-container script')) {
    return;
  }

  const container = document.getElementById('giscus-container');
  if (!container) return;

  // 创建Utterances脚本
  const script = document.createElement('script');
  script.src = 'https://utteranc.es/client.js';
  script.setAttribute('repo', 'ytcwd3/ytcwd3.github.io');
  script.setAttribute('issue-term', 'pathname');
  script.setAttribute('theme', 'github-light');
  script.setAttribute('crossorigin', 'anonymous');
  script.async = true;

  container.appendChild(script);
}

// 使用方法：
// 1. 安装Utterances App: https://github.com/apps/utterances
// 2. 在弹窗打开事件中调用 initUtterances() 而不是 initGiscus()
// 3. 无需配置repo-id等参数，只需要仓库名即可
