document.addEventListener("DOMContentLoaded", function () {
  // ====================== 全局变量（新增分页变量） ======================
  let gameDatabase = [];
  let originalGameDatabase = [];
  let updateRecords = [];

  // 新增：分页核心变量
  let filteredGameList = []; // 存储筛选后的全量结果
  let currentPage = 1; // 当前页码
  const PAGE_SIZE = 15; // 每页显示15条

  // 核心元素
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  const tagItems = document.querySelectorAll(".tag-item");
  const gameSearch = document.getElementById("gameSearch");
  const searchBtn = document.getElementById("searchBtn");
  const resultBox = document.getElementById("resultBox");
  const loading = document.getElementById("loading");
  const resultContent = document.getElementById("resultContent");
  const closeBtn = document.getElementById("closeBtn");
  const selectedTagWrapper = document.getElementById("selectedTagWrapper");

  // 新增：创建加载更多按钮
  const loadMoreBtn = document.createElement("div");
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

  // 二维码弹窗
  const qrcodeModal = document.getElementById("qrcodeModal");
  const qrcodeModalClose = document.getElementById("qrcodeModalClose");
  const qrcodeModalMask = document.querySelector(".qrcode-modal-mask");
  const qrcodeBigContainer = document.getElementById("qrcodeBigContainer");
  const qrcodeModalTitle = document.getElementById("qrcodeModalTitle");

  let selectedTag = null;

  // ====================== 工具函数 ======================
  function alertBox(msg) {
    alert(msg);
  }

  // ====================== 加载JSON（补充兼容逻辑） ======================
  async function loadGameData() {
    try {
      const res = await fetch("data/gameData.json");
      if (!res.ok) throw new Error("加载失败");
      gameDatabase = await res.json();

      // 自动补全日期 + 兼容单分类数据转为数组
      const today = new Date();
      const todayStr = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}`;

      gameDatabase = gameDatabase.map((game) => {
        // 补全日期
        if (!game.updateDate || game.updateDate.trim() === "")
          game.updateDate = todayStr;

        // 单分类转数组（兼容旧数据）
        if (!Array.isArray(game.category)) game.category = [game.category];
        if (!Array.isArray(game.subCategory))
          game.subCategory = [game.subCategory];

        return game;
      });

      originalGameDatabase = JSON.parse(JSON.stringify(gameDatabase));
      console.log("✅ 加载成功", gameDatabase.length);
    } catch (e) {
      console.error("❌ 加载失败，使用测试数据", e);
      // 测试数据也改为数组格式
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
      updateRecords =
        JSON.parse(localStorage.getItem("gameUpdateRecords")) || [];
    } catch (e) {
      updateRecords = [];
    }
  }

  // ====================== 检测变化并生成更新记录（修复版） ======================
  function checkGameChanges() {
    if (!gameDatabase) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}`;

    gameDatabase.forEach((game, i) => {
      const orig = originalGameDatabase[i];
      if (!orig) return;

      let changed = false;

      if (game.name !== orig.name) {
        addUpdateRecord(
          game.name,
          Array.isArray(game.category) ? game.category[0] : game.category,
          "修改名称",
        );
        orig.name = game.name;
        changed = true;
      }
      if (game.quarkPan !== orig.quarkPan) {
        addUpdateRecord(
          game.name,
          Array.isArray(game.category) ? game.category[0] : game.category,
          game.quarkPan ? "更新夸克" : "新增夸克",
        );
        orig.quarkPan = game.quarkPan;
        changed = true;
      }
      if (game.baiduPan !== orig.baiduPan) {
        addUpdateRecord(
          game.name,
          Array.isArray(game.category) ? game.category[0] : game.category,
          game.baiduPan ? "更新百度" : "新增百度",
        );
        orig.baiduPan = game.baiduPan;
        changed = true;
      }
      if (game.thunderPan !== orig.thunderPan) {
        addUpdateRecord(
          game.name,
          Array.isArray(game.category) ? game.category[0] : game.category,
          game.thunderPan ? "更新迅雷" : "新增迅雷",
        );
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
    const exist = updateRecords.some(
      (r) =>
        r.gameName === name &&
        r.updateType === type &&
        Math.abs(new Date(r.updateTime) - now) < 60000,
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

  // ====================== 生成更新记录列表（适配数组） ======================
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
      (a, b) =>
        new Date(b.replace(/\./g, "-")) - new Date(a.replace(/\./g, "-")),
    );

    let html = "";

    // 自动记录
    if (auto.length) {
      html += `<div class="update-record-date">🔔 最近修改/新增</div>`;
      auto.forEach((r) => {
        const c =
          r.category === "任天堂"
            ? "var(--color-nintendo)"
            : r.category === "索尼"
              ? "var(--color-sony)"
              : r.category === "PC及安卓"
                ? "var(--color-pc-android)"
                : "var(--color-other)";
        html += `<div class="update-record-item" style="border-left:3px solid ${c}"><div>${r.gameName}<br><small>${r.updateType} | ${r.fmt}</small></div><span>${r.category}</span></div>`;
      });
      html += `<div style="margin:15px 0;border-bottom:1px dashed #eee;"></div>`;
    }

    // 日期分组
    if (dates.length) {
      dates.forEach((d) => {
        html += `<div class="update-record-date">📅 ${d}</div>`;
        groups[d].forEach((g) => {
          // 取第一个分类作为显示颜色
          const mainCategory = Array.isArray(g.category)
            ? g.category[0]
            : g.category;
          const c =
            mainCategory === "任天堂"
              ? "var(--color-nintendo)"
              : mainCategory === "索尼"
                ? "var(--color-sony)"
                : mainCategory === "PC及安卓"
                  ? "var(--color-pc-android)"
                  : "var(--color-other)";

          // 显示第一个分类或所有分类
          const mainSubCategory = Array.isArray(g.subCategory)
            ? g.subCategory[0]
            : g.subCategory;
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
    qrcodeModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeQrcodeModal() {
    qrcodeModal.style.display = "none";
    qrcodeBigContainer.innerHTML = "";
    document.body.style.overflow = "auto";
  }

  window.openBigQrcode = function (img, title) {
    openQrcodeModal(img.src, title);
  };

  // ====================== 批量初始化二维码（修复懒加载ID重复问题） ======================
  function initAllQrcodes(gameList, startIndex) {
    gameList.forEach((g, idx) => {
      // 使用全局索引生成唯一ID
      const globalIdx = startIndex + idx;
      const qkId = `qrcode-quark-${globalIdx}`;
      const bdId = `qrcode-baidu-${globalIdx}`;
      const xlId = `qrcode-xunlei-${globalIdx}`;

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
    el.innerHTML = "";

    // 2. 过滤空链接/无效链接
    if (!link || link === "#" || link.trim() === "") {
      el.innerHTML =
        '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">无链接</div>';
      return;
    }

    // 3. 清理链接格式
    const cleanLink = link.trim().replace(/\s+/g, "");
    if (cleanLink === "") {
      el.innerHTML =
        '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">无效链接</div>';
      return;
    }

    // 4. 生成二维码（独立实例）
    try {
      new QRCode(el, {
        text: cleanLink,
        width: 68,
        height: 68,
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (e) {
      el.innerHTML =
        '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">生成失败</div>';
      console.error("二维码生成失败:", e);
    }

    // 5. 绑定点击事件（避免重复绑定）
    el.onclick = function () {
      const canvas = this.querySelector("canvas");
      if (canvas) {
        openQrcodeModal(canvas.toDataURL("image/png"), title);
      }
    };
  }

  // ====================== 分页渲染核心函数（新增） ======================
  function renderCurrentPage() {
    // 计算当前页数据范围
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = currentPage * PAGE_SIZE;
    const currentPageData = filteredGameList.slice(startIndex, endIndex);

    // 无数据处理
    if (currentPage === 1 && currentPageData.length === 0) {
      resultContent.innerHTML = `<div class="empty-state">未找到相关资源</div>`;
      loadMoreBtn.style.display = "none";
      return;
    }

    // 拼接当前页HTML
    let pageHtml = "";
    currentPageData.forEach((game, idx) => {
      const globalIdx = startIndex + idx;
      const color = ["#d857e8", "#f06292", "#9333ea"][globalIdx % 3];
      const qkId = `qrcode-quark-${globalIdx}`;
      const bdId = `qrcode-baidu-${globalIdx}`;
      const xlId = `qrcode-xunlei-${globalIdx}`;

      const displayCategory = Array.isArray(game.category)
        ? game.category[0]
        : game.category;
      const displaySubCategory = Array.isArray(game.subCategory)
        ? game.subCategory[0]
        : game.subCategory;

      pageHtml += `
        <div class="result-item" data-category="${displayCategory}">
          <div class="qrcode-area">
            <div class="qrcode-box" id="${qkId}" data-link="${game.quarkPan || ""}" data-title="${game.name} 夸克网盘"></div>
            <div class="qrcode-box" id="${bdId}" data-link="${game.baiduPan || ""}" data-title="${game.name} 百度网盘"></div>
            <div class="qrcode-box" id="${xlId}" data-link="${game.thunderPan || ""}" data-title="${game.name} 迅雷网盘"></div>
          </div>
          <div class="result-content-wrap">
            <span style="color:${color}">${globalIdx + 1}. ${game.name}</span>
            <span>（${displayCategory} - ${displaySubCategory}）</span><br>
            <div class="code-row">
              <div class="code-item"><label>提取码：</label><span>${game.code || "无"}</span></div>
              ${game.unzipCode && game.unzipCode != "无" ? `<div class="code-item"><label>解压密码：</label><span>${game.unzipCode}</span></div>` : ""}
            </div>
            <div class="pan-links">
              <div class="pan-link-item"><label>夸克：</label><a href="${game.quarkPan}" target="_blank">${game.quarkPan || "无"}</a></div>
              <div class="pan-link-item"><label>百度：</label><a href="${game.baiduPan}" target="_blank">${game.baiduPan || "无"}</a></div>
              ${game.thunderPan ? `<div class="pan-link-item"><label>迅雷：</label><a href="${game.thunderPan}" target="_blank">${game.thunderPan}</a></div>` : ""}
            </div>
          </div>
        </div>
      `;
    });

    // 第一页覆盖，后续页追加
    if (currentPage === 1) {
      resultContent.innerHTML = pageHtml;
    } else {
      resultContent.innerHTML += pageHtml;
    }

    // 初始化当前页二维码
    initAllQrcodes(currentPageData, startIndex);

    // 控制加载更多按钮显示
    loadMoreBtn.style.display =
      endIndex >= filteredGameList.length ? "none" : "block";
  }

  // ====================== 标签栏 ======================
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
    if (
      !e.target.closest(".tab-header") &&
      !e.target.closest(".tab-panel") &&
      !e.target.closest(".tag-item")
    ) {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabPanels.forEach((p) => p.classList.remove("show"));
    }
  });

  // ====================== 子标签（核心修改：选中自动搜索+重置分页） ======================
  function renderSelected() {
    if (!selectedTagWrapper) return;
    if (!selectedTag) {
      selectedTagWrapper.innerHTML = "<span>无</span>";
      return;
    }
    let color = "";
    switch (selectedTag.category) {
      case "任天堂":
        color = "229, 57, 53";
        break; // 修复：使用具体RGB值
      case "索尼":
        color = "33, 150, 243";
        break;
      case "PC及安卓":
        color = "251, 192, 45";
        break;
      case "其他平台":
        color = "67, 160, 71";
        break;
    }
    selectedTagWrapper.innerHTML = `<div class="selected-tag-chip" style="--category-color-rgb:${color}"><span>${selectedTag.category} - ${selectedTag.value}</span><span class="tag-close">×</span></div>`;
    document.querySelector(".tag-close")?.addEventListener("click", () => {
      clearSelected();
    });
  }

  function clearSelected() {
    tagItems.forEach((t) => t.classList.remove("active"));
    selectedTag = null;
    renderSelected();
    resultBox.style.display = "none";
    resultContent.innerHTML = "";
    // 重置分页
    filteredGameList = [];
    currentPage = 1;
    loadMoreBtn.style.display = "none";
  }

  // 核心修改：子标签点击事件 - 选中后自动触发搜索+重置分页
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

      // 重置分页
      filteredGameList = [];
      currentPage = 1;
      // 关键新增：选中标签后自动执行搜索
      search();
    });
  });

  // ====================== 搜索（重构为懒加载版本） ======================
  function search() {
    // 无筛选条件时隐藏结果框
    if (!selectedTag && !gameSearch.value.trim()) {
      resultBox.style.display = "none";
      return;
    }

    resultBox.style.display = "block";
    loading.style.display = "flex";
    resultContent.innerHTML = "";
    loadMoreBtn.style.display = "none";

    setTimeout(() => {
      loading.style.display = "none";

      // 筛选全量数据
      let allFilteredData = gameDatabase;
      if (selectedTag) {
        allFilteredData = allFilteredData.filter((g) => {
          const gameCategories = Array.isArray(g.category)
            ? g.category
            : [g.category];
          const gameSubCategories = Array.isArray(g.subCategory)
            ? g.subCategory
            : [g.subCategory];
          return (
            gameCategories.includes(selectedTag.category) &&
            gameSubCategories.includes(selectedTag.value)
          );
        });
      }
      const kw = gameSearch.value.trim().toLowerCase();
      if (kw) {
        allFilteredData = allFilteredData.filter((g) =>
          g.name.toLowerCase().includes(kw),
        );
      }

      // 保存全量筛选结果并重置分页
      filteredGameList = allFilteredData;
      currentPage = 1;

      // 渲染第一页
      renderCurrentPage();
    }, 600);
  }

  // ====================== 加载更多按钮事件（修复：解决滚动跳转问题） ======================
  loadMoreBtn.addEventListener("click", function () {
    // 1. 记录点击前的滚动位置（关键修复）
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    // 2. 加载下一页
    currentPage++;
    renderCurrentPage();

    // 3. 恢复滚动位置（延迟执行确保DOM更新完成）
    setTimeout(() => {
      window.scrollTo({
        top: scrollTop,
        left: scrollLeft,
        behavior: "smooth", // 平滑滚动，提升体验
      });
    }, 100);
  });

  // ====================== 弹窗 ======================
  const popBtns = document.querySelectorAll(".popup-btn");
  const popMasks = document.querySelectorAll(".popup-mask");
  const popClose = document.querySelectorAll(".popup-mask .close-btn");

  popBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.target;
      const mask = document.getElementById(id);
      if (mask) {
        mask.style.display = "flex";
        document.body.style.overflow = "hidden";
        if (id === "popup5") generateUpdateRecords();
        // 当打开留言板弹窗时，初始化Giscus
        if (id === "popup1") initGiscus();
      }
    });
  });

  popClose.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".popup-mask").style.display = "none";
      document.body.style.overflow = "auto";
    });
  });

  popMasks.forEach((mask) => {
    mask.addEventListener(
      "click",
      (e) =>
        e.target === mask &&
        ((mask.style.display = "none"),
        (document.body.style.overflow = "auto")),
    );
  });

  // ====================== 全局事件（修改回车/关闭逻辑） ======================
  function bindEvents() {
    searchBtn.addEventListener("click", search);
    gameSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        // 回车搜索重置分页
        filteredGameList = [];
        currentPage = 1;
        search();
      }
    });
    closeBtn.addEventListener("click", () => {
      resultBox.style.opacity = 0;
      resultBox.style.transform = "translateY(10px)";
      setTimeout(() => {
        resultBox.style.display = "none";
        resultBox.style.opacity = 1;
        resultBox.style.transform = "translateY(0)";
        gameSearch.value = "";
        // 关闭结果重置分页
        filteredGameList = [];
        currentPage = 1;
        loadMoreBtn.style.display = "none";
      }, 300);
    });
    selectedTagWrapper.parentElement.addEventListener("click", clearSelected);
    gameSearch.addEventListener("focus", () => {
      gameSearch.style.transform = "translateY(-2px)";
      gameSearch.style.boxShadow = "var(--shadow-md)";
    });
    gameSearch.addEventListener("blur", () => {
      gameSearch.style.transform = "translateY(0)";
      gameSearch.style.boxShadow = "var(--shadow-sm)";
    });
    document.addEventListener(
      "keydown",
      (e) =>
        e.key === "Escape" &&
        (popMasks.forEach((m) => (m.style.display = "none")),
        closeQrcodeModal(),
        (document.body.style.overflow = "auto")),
    );
    qrcodeModalClose?.addEventListener("click", closeQrcodeModal);
    qrcodeModalMask?.addEventListener("click", closeQrcodeModal);
  }

  // ====================== Giscus留言板功能 ======================
  function initGiscus() {
    // 检查是否已经加载过Giscus
    if (document.querySelector("#giscus-container script")) {
      return;
    }

    const giscusContainer = document.getElementById("giscus-container");
    if (!giscusContainer) return;

    // 暂时显示提示信息，等待配置
// giscusContainer.innerHTML = `
//   <div style="padding: 40px; text-align: center; color: #666;">
//     <h3>留言板功能正在配置中...</h3>
//     <p>请按照以下步骤配置Giscus：</p>
//     <ol style="text-align: left; max-width: 500px; margin: 20px auto;">
//       <li>访问 <a href="https://github.com/apps/giscus" target="_blank">https://github.com/apps/giscus</a></li>
//       <li>点击 Install 安装到你的仓库</li>
//       <li>在仓库设置中启用 Discussions 功能</li>
//       <li>访问 <a href="https://giscus.app/zh-CN" target="_blank">https://giscus.app/zh-CN</a> 获取配置参数</li>
//       <li>更新 script.js 中的配置</li>
//     </ol>
//     <p style="margin-top: 20px;">
//       <a href="Giscus配置指南.md" target="_blank" style="color: #d857e8;">查看详细配置指南 →</a>
//     </p>
//   </div>
// `;
//    return;

    // 等待页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 创建Giscus评论区容器
    const giscusContainer = document.createElement('div');
    giscusContainer.id = 'giscus-comment'; // 给容器加ID，方便定位
    document.body.appendChild(giscusContainer); // 将容器添加到页面

    // 取消注释后的Giscus脚本（核心代码）
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'ytcwd3/ytcwd3.github.io'); // 你的GitHub仓库
    script.setAttribute('data-repo-id', 'R_kgDORh25sw'); // 已配置的Repo ID
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', ''); // 需补充你的分类ID
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'light');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    giscusContainer.appendChild(script);
});

  // ====================== 初始化 ======================
  loadGameData().then(() => {
    bindEvents();
    checkGameChanges();
    generateUpdateRecords();
    setTimeout(() => document.body.classList.add("loaded"), 200);
  });
});
