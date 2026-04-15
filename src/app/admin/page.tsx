"use client";
import "./admin.css";

import { useState, useEffect } from "react";
import { supabase, Game } from "@/lib/supabase";
import {
  CATEGORY_SUBCATEGORIES,
  CATEGORY_DB_VALUE,
  PAGE_SIZE,
} from "./components/constants";
import AdminHeader from "./components/Header";
import StatsCards from "./components/StatsCards";
import SubcategoryFilter from "./components/SubcategoryFilter";
import Toolbar from "./components/Toolbar";
import GameTable from "./components/GameTable";
import EditModal from "./components/EditModal";
import ImportModal from "./components/ImportModal";
import ConfirmModal from "./components/ConfirmModal";
import ImageMatchModal from "./components/ImageMatchModal";

export default function AdminDashboard() {
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("pc");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    {},
  );
  const [subcatCounts, setSubcatCounts] = useState<Record<string, number>>({});
  const [allGameMeta, setAllGameMeta] = useState<
    { category: string; subcategory: string }[]
  >([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImageMatchModal, setShowImageMatchModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // 删除确认
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteBatch, setPendingDeleteBatch] = useState<number[] | null>(
    null,
  );

  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
    validateSession();
  }, []);

  async function validateSession() {
    const loggedIn = localStorage.getItem("admin_logged_in");
    if (!loggedIn) {
      window.location.href = "/admin/login";
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/admin/login";
      return;
    }
    const githubUsername =
      session.user.user_metadata?.user_name ||
      session.user.user_metadata?.preferred_username;
    if (!["anyebojue", "ytcwd3"].includes(githubUsername)) {
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
      window.location.href = "/admin/login";
      return;
    }
    setUser(JSON.parse(localStorage.getItem("admin_user") || "{}"));
    applyFilters(1);
    loadAllMeta();
  }

  async function applyFilters(
    page: number = 1,
    cat?: string,
    sub?: string,
    keyword?: string,
  ) {
    const curCat = cat !== undefined ? cat : selectedCategory;
    const curSub = sub !== undefined ? sub : selectedSubcategory;
    const curKeyword = keyword !== undefined ? keyword : searchKeyword;
    const reqId = Date.now();
    (window as any).__reqId = reqId;
    setLoading(true);

    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = page * PAGE_SIZE - 1;
      let query = supabase.from("games").select("*", { count: "exact" });

      if (curCat !== "all") {
        const catName = CATEGORY_DB_VALUE[curCat];
        if (catName) query = query.contains("category", [catName]);
      }
      if (curSub !== "all") query = query.contains("subcategory", [curSub]);
      if (curKeyword) query = query.ilike("name", `%${curKeyword}%`);

      const { data, error, count } = await query
        .order("id", { ascending: true })
        .range(from, to);

      if ((window as any).__reqId !== reqId) return;
      if (error) throw error;

      setFilteredGames(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (error: any) {
      alert("筛选失败: " + error.message);
    }

    setLoading(false);
  }

  function handleCategoryClick(cat: string) {
    const catName = CATEGORY_DB_VALUE[cat];
    const subcatCountsNew: Record<string, number> = {};
    const subcats = CATEGORY_SUBCATEGORIES[cat] || [];
    subcats.forEach((sub) => {
      subcatCountsNew[sub] = allGameMeta.filter(
        (g) => g.category === catName && g.subcategory === sub,
      ).length;
    });
    setSubcatCounts(subcatCountsNew);
    setSelectedCategory(cat);
    setSelectedSubcategory("all");
    setSearchKeyword("");
    applyFilters(1, cat, "all");
  }

  function handleSubcategoryClick(sub: string) {
    setSelectedSubcategory(sub);
    applyFilters(1, undefined, sub);
  }

  function handleSearch() {
    applyFilters(1);
  }

  function handleClearSearch() {
    setSearchKeyword("");
    applyFilters(1, undefined, undefined, "");
  }

  function handleRefresh() {
    applyFilters(currentPage);
  }

  function handlePageChange(page: number) {
    applyFilters(page);
  }

  // 一次性批量加载所有元数据，从内存计算所有统计
  async function loadAllMeta() {
    const cacheKey = "admin_game_meta";
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const { meta, total } = JSON.parse(cached);
        const { count } = await supabase
          .from("games")
          .select("id", { count: "exact", head: true });

        if (count === total) {
          setAllGameMeta(meta);
          const catCounts: Record<string, number> = {};
          for (const catKey of Object.keys(CATEGORY_DB_VALUE)) {
            const catName = CATEGORY_DB_VALUE[catKey];
            catCounts[catKey] = meta.filter(
              (g: any) => g.category === catName,
            ).length;
          }
          setCategoryCounts(catCounts);

          const catName = CATEGORY_DB_VALUE[selectedCategory];
          const subcatCountsNew: Record<string, number> = {};
          (CATEGORY_SUBCATEGORIES[selectedCategory] || []).forEach(
            (sub: string) => {
              subcatCountsNew[sub] = meta.filter(
                (g: any) => g.category === catName && g.subcategory === sub,
              ).length;
            },
          );
          setSubcatCounts(subcatCountsNew);
          setStatsLoaded(true);
          return;
        }
      } catch {}
    }

    // 缓存失效，重新加载
    const allMeta: { category: string; subcategory: string }[] = [];
    const BATCH = 1000;
    let page = 0;

    while (true) {
      const from = page * BATCH;
      const to = from + BATCH - 1;
      const { data, error } = await supabase
        .from("games")
        .select("category, subcategory")
        .order("id", { ascending: true })
        .range(from, to);

      if (error || !data || data.length === 0) break;
      data.forEach((g: any) =>
        allMeta.push({
          category: g.category?.[0] || "",
          subcategory: g.subcategory?.[0] || "",
        }),
      );
      if (data.length < BATCH) break;
      page++;
    }

    setAllGameMeta(allMeta);

    const catCounts: Record<string, number> = {};
    for (const catKey of Object.keys(CATEGORY_DB_VALUE)) {
      const catName = CATEGORY_DB_VALUE[catKey];
      catCounts[catKey] = allMeta.filter(
        (g: any) => g.category === catName,
      ).length;
    }
    setCategoryCounts(catCounts);

    const catName = CATEGORY_DB_VALUE[selectedCategory];
    const subcatCountsNew: Record<string, number> = {};
    (CATEGORY_SUBCATEGORIES[selectedCategory] || []).forEach((sub: string) => {
      subcatCountsNew[sub] = allMeta.filter(
        (g: any) => g.category === catName && g.subcategory === sub,
      ).length;
    });
    setSubcatCounts(subcatCountsNew);

    const { count: total } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true });
    localStorage.setItem(cacheKey, JSON.stringify({ meta: allMeta, total }));
    setStatsLoaded(true);
  }

  function openAddModal() {
    setEditingGame(null);
    setShowEditModal(true);
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const SHEET_COLS = [
      "游戏名称",
      "主分类",
      "子分类",
      "解压密码",
      "夸克网盘链接",
      "夸克提取码",
      "百度网盘链接",
      "百度提取码",
      "迅雷网盘链接",
      "迅雷提取码",
      "更新日期",
      "封面图片",
      "视频链接",
    ];
    const SHEET_DATA: Record<string, string[][]> = {
      PC: [
        SHEET_COLS,
        [
          "示例游戏",
          "PC",
          "RPG",
          "1234",
          "https://pan.quark.cn/s/xxx",
          "8888",
          "https://pan.baidu.com/s/xxx",
          "8888",
          "https://pan.xunlei.com/s/xxx",
          "8888",
          "2026.3.30",
          "https://",
          "https://",
        ],
      ],
      NS: [
        SHEET_COLS,
        [
          "示例游戏",
          "NS",
          "动作",
          "1234",
          "https://pan.quark.cn/s/xxx",
          "8888",
          "https://pan.baidu.com/s/xxx",
          "8888",
          "https://pan.xunlei.com/s/xxx",
          "8888",
          "2026.3.30",
          "https://",
          "https://",
        ],
      ],
      任天堂掌机: [
        SHEET_COLS,
        [
          "示例游戏",
          "任天堂掌机",
          "RPG",
          "1234",
          "https://pan.quark.cn/s/xxx",
          "8888",
          "https://pan.baidu.com/s/xxx",
          "8888",
          "https://pan.xunlei.com/s/xxx",
          "8888",
          "2026.3.30",
          "https://",
          "https://",
        ],
      ],
      任天堂主机: [
        SHEET_COLS,
        [
          "示例游戏",
          "任天堂主机",
          "运动",
          "1234",
          "https://pan.quark.cn/s/xxx",
          "8888",
          "https://pan.baidu.com/s/xxx",
          "8888",
          "https://pan.xunlei.com/s/xxx",
          "8888",
          "2026.3.30",
          "https://",
          "https://",
        ],
      ],
      索尼: [
        SHEET_COLS,
        [
          "示例游戏",
          "索尼",
          "RPG",
          "1234",
          "https://pan.quark.cn/s/xxx",
          "8888",
          "https://pan.baidu.com/s/xxx",
          "8888",
          "https://pan.xunlei.com/s/xxx",
          "8888",
          "2026.3.30",
          "https://",
          "https://",
        ],
      ],
      Other: [
        SHEET_COLS,
        [
          "示例游戏",
          "Other",
          "FPS",
          "1234",
          "https://pan.quark.cn/s/xxx",
          "8888",
          "https://pan.baidu.com/s/xxx",
          "8888",
          "https://pan.xunlei.com/s/xxx",
          "8888",
          "2026.3.30",
          "https://",
          "https://",
        ],
      ],
    };

    const wb = XLSX.utils.book_new();
    Object.entries(SHEET_DATA).forEach(([name, data]) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, "游戏导入模板.xlsx");
  }

  function openEditModal(game: Game) {
    setEditingGame(game);
    setShowEditModal(true);
  }

  function confirmDelete(id: number) {
    setPendingDeleteId(id);
  }

  function confirmBatchDelete(ids: number[]) {
    setPendingDeleteBatch(ids);
  }

  async function executeDelete() {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (id === null) return;

    try {
      const { error } = await supabase.from("games").delete().eq("id", id);
      if (error) throw error;
      localStorage.removeItem("admin_game_meta");
      // 如果当前页只有1条，删后回退到上一页
      if (filteredGames.length === 1 && currentPage > 1) {
        applyFilters(currentPage - 1);
      } else {
        applyFilters(currentPage);
      }
    } catch (error: any) {
      alert("删除失败: " + error.message);
    }
  }

  async function executeBatchDelete() {
    const ids = pendingDeleteBatch;
    setPendingDeleteBatch(null);
    if (!ids || ids.length === 0) return;

    try {
      const { error } = await supabase.from("games").delete().in("id", ids);
      if (error) throw error;
      localStorage.removeItem("admin_game_meta");
      alert(`批量删除成功，共删除 ${ids.length} 条数据`);
      // 如果删完当前页空了，回退
      const remaining = filteredGames.length - ids.length;
      if (remaining <= 0 && currentPage > 1) {
        applyFilters(currentPage - 1);
      } else {
        applyFilters(currentPage);
      }
    } catch (error: any) {
      alert("批量删除失败: " + error.message);
    }
  }

  function openImportModal() {
    setShowImportModal(true);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <>
      <AdminHeader user={user} />

      <div className="admin-container" style={{ maxWidth: 1200, margin: "20px auto", padding: "0 20px" }}>
        <StatsCards
          className="stats-cards"
          selectedCategory={selectedCategory}
          categoryCounts={categoryCounts}
          onCategoryClick={handleCategoryClick}
        />

        <SubcategoryFilter
          className="subcat-filter"
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          categoryCounts={categoryCounts}
          subcatCounts={subcatCounts}
          onSubcategoryClick={handleSubcategoryClick}
        />

        <Toolbar
          className="toolbar"
          searchKeyword={searchKeyword}
          onSearchChange={setSearchKeyword}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          onOpenImport={openImportModal}
          onOpenAdd={openAddModal}
          onDownloadTemplate={downloadTemplate}
          onRefresh={handleRefresh}
          onOpenImageMatch={() => setShowImageMatchModal(true)}
        />

        <GameTable
          className="game-table-wrapper"
          games={filteredGames}
          loading={loading}
          currentPage={currentPage}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onEdit={openEditModal}
          onDelete={confirmDelete}
          onBatchDelete={confirmBatchDelete}
        />
      </div>

      {showEditModal && (
        <EditModal
          game={editingGame}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            applyFilters(currentPage);
          }}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            applyFilters(currentPage);
          }}
        />
      )}

      {showImageMatchModal && (
        <ImageMatchModal
          onClose={() => setShowImageMatchModal(false)}
          onDone={() => {
            setShowImageMatchModal(false);
            applyFilters(currentPage);
          }}
        />
      )}

      {/* 单条删除确认 */}
      {pendingDeleteId !== null && (
        <ConfirmModal
          title="确认删除"
          message={`确定要删除这条游戏数据吗？此操作不可恢复！`}
          confirmText="确认删除"
          danger
          onConfirm={executeDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* 批量删除确认 */}
      {pendingDeleteBatch !== null && pendingDeleteBatch.length > 0 && (
        <ConfirmModal
          title="批量删除"
          message={`确定要删除选中的 ${pendingDeleteBatch.length} 条数据吗？此操作不可恢复！`}
          confirmText={`确认删除 ${pendingDeleteBatch.length} 条`}
          danger
          onConfirm={executeBatchDelete}
          onCancel={() => setPendingDeleteBatch(null)}
        />
      )}
    </>
  );
}
