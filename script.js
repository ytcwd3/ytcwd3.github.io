document.addEventListener('DOMContentLoaded', function() {
  // ====================== 全局变量 ======================
  let gameDatabase = [];
  let originalGameDatabase = [];
  let updateRecords = [];

  // 核心元素
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const tagItems = document.querySelectorAll('.tag-item');
  const gameSearch = document.getElementById('gameSearch');
  const searchBtn = document.getElementById('searchBtn');
  const resultBox = document.getElementById('resultBox');
  const loading = document.getElementById('loading');
  const resultContent = document.getElementById('resultContent');
  const closeBtn = document.getElementById('closeBtn');
  const selectedTagWrapper = document.getElementById('selectedTagWrapper');

  // 二维码弹窗
  const qrcodeModal = document.getElementById('qrcodeModal');
  const qrcodeModalClose = document.getElementById('qrcodeModalClose');
  const qrcodeModalMask = document.querySelector('.qrcode-modal-mask');
  const qrcodeBigContainer = document.getElementById('qrcodeBigContainer');
  const qrcodeModalTitle = document.getElementById('qrcodeModalTitle');

  let selectedTag = null;

  // ====================== 工具函数 ======================
  function alertBox(msg) {
    alert(msg);
  }

  // ====================== 加载JSON（补充兼容逻辑） ======================
  async function loadGameData() {
    try {
      const res = await fetch('gameData.json');
      if (!res.ok) throw new Error('加载失败');
      gameDatabase = await res.json();

      // 自动补全日期 + 兼容单分类数据转为数组
      const today = new Date();
      const todayStr = `${today.getFullYear()}.${(today.getMonth()+1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;
      
      gameDatabase = gameDatabase.map(game => {
        // 补全日期
        if (!game.updateDate || game.updateDate.trim() === '') game.updateDate = todayStr;
        
        // 单分类转数组（兼容旧数据）
        if (!Array.isArray(game.category)) game.category = [game.category];
        if (!Array.isArray(game.subCategory)) game.subCategory = [game.subCategory];
        
        return game;
      });

      originalGameDatabase = JSON.parse(JSON.stringify(gameDatabase));
      console.log('✅ 加载成功', gameDatabase.length);
    } catch (e) {
      console.error('❌ 加载失败', e);
      // 测试数据也改为数组格式
      gameDatabase = [{ 
        name: "备用测试游戏", 
        category: ["PC及安卓"],  // 数组格式
        subCategory: ["网游单机"], // 数组格式
        link: "#", 
        code: "test123", 
        unzipCode: "test456",
        quarkPan: "https://pan.quark.cn/s/123456", 
        baiduPan: "https://pan.baidu.com/s/123456", 
        thunderPan: "https://pan.xunlei.com/s/123456", 
        updateDate: "2026.03.07" 
      }];
      originalGameDatabase = JSON.parse(JSON.stringify(gameDatabase));
    }

    try {
      updateRecords = JSON.parse(localStorage.getItem('gameUpdateRecords')) || [];
    } catch (e) {
      updateRecords = [];
    }
  }

  // ====================== 检测变化并生成更新记录（修复版） ======================
  function checkGameChanges() {
    if (!gameDatabase) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}.${(today.getMonth()+1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;

    gameDatabase.forEach((game, i) => {
      const orig = originalGameDatabase[i];
      if (!orig) return;

      let changed = false;

      if (game.name !== orig.name) {
        addUpdateRecord(game.name, Array.isArray(game.category) ? game.category[0] : game.category, "修改名称");
        orig.name = game.name;
        changed = true;
      }
      if (game.quarkPan !== orig.quarkPan) {
        addUpdateRecord(game.name, Array.isArray(game.category) ? game.category[0] : game.category, game.quarkPan ? "更新夸克" : "新增夸克");
        orig.quarkPan = game.quarkPan;
        changed = true;
      }
      if (game.baiduPan !== orig.baiduPan) {
        addUpdateRecord(game.name, Array.isArray(game.category) ? game.category[0] : game.category, game.baiduPan ? "更新百度" : "新增百度");
        orig.baiduPan = game.baiduPan;
        changed = true;
      }
      if (game.thunderPan !== orig.thunderPan) {
        addUpdateRecord(game.name, Array.isArray(game.category) ? game.category[0] : game.category, game.thunderPan ? "更新迅雷" : "新增迅雷");
        orig.thunderPan = game.thunderPan;
        changed = true;
      }

      if (changed) {
        game.updateDate = todayStr;
        orig.updateDate = todayStr;
      }
    });
  }

  // ====================== 添加更新记录（去重） ======================
  function addUpdateRecord(name, cat, type) {
    const now = new Date();
    const exist = updateRecords.some(r =>
      r.gameName === name &&
      r.updateType === type &&
      Math.abs(new Date(r.updateTime) - now) < 60000
    );
    if (exist) return;

    updateRecords.push({
      gameName: name,
      category: cat,
      updateType: type,
      updateTime: now.toISOString()
    });

    if (updateRecords.length > 50) updateRecords = updateRecords.slice(-50);
    localStorage.setItem('gameUpdateRecords', JSON.stringify(updateRecords));
  }

  // ====================== 生成更新记录列表（适配数组） ======================
  function generateUpdateRecords() {
    const container = document.getElementById('updateRecordsContainer');
    if (!container) return;

    let auto = [];
    try {
      auto = JSON.parse(localStorage.getItem('gameUpdateRecords')) || [];
      auto = auto.map(r => {
        const d = new Date(r.updateTime);
        return { ...r, fmt: `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` };
      }).sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));
    } catch (e) { auto = []; }

    // 按日期分组
    const groups = {};
    gameDatabase.forEach(g => {
      if (!groups[g.updateDate]) groups[g.updateDate] = [];
      groups[g.updateDate].push(g);
    });
    const dates = Object.keys(groups).sort((a, b) => new Date(b.replace(/\./g, '-')) - new Date(a.replace(/\./g, '-')));

    let html = '';

    // 自动记录
    if (auto.length) {
      html += `<div class="update-record-date">🔔 最近修改/新增</div>`;
      auto.forEach(r => {
        const c = r.category === '任天堂' ? 'var(--color-nintendo)' :
                  r.category === '索尼' ? 'var(--color-sony)' :
                  r.category === 'PC及安卓' ? 'var(--color-pc-android)' : 'var(--color-other)';
        html += `<div class="update-record-item" style="border-left:3px solid ${c}"><div>${r.gameName}<br><small>${r.updateType} | ${r.fmt}</small></div><span>${r.category}</span></div>`;
      });
      html += `<div style="margin:15px 0;border-bottom:1px dashed #eee;"></div>`;
    }

    // 日期分组
    if (dates.length) {
      dates.forEach(d => {
        html += `<div class="update-record-date">📅 ${d}</div>`;
        groups[d].forEach(g => {
          // 取第一个分类作为显示颜色
          const mainCategory = Array.isArray(g.category) ? g.category[0] : g.category;
          const c = mainCategory === '任天堂' ? 'var(--color-nintendo)' :
                    mainCategory === '索尼' ? 'var(--color-sony)' :
                    mainCategory === 'PC及安卓' ? 'var(--color-pc-android)' : 'var(--color-other)';
          
          // 显示第一个分类或所有分类
          const mainSubCategory = Array.isArray(g.subCategory) ? g.subCategory[0] : g.subCategory;
          html += `<div class="update-record-item" style="border-left:3px solid ${c}">
                    <span>${g.name}</span>
                    <span>${mainCategory} - ${mainSubCategory}</span>
                  </div>`;
        });
      });
    } else {
      html += `<div class="update-record-empty">暂无更新记录</div>`;
    }

    container.innerHTML = html;
  }

  // ====================== 二维码弹窗 ======================
  function openQrcodeModal(src, title) {
    if (!qrcodeModal) return;
    qrcodeModalTitle.textContent = title;
    qrcodeBigContainer.innerHTML = `<img src="${src}" style="width:250px;height:250px;object-fit:contain;border-radius:8px;">`;
    qrcodeModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeQrcodeModal() {
    qrcodeModal.style.display = 'none';
    qrcodeBigContainer.innerHTML = '';
    document.body.style.overflow = 'auto';
  }
  window.openBigQrcode = function(img, title) {
    openQrcodeModal(img.src, title);
  };

  // ====================== 批量初始化二维码（彻底修复版） ======================
  function initAllQrcodes(gameList) {
    gameList.forEach((g, i) => {
      // 唯一ID
      const qkId = `qrcode-quark-${i}`;
      const bdId = `qrcode-baidu-${i}`;
      const xlId = `qrcode-xunlei-${i}`;
      
      // 分别初始化，确保上下文独立
      initSingleQrcode(qkId, g.quarkPan, `${g.name} 夸克网盘`);
      initSingleQrcode(bdId, g.baiduPan, `${g.name} 百度网盘`);
      initSingleQrcode(xlId, g.thunderPan, `${g.name} 迅雷网盘`);
    });
  }

  // ====================== 初始化单个二维码（独立上下文） ======================
  function initSingleQrcode(id, link, title) {
    const el = document.getElementById(id);
    if (!el) return;

    // 1. 彻底清空容器
    el.innerHTML = '';
    
    // 2. 过滤空链接/无效链接
    if (!link || link === '#' || link.trim() === '') {
      el.innerHTML = '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">无链接</div>';
      return;
    }

    // 3. 清理链接格式
    const cleanLink = link.trim().replace(/\s+/g, '');
    if (cleanLink === '') {
      el.innerHTML = '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">无效链接</div>';
      return;
    }

    // 4. 生成二维码（独立实例）
    try {
      new QRCode(el, {
        text: cleanLink,
        width: 68,
        height: 68,
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (e) {
      el.innerHTML = '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">生成失败</div>';
      console.error('二维码生成失败:', e);
    }

    // 5. 绑定点击事件（避免重复绑定）
    el.onclick = function() {
      const canvas = this.querySelector('canvas');
      if (canvas) {
        openQrcodeModal(canvas.toDataURL('image/png'), title);
      }
    };
  }

  // ====================== 标签栏 ======================
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const cat = this.dataset.category;
      const panel = document.getElementById(`panel-${cat}`);
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      tabPanels.forEach(p => p.classList.remove('show'));
      if (panel) panel.classList.add('show');
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.tab-header') && !e.target.closest('.tab-panel') && !e.target.closest('.tag-item')) {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('show'));
    }
  });

  // ====================== 子标签（核心修改：选中自动搜索） ======================
  function renderSelected() {
    if (!selectedTagWrapper) return;
    if (!selectedTag) {
      selectedTagWrapper.innerHTML = '<span>无</span>';
      return;
    }
    let color = '';
    switch(selectedTag.category) {
      case '任天堂': color = 'var(--nintendo-rgb)'; break;
      case '索尼': color = 'var(--sony-rgb)'; break;
      case 'PC及安卓': color = 'var(--pc-android-rgb)'; break;
      case '其他平台': color = 'var(--other-rgb)'; break;
    }
    selectedTagWrapper.innerHTML = `<div class="selected-tag-chip" style="--category-color-rgb:${color}"><span>${selectedTag.category} - ${selectedTag.value}</span><span class="tag-close">×</span></div>`;
    document.querySelector('.tag-close')?.addEventListener('click', () => {
      clearSelected();
    });
  }
  
  function clearSelected() {
    tagItems.forEach(t => t.classList.remove('active'));
    selectedTag = null;
    renderSelected();
    // 新增：清空选中标签时隐藏结果框
    resultBox.style.display = 'none';
    resultContent.innerHTML = '';
  }
  
  // 核心修改：子标签点击事件 - 选中后自动触发搜索
  tagItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      tagItems.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      selectedTag = { category: this.dataset.category, value: this.dataset.value };
      renderSelected();
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('show'));
      
      // 关键新增：选中标签后自动执行搜索
      search();
    });
  });

  // ====================== 搜索（支持多分类） ======================
  function search() {
    // 修改：移除"必须选择分类或输入关键词"的提示（因为选中标签就会触发）
    if (!selectedTag && !gameSearch.value.trim()) {
      resultBox.style.display = 'none'; // 无条件时隐藏结果框
      return;
    }
    
    resultBox.style.display = 'block';
    loading.style.display = 'flex';
    resultContent.innerHTML = '';

    setTimeout(() => {
      loading.style.display = 'none';
      let list = gameDatabase;
      
      // ===== 核心修改：支持多分类筛选 =====
      if (selectedTag) {
        list = list.filter(g => {
          // 确保分类字段是数组（兼容旧数据）
          const gameCategories = Array.isArray(g.category) ? g.category : [g.category];
          const gameSubCategories = Array.isArray(g.subCategory) ? g.subCategory : [g.subCategory];
          
          // 判断是否包含选中的母分类和子分类
          return gameCategories.includes(selectedTag.category) && 
                 gameSubCategories.includes(selectedTag.value);
        });
      }
      
      const kw = gameSearch.value.trim().toLowerCase();
      if (kw) list = list.filter(g => g.name.toLowerCase().includes(kw));

      if (!list.length) {
        resultContent.innerHTML = `<div class="empty-state">未找到相关资源</div>`;
        return;
      }

      let html = '';
      list.forEach((g, i) => {
        const color = ['#d857e8','#f06292','#9333ea'][i%3];
        // 为每个二维码生成唯一ID，避免冲突
        const qkId = `qrcode-quark-${i}`;
        const bdId = `qrcode-baidu-${i}`;
        const xlId = `qrcode-xunlei-${i}`;
        
        // ===== 适配多分类显示 =====
        // 优先显示第一个分类，或拼接所有分类
        const displayCategory = Array.isArray(g.category) ? g.category[0] : g.category;
        const displaySubCategory = Array.isArray(g.subCategory) ? g.subCategory[0] : g.subCategory;
        // 显示所有分类（可选）：const allCategories = `${g.category.join('/')} - ${g.subCategory.join('/')}`;
        
        html += `
          <div class="result-item" data-category="${displayCategory}">
            <div class="qrcode-area">
              <div class="qrcode-box" id="${qkId}" data-link="${g.quarkPan || ''}" data-title="${g.name} 夸克网盘"></div>
              <div class="qrcode-box" id="${bdId}" data-link="${g.baiduPan || ''}" data-title="${g.name} 百度网盘"></div>
              <div class="qrcode-box" id="${xlId}" data-link="${g.thunderPan || ''}" data-title="${g.name} 迅雷网盘"></div>
            </div>
            <div class="result-content-wrap">
              <span style="color:${color}">${i+1}. ${g.name}</span>
              <span>（${displayCategory} - ${displaySubCategory}）</span><br>
              <!-- 可选：显示所有分类 -->
              <!-- <small style="color:#999">全部分类：${g.category.join('/')} - ${g.subCategory.join('/')}</small><br> -->
              <div class="code-row">
                <div class="code-item"><label>提取码：</label><span>${g.code||'无'}</span></div>
                ${g.unzipCode && g.unzipCode!='无'?`<div class="code-item"><label>解压密码：</label><span>${g.unzipCode}</span></div>`:''}
              </div>
              <div class="pan-links">
                <div class="pan-link-item"><label>夸克：</label><a href="${g.quarkPan}" target="_blank">${g.quarkPan||'无'}</a></div>
                <div class="pan-link-item"><label>百度：</label><a href="${g.baiduPan}" target="_blank">${g.baiduPan||'无'}</a></div>
                ${g.thunderPan?`<div class="pan-link-item"><label>迅雷：</label><a href="${g.thunderPan}" target="_blank">${g.thunderPan}</a></div>`:''}
              </div>
            </div>
          </div>
        `;
      });
      resultContent.innerHTML = html;

      // 单独初始化二维码，避免循环上下文问题
      initAllQrcodes(list);
    }, 600);
  }

  // ====================== 弹窗 ======================
  const popBtns = document.querySelectorAll('.popup-btn');
  const popMasks = document.querySelectorAll('.popup-mask');
  const popClose = document.querySelectorAll('.popup-mask .close-btn');

  popBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.target;
      const mask = document.getElementById(id);
      if (mask) {
        mask.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (id === 'popup5') generateUpdateRecords();
      }
    });
  });

  popClose.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.popup-mask').style.display = 'none';
      document.body.style.overflow = 'auto';
    });
  });

  popMasks.forEach(mask => {
    mask.addEventListener('click', e => e.target === mask && (mask.style.display = 'none', document.body.style.overflow = 'auto'));
  });

  // ====================== 全局事件 ======================
  function bindEvents() {
    searchBtn.addEventListener('click', search);
    gameSearch.addEventListener('keydown', e => e.key === 'Enter' && search());
    closeBtn.addEventListener('click', () => {
      resultBox.style.opacity = 0;
      resultBox.style.transform = 'translateY(10px)';
      setTimeout(() => {
        resultBox.style.display = 'none';
        resultBox.style.opacity = 1;
        resultBox.style.transform = 'translateY(0)';
        gameSearch.value = '';
      }, 300);
    });
    selectedTagWrapper.parentElement.addEventListener('click', clearSelected);
    gameSearch.addEventListener('focus', () => { gameSearch.style.transform = 'translateY(-2px)'; gameSearch.style.boxShadow = 'var(--shadow-md)'; });
    gameSearch.addEventListener('blur', () => { gameSearch.style.transform = 'translateY(0)'; gameSearch.style.boxShadow = 'var(--shadow-sm)'; });
    document.addEventListener('keydown', e => e.key === 'Escape' && (popMasks.forEach(m => m.style.display = 'none'), closeQrcodeModal(), document.body.style.overflow = 'auto'));
    qrcodeModalClose?.addEventListener('click', closeQrcodeModal);
    qrcodeModalMask?.addEventListener('click', closeQrcodeModal);
  }

  // ====================== 初始化 ======================
  loadGameData().then(() => {
    bindEvents();
    checkGameChanges();
    generateUpdateRecords();
    setTimeout(() => document.body.classList.add('loaded'), 200);
  });
});