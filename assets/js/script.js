// 全局错误捕获，防止页面完全空白
window.addEventListener('error', function(e) {
  console.error('脚本执行错误:', e.message, '行号:', e.lineno);
});

document.addEventListener("DOMContentLoaded", function () {
  // ====================== 全局变量 ======================
  let gameDatabase = [];
  let originalGameDatabase = [];
  let updateRecords = [];
  let filteredGameList = [];
  let currentPage = 1;
  const PAGE_SIZE = 15;

  // ====================== 安全获取DOM元素 ======================
  function getElementSafe(id) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`元素 ${id} 不存在`);
      const emptyEl = document.createElement('div');
      emptyEl.id = id;
      return emptyEl;
    }
    return el;
  }

  // 核心元素（安全获取）
  const tabBtns = document.querySelectorAll(".tab-btn") || [];
  const tabPanels = document.querySelectorAll(".tab-panel") || [];
  const tagItems = document.querySelectorAll(".tag-item") || [];
  const gameSearch = getElementSafe("gameSearch");
  const searchBtn = getElementSafe("searchBtn");
  const resultBox = getElementSafe("resultBox");
  const loading = getElementSafe("loading");
  const resultContent = getElementSafe("resultContent");
  const closeBtn = getElementSafe("closeBtn");
  const selectedTagWrapper = getElementSafe("selectedTagWrapper");

  // 二维码弹窗元素
  const qrcodeModal = getElementSafe("qrcodeModal");
  const qrcodeModalClose = getElementSafe("qrcodeModalClose");
  const qrcodeModalMask = document.querySelector(".qrcode-modal-mask") || document.createElement('div');
  const qrcodeBigContainer = getElementSafe("qrcodeBigContainer");
  const qrcodeModalTitle = getElementSafe("qrcodeModalTitle");

  // 弹窗相关元素
  const popBtns = document.querySelectorAll(".popup-btn") || [];
  const popMasks = document.querySelectorAll(".popup-mask") || [];
  const popClose = document.querySelectorAll(".popup-mask .close-btn") || [];

  let selectedTag = null;
  let loadMoreBtn = null;

  // ====================== 创建加载更多按钮 ======================
  function createLoadMoreBtn() {
    loadMoreBtn = document.createElement("div");
    loadMoreBtn.id = "loadMoreBtn";
    loadMoreBtn.style.cssText = `
      margin: 20px auto;
      padding: 10px 20px;
      width: 120px;
      background: #f5f5f5;
      border: 1px solid #eee;
      border-radius: 4px;
      cursor: pointer;
      text-align: center;
      color: #666;
      display: none;
      transition: all 0.2s;
    `;
    loadMoreBtn.textContent = "加载更多";
    resultBox.appendChild(loadMoreBtn);
  }

  // ====================== 工具函数 ======================
  function alertBox(msg) {
    alert(msg);
  }

  // ====================== 加载JSON数据 ======================
  async function loadGameData() {
    try {
      const res = await fetch("data/gameData.json");
      if (!res.ok) throw new Error("加载失败");
      gameDatabase = await res.json();

      // 数据格式化
      const today = new Date();
      const todayStr = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}`;

      gameDatabase = gameDatabase.map((game) => {
        if (!game.updateDate || game.updateDate.trim() === "")
          game.updateDate = todayStr;
        if (!Array.isArray(game.category)) game.category = [game.category];
        if (!Array.isArray(game.subCategory))
          game.subCategory = [game.subCategory];
        return game;
      });

      originalGameDatabase = JSON.parse(JSON.stringify(gameDatabase));
      console.log("✅ 加载成功", gameDatabase.length);
    } catch (e) {
      console.error("❌ 加载失败，使用测试数据", e);
      // 强制使用测试数据
      gameDatabase = [
        {
          name: "测试游戏1-NS",
          category: ["任天堂"],
          subCategory: ["NS"],
          link: "#",
          code: "test123",
          unzipCode: "test456",
          quarkPan: "https://pan.quark.cn/s/123456",
          baiduPan: "https://pan.baidu.com/s/123456",
          thunderPan: "https://pan.xunlei.com/s/123456",
          updateDate: "2026.03.07",
        },
        {
          name: "测试游戏2-PS4",
          category: ["索尼"],
          subCategory: ["PS4"],
          link: "#",
          code: "ps4test",
          unzipCode: "ps4123",
          quarkPan: "https://pan.quark.cn/s/654321",
          baiduPan: "https://pan.baidu.com/s/654321",
          thunderPan: "",
          updateDate: "2026.03.08",
        },
        {
          name: "测试游戏3-安卓RPG",
          category: ["PC及安卓"],
          subCategory: ["RPG"],
          link: "#",
          code: "andrpg",
          unzipCode: "无",
          quarkPan: "https://pan.quark.cn/s/789012",
          baiduPan: "",
          thunderPan: "https://pan.xunlei.com/s/789012",
          updateDate: "2026.03.09",
        },
      ];
      originalGameDatabase = JSON.parse(JSON.stringify(gameDatabase));
    }

    try {
      updateRecords = JSON.parse(localStorage.getItem("gameUpdateRecords")) || [];
    } catch (e) {
      updateRecords = [];
    }
  }

  // ====================== 检测数据变化 ======================
  function checkGameChanges() {
    if (!gameDatabase || !originalGameDatabase) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}`;

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

  // ====================== 添加更新记录 ======================
  function addUpdateRecord(name, cat, type) {
    const now = new Date();
    const exist = updateRecords.some(
      (r) => r.gameName === name && r.updateType === type && Math.abs(new Date(r.updateTime) - now) < 60000
    );
    if (exist) return;

    updateRecords.push({
      gameName: name,
      category: cat,
      updateType: type,
      updateTime: now.toISOString(),
    });

    if (updateRecords.length > 50) updateRecords = updateRecords.slice(-50);
    localStorage.setItem("gameUpdateRecords", JSON.stringify(updateRecords));
  }

  // ====================== 生成更新记录列表 ======================
  function generateUpdateRecords() {
    const container = document.getElementById("updateRecordsContainer");
    if (!container) return;

    let auto = [];
    try {
      auto = JSON.parse(localStorage.getItem("gameUpdateRecords")) || [];
      auto = auto
        .map((r) => {
          const d = new Date(r.updateTime);
          return {
            ...r,
            fmt: `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
          };
        })
        .sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));
    } catch (e) {
      auto = [];
    }

    // 按日期分组
    const groups = {};
    gameDatabase.forEach((g) => {
      if (!groups[g.updateDate]) groups[g.updateDate] = [];
      groups[g.updateDate].push(g);
    });
    const dates = Object.keys(groups).sort(
      (a, b) => new Date(b.replace(/\./g, "-")) - new Date(a.replace(/\./g, "-"))
    );

    let html = "";

    // 自动记录
    if (auto.length) {
      html += `<div class="update-record-date">🔔 最近修改/新增</div>`;
      auto.forEach((r) => {
        const c =
          r.category === "任天堂" ? "var(--color-nintendo)" :
          r.category === "索尼" ? "var(--color-sony)" :
          r.category === "PC及安卓" ? "var(--color-pc-android)" : "var(--color-other)";
        html += `<div class="update-record-item" style="border-left:3px solid ${c}"><div>${r.gameName}<br><small>${r.updateType} | ${r.fmt}</small></div><span>${r.category}</span></div>`;
      });
      html += `<div style="margin:15px 0;border-bottom:1px dashed #eee;"></div>`;
    }

    // 日期分组
    if (dates.length) {
      dates.forEach((d) => {
        html += `<div class="update-record-date">📅 ${d}</div>`;
        groups[d].forEach((g) => {
          const mainCategory = Array.isArray(g.category) ? g.category[0] : g.category;
          const c =
            mainCategory === "任天堂" ? "var(--color-nintendo)" :
            mainCategory === "索尼" ? "var(--color-sony)" :
            mainCategory === "PC及安卓" ? "var(--color-pc-android)" : "var(--color-other)";

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
    qrcodeModalTitle.textContent = title || "二维码";
    qrcodeBigContainer.innerHTML = `<img src="${src}" style="width:250px;height:250px;object-fit:contain;border-radius:8px;">`;
    qrcodeModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeQrcodeModal() {
    if (qrcodeModal) {
      qrcodeModal.style.display = "none";
      qrcodeBigContainer.innerHTML = "";
      document.body.style.overflow = "auto";
    }
  }

  window.openBigQrcode = function (img, title) {
    openQrcodeModal(img.src, title);
  };

  // ====================== 初始化二维码 ======================
  function initAllQrcodes(gameList, startIndex) {
    if (!gameList || gameList.length === 0) return;
    
    gameList.forEach((g, idx) => {
      const globalIdx = startIndex + idx;
      const qkId = `qrcode-quark-${globalIdx}`;
      const bdId = `qrcode-baidu-${globalIdx}`;
      const xlId = `qrcode-xunlei-${globalIdx}`;

      initSingleQrcode(qkId, g.quarkPan, `${g.name} 夸克网盘`);
      initSingleQrcode(bdId, g.baiduPan, `${g.name} 百度网盘`);
      initSingleQrcode(xlId, g.thunderPan, `${g.name} 迅雷网盘`);
    });
  }

  function initSingleQrcode(id, link, title) {
    const el = document.getElementById(id);
    if (!el) return;

    el.innerHTML = "";

    // 空链接处理
    if (!link || link === "#" || link.trim() === "") {
      el.innerHTML = '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">无链接</div>';
      return;
    }

    const cleanLink = link.trim().replace(/\s+/g, "");
    if (cleanLink === "") {
      el.innerHTML = '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">无效链接</div>';
      return;
    }

    // 生成二维码（兼容无QRCode库）
    try {
      if (typeof QRCode !== 'undefined') {
        new QRCode(el, {
          text: cleanLink,
          width: 68,
          height: 68,
          correctLevel: QRCode.CorrectLevel.H,
        });
      } else {
        el.innerHTML = `<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;padding:5px;word-break:break-all;">${cleanLink.substring(0, 10)}...</div>`;
      }
    } catch (e) {
      el.innerHTML = '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">生成失败</div>';
      console.error("二维码生成失败:", e);
    }

    // 绑定点击事件
    el.onclick = function () {
      const canvas = this.querySelector("canvas");
      if (canvas) {
        openQrcodeModal(canvas.toDataURL("image/png"), title);
      } else if (cleanLink) {
        window.open(cleanLink, '_blank');
      }
    };
  }

  // ====================== 分页渲染 ======================
  function renderCurrentPage() {
    if (!resultContent || !loadMoreBtn) return;
    
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = currentPage * PAGE_SIZE;
    const currentPageData = filteredGameList.slice(startIndex, endIndex);

    // 无数据处理
    if (currentPage === 1 && currentPageData.length === 0) {
      resultContent.innerHTML = `<div class="empty-state" style="padding:20px;text-align:center;color:#666;">未找到相关资源</div>`;
      loadMoreBtn.style.display = "none";
      return;
    }

    // 拼接HTML
    let pageHtml = "";
    currentPageData.forEach((game, idx) => {
      const globalIdx = startIndex + idx;
      const color = ["#d857e8", "#f06292", "#9333ea"][globalIdx % 3];
      const qkId = `qrcode-quark-${globalIdx}`;
      const bdId = `qrcode-baidu-${globalIdx}`;
      const xlId = `qrcode-xunlei-${globalIdx}`;

      const displayCategory = Array.isArray(game.category) ? game.category[0] : game.category;
      const displaySubCategory = Array.isArray(game.subCategory) ? game.subCategory[0] : game.subCategory;

      pageHtml += `
        <div class="result-item" data-category="${displayCategory}" style="margin:10px 0;padding:15px;border:1px solid #eee;border-radius:8px;">
          <div class="qrcode-area" style="display:flex;gap:10px;margin-bottom:10px;">
            <div class="qrcode-box" id="${qkId}" style="width:68px;height:68px;border:1px solid #eee;cursor:pointer;"></div>
            <div class="qrcode-box" id="${bdId}" style="width:68px;height:68px;border:1px solid #eee;cursor:pointer;"></div>
            <div class="qrcode-box" id="${xlId}" style="width:68px;height:68px;border:1px solid #eee;cursor:pointer;"></div>
          </div>
          <div class="result-content-wrap">
            <span style="color:${color};font-weight:bold;">${globalIdx + 1}. ${game.name}</span>
            <span style="color:#666;">（${displayCategory} - ${displaySubCategory}）</span><br>
            <div class="code-row" style="margin:8px 0;">
              <div class="code-item" style="margin:4px 0;"><label style="color:#999;">提取码：</label><span>${game.code || "无"}</span></div>
              ${game.unzipCode && game.unzipCode != "无" ? `<div class="code-item" style="margin:4px 0;"><label style="color:#999;">解压密码：</label><span>${game.unzipCode}</span></div>` : ""}
            </div>
            <div class="pan-links" style="margin-top:8px;">
              <div class="pan-link-item" style="margin:4px 0;"><label style="color:#999;">夸克：</label><a href="${game.quarkPan}" target="_blank" style="color:#0078d7;">${game.quarkPan || "无"}</a></div>
              <div class="pan-link-item" style="margin:4px 0;"><label style="color:#999;">百度：</label><a href="${game.baiduPan}" target="_blank" style="color:#0078d7;">${game.baiduPan || "无"}</a></div>
              ${game.thunderPan ? `<div class="pan-link-item" style="margin:4px 0;"><label style="color:#999;">迅雷：</label><a href="${game.thunderPan}" target="_blank" style="color:#0078d7;">${game.thunderPan}</a></div>` : ""}
            </div>
          </div>
        </div>
      `;
    });

    // 更新DOM
    if (currentPage === 1) {
      resultContent.innerHTML = pageHtml;
    } else {
      resultContent.innerHTML += pageHtml;
    }

    // 初始化二维码
    initAllQrcodes(currentPageData, startIndex);

    // 控制加载更多按钮
    loadMoreBtn.style.display = endIndex >= filteredGameList.length ? "none" : "block";
  }

  // ====================== 标签栏处理 ======================
  function initTabEvents() {
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const cat = this.dataset.category;
        const panel = document.getElementById(`panel-${cat}`);
        tabBtns.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        tabPanels.forEach((p) => p.classList.remove("show"));
        if (panel) panel.classList.add("show");
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".tab-header") && !e.target.closest(".tab-panel") && !e.target.closest(".tag-item")) {
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabPanels.forEach((p) => p.classList.remove("show"));
      }
    });
  }

  // ====================== 子标签处理 ======================
  function renderSelected() {
    if (!selectedTag) {
      selectedTagWrapper.innerHTML = "<span style='color:#666;'>无</span>";
      return;
    }
    let color = "";
    switch (selectedTag.category) {
      case "任天堂": color = "229, 57, 53"; break;
      case "索尼": color = "33, 150, 243"; break;
      case "PC及安卓": color = "251, 192, 45"; break;
      case "其他平台": color = "67, 160, 71"; break;
      default: color = "150, 150, 150";
    }
    selectedTagWrapper.innerHTML = `<div class="selected-tag-chip" style="background:rgba(${color},0.1);padding:4px 8px;border-radius:4px;display:inline-flex;align-items:center;gap:8px;">
      <span style="color:rgb(${color});">${selectedTag.category} - ${selectedTag.value}</span>
      <span class="tag-close" style="cursor:pointer;color:rgb(${color});">×</span>
    </div>`;
    
    const tagClose = document.querySelector(".tag-close");
    if (tagClose) {
      tagClose.addEventListener("click", clearSelected);
    }
  }

  function clearSelected() {
    tagItems.forEach((t) => t.classList.remove("active"));
    selectedTag = null;
    renderSelected();
    resultBox.style.display = "none";
    resultContent.innerHTML = "";
    filteredGameList = [];
    currentPage = 1;
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
  }

  function initTagItemEvents() {
    tagItems.forEach((item) => {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        tagItems.forEach((t) => t.classList.remove("active"));
        this.classList.add("active");
        selectedTag = {
          category: this.dataset.category,
          value: this.dataset.value,
        };
        renderSelected();
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabPanels.forEach((p) => p.classList.remove("show"));

        filteredGameList = [];
        currentPage = 1;
        search();
      });
    });
  }

  // ====================== 搜索功能 ======================
  function search() {
    // 显示加载状态
    resultBox.style.display = "block";
    loading.style.display = "flex";
    loading.style.justifyContent = "center";
    loading.style.alignItems = "center";
    loading.style.height = "100px";
    loading.innerHTML = "<div>加载中...</div>";
    resultContent.innerHTML = "";
    if (loadMoreBtn) loadMoreBtn.style.display = "none";

    setTimeout(() => {
      loading.style.display = "none";

      // 筛选数据
      let allFilteredData = [...gameDatabase];
      if (selectedTag) {
        allFilteredData = allFilteredData.filter((g) => {
          const gameCategories = Array.isArray(g.category) ? g.category : [g.category];
          const gameSubCategories = Array.isArray(g.subCategory) ? g.subCategory : [g.subCategory];
          return gameCategories.includes(selectedTag.category) && gameSubCategories.includes(selectedTag.value);
        });
      }
      
      // 安全获取搜索关键词
      const kw = gameSearch.value ? gameSearch.value.trim().toLowerCase() : "";
      if (kw) {
        allFilteredData = allFilteredData.filter((g) => g.name.toLowerCase().includes(kw));
      }

      // 更新分页数据
      filteredGameList = allFilteredData;
      currentPage = 1;

      // 渲染页面
      renderCurrentPage();
    }, 300);
  }

  // ====================== 加载更多 ======================
  function initLoadMoreEvent() {
    if (!loadMoreBtn) return;
    
    loadMoreBtn.addEventListener("click", function () {
      this.style.pointerEvents = "none";
      this.textContent = "加载中...";

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      currentPage++;
      renderCurrentPage();

      setTimeout(() => {
        window.scrollTo({
          top: scrollTop,
          left: scrollLeft,
          behavior: "smooth",
        });
        this.style.pointerEvents = "auto";
        this.textContent = "加载更多";
      }, 100);
    });
  }

  // ====================== 弹窗处理 ======================
  function initPopupEvents() {
    popBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.target;
        const mask = document.getElementById(id);
        if (mask) {
          mask.style.display = "flex";
          mask.style.justifyContent = "center";
          mask.style.alignItems = "center";
          mask.style.position = "fixed";
          mask.style.top = "0";
          mask.style.left = "0";
          mask.style.width = "100%";
          mask.style.height = "100%";
          mask.style.backgroundColor = "rgba(0,0,0,0.5)";
          mask.style.zIndex = "1000";
          document.body.style.overflow = "hidden";
          if (id === "popup5") generateUpdateRecords();
          if (id === "popup1") initGiscus();
        }
      });
    });

    popClose.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mask = btn.closest(".popup-mask");
        if (mask) {
          mask.style.display = "none";
          document.body.style.overflow = "auto";
        }
      });
    });

    popMasks.forEach((mask) => {
      mask.addEventListener("click", (e) => {
        if (e.target === mask) {
          mask.style.display = "none";
          document.body.style.overflow = "auto";
        }
      });
    });
  }

  // ====================== 全局事件绑定 ======================
  function bindEvents() {
    // 搜索按钮
    searchBtn.addEventListener("click", search);
    
    // 回车搜索
    gameSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        filteredGameList = [];
        currentPage = 1;
        search();
      }
    });
    
    // 搜索框样式
    gameSearch.addEventListener("focus", () => {
      gameSearch.style.transform = "translateY(-2px)";
      gameSearch.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
    });
    gameSearch.addEventListener("blur", () => {
      gameSearch.style.transform = "translateY(0)";
      gameSearch.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
    });
    
    // 关闭按钮
    closeBtn.addEventListener("click", () => {
      resultBox.style.opacity = 0;
      resultBox.style.transform = "translateY(10px)";
      setTimeout(() => {
        resultBox.style.display = "none";
        resultBox.style.opacity = 1;
        resultBox.style.transform = "translateY(0)";
        gameSearch.value = "";
        filteredGameList = [];
        currentPage = 1;
        if (loadMoreBtn) loadMoreBtn.style.display = "none";
      }, 300);
    });
    
    // 选中标签清除（安全检查）
    if (selectedTagWrapper.parentElement) {
      selectedTagWrapper.parentElement.addEventListener("click", clearSelected);
    }
    
    // ESC关闭弹窗
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        popMasks.forEach((m) => (m.style.display = "none"));
        closeQrcodeModal();
        document.body.style.overflow = "auto";
      }
    });
    
    // 二维码弹窗关闭
    qrcodeModalClose.addEventListener("click", closeQrcodeModal);
    qrcodeModalMask.addEventListener("click", closeQrcodeModal);
  }

  // ====================== Giscus留言板（修复语法错误） ======================
  function initGiscus() {
    // 检查是否已经加载过Giscus
    if (document.querySelector("#giscus-container script")) {
      return;
    }

    const giscusContainer = document.getElementById("giscus-container");
    if (!giscusContainer) return;

    // 创建评论容器
    const commentContainer = document.createElement('div');
    commentContainer.id = 'giscus-comment';
    giscusContainer.appendChild(commentContainer);

    // Giscus配置
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'ytcwd3/ytcwd3.github.io');
    script.setAttribute('data-repo-id', 'R_kgDORh25sw');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDORh25s84C4J7t');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    commentContainer.appendChild(script);
  }

  // ====================== 初始化主函数 ======================
  async function init() {
    try {
      console.log("🚀 开始初始化应用");
      
      // 创建加载更多按钮
      createLoadMoreBtn();
      
      // 加载数据
      await loadGameData();
      
      // 初始化各种事件
      bindEvents();
      initTabEvents();
      initTagItemEvents();
      initLoadMoreEvent();
      initPopupEvents();
      
      // 检查数据变化
      checkGameChanges();
      generateUpdateRecords();
      
      // 【关键修改】：注释掉自动渲染，只在用户操作时显示
      // filteredGameList = [...gameDatabase];
      // renderCurrentPage();
      // resultBox.style.display = "block";
      
      // 标记页面加载完成
      setTimeout(() => {
        document.body.classList.add("loaded");
        console.log("✅ 应用初始化完成，等待用户操作");
      }, 200);
      
    } catch (error) {
      console.error("❌ 初始化出错:", error);
    }
  }

  // 启动应用
  init();
});