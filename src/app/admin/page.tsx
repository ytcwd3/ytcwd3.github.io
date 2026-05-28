"use client";
import "./admin.css";

import { useState, useEffect } from "react";
import { supabase, Game } from "@/lib/supabase";
import { fetchPinPriorityMap } from "@/lib/pinPriority";
import { PAGE_SIZE } from "./components/constants";
import AdminHeader from "./components/Header";
import StatsCards from "./components/StatsCards";
import SubcategoryFilter from "./components/SubcategoryFilter";
import Toolbar from "./components/Toolbar";
import GameTable from "./components/GameTable";
import EditModal from "./components/EditModal";
import ImportModal from "./components/ImportModal";
import ConfirmModal from "./components/ConfirmModal";
import ImageMatchModal from "./components/ImageMatchModal";
import { DbCategory, fetchDbCategories, fetchDbCategoryOptions } from "@/lib/categoryTables";

function invalidateAdminMetaCache() {
  localStorage.removeItem("admin_game_meta");
  localStorage.removeItem("admin_game_meta_v2");
}

function parseUpdateDate(value: string) {
  if (!value) return null;
  const normalized = value.trim().replace(/\./g, "-").replace(/\//g, "-");
  const parts = normalized.split("-").map((part) => Number(part));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPinPriority(
  game: { id: number; pinned?: boolean },
  pinPriorityMap: Record<number, number>,
) {
  if (!game.pinned) return Number.MAX_SAFE_INTEGER;
  const raw = pinPriorityMap[game.id];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

async function fetchAdminGamesPageFast(params: {
  categoryId: number | null;
  subcategoryId: number | "all";
  keyword: string;
  sort: "default" | "name" | "updatedate_desc" | "updatedate_asc";
  page: number;
  pageSize: number;
}) {
  const args = {
    p_category_id: params.categoryId,
    p_subcategory_id: params.subcategoryId === "all" ? null : params.subcategoryId,
    p_keyword: params.keyword || null,
    p_page: params.page,
    p_page_size: params.pageSize,
  };

  const sortedArgs = {
    ...args,
    p_sort: params.sort,
  };

  const sortedResult = await supabase.rpc("get_admin_games_page_sorted_fast", sortedArgs);
  const { data, error } =
    sortedResult.error && params.sort === "default"
      ? await supabase.rpc("get_admin_games_page_fast", args)
      : sortedResult;

  if (error || !data || typeof data !== "object") return null;
  const payload = data as any;
  return {
    data: Array.isArray(payload.data) ? (payload.data as Game[]) : [],
    total: Number(payload.total || 0),
  };
}

export default function AdminDashboard() {
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | "all">("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState<
    "default" | "name" | "updatedate_desc" | "updatedate_asc"
  >("default");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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
    const dbCategories = await loadCategories();
    applyFilters(1, dbCategories[0]?.id ?? null, "all");
    refreshCategoryCounts();

    // 监听置顶切换刷新事件
    const handleRefresh = () => applyFilters(currentPage);
    window.addEventListener("adminRefreshGames", handleRefresh);
    return () => window.removeEventListener("adminRefreshGames", handleRefresh);
  }

  async function loadCategories() {
    const dbCategories = await fetchDbCategoryOptions();
    setCategories(dbCategories);
    if (!selectedCategoryId && dbCategories.length > 0) {
      setSelectedCategoryId(dbCategories[0].id);
      setSelectedSubcategoryId("all");
    } else if (selectedCategoryId) {
      const exists = dbCategories.some((category) => category.id === selectedCategoryId);
      if (!exists && dbCategories.length > 0) {
        setSelectedCategoryId(dbCategories[0].id);
        setSelectedSubcategoryId("all");
      }
    }
    return dbCategories;
  }

  async function refreshCategoryCounts() {
    try {
      const countedCategories = await fetchDbCategories();
      setCategories(countedCategories);
    } catch {
      // 数量加载失败不阻塞数据管理。
    }
  }

  async function applyFilters(
    page: number = 1,
    categoryId?: number | null,
    subcategoryId?: number | "all",
    keyword?: string,
    sort?: "default" | "name" | "updatedate_desc" | "updatedate_asc",
  ) {
    const curCat = categoryId !== undefined ? categoryId : selectedCategoryId;
    const curSub = subcategoryId !== undefined ? subcategoryId : selectedSubcategoryId;
    const curKeyword = keyword !== undefined ? keyword : searchKeyword;
    const curSort = sort !== undefined ? sort : sortBy;
    const reqId = Date.now();
    (window as any).__reqId = reqId;
    setLoading(true);

    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = page * PAGE_SIZE - 1;
      function applyGameFilters(query: any) {
        if (curCat) {
          query = query.eq("category_id", curCat);
        }
        if (curSub !== "all") {
          query = query.eq("subcategory_id", curSub);
        }
        if (curKeyword) {
          query = query.ilike("name", `%${curKeyword}%`);
        }
        return query;
      }

      const fastPage = await fetchAdminGamesPageFast({
        categoryId: curCat || null,
        subcategoryId: curSub,
        keyword: curKeyword,
        sort: curSort,
        page,
        pageSize: PAGE_SIZE,
      });
      if ((window as any).__reqId !== reqId) return;
      if (fastPage) {
        setFilteredGames(fastPage.data);
        setTotalCount(fastPage.total);
        setCurrentPage(page);
        return;
      }

      if (curSort === "default") {
        const pinPriorityMap = await fetchPinPriorityMap();
        if ((window as any).__reqId !== reqId) return;

        const pinnedQuery = applyGameFilters(
          supabase.from("games").select("*", { count: "planned" }).eq("pinned", true),
        );
        const { data: pinnedRaw, error: pinnedError, count: pinnedCountRaw } =
          await pinnedQuery.order("id", { ascending: true });
        if ((window as any).__reqId !== reqId) return;
        if (pinnedError) throw pinnedError;

        const pinnedGames = ((pinnedRaw || []) as Game[])
          .sort((a, b) => {
            const pinOrderDiff =
              getPinPriority(a, pinPriorityMap) - getPinPriority(b, pinPriorityMap);
            if (pinOrderDiff !== 0) return pinOrderDiff;
            return a.id - b.id;
          })
          .map((game) => ({
            ...game,
            pinPriority: game.pinned ? pinPriorityMap[game.id] ?? 0 : null,
          }));

        const pinnedCount = pinnedCountRaw || pinnedGames.length;
        const visiblePinned = pinnedGames.slice(from, to + 1);
        const remainingSlots = PAGE_SIZE - visiblePinned.length;
        const nonPinnedOffset = Math.max(0, from - pinnedCount);

        let nonPinnedGames: Game[] = [];
        let nonPinnedCount = 0;
        if (remainingSlots > 0) {
          const nonPinnedQuery = applyGameFilters(
            supabase.from("games").select("*", { count: "planned" }).eq("pinned", false),
          );
          const {
            data: nonPinnedRaw,
            error: nonPinnedError,
            count: nonPinnedCountRaw,
          } = await nonPinnedQuery
            .order("id", { ascending: true })
            .range(nonPinnedOffset, nonPinnedOffset + remainingSlots - 1);
          if ((window as any).__reqId !== reqId) return;
          if (nonPinnedError) throw nonPinnedError;
          nonPinnedGames = ((nonPinnedRaw || []) as Game[]).map((game) => ({
            ...game,
            pinPriority: null,
          }));
          nonPinnedCount = nonPinnedCountRaw || 0;
        } else {
          const nonPinnedCountQuery = applyGameFilters(
            supabase.from("games").select("id", { count: "planned", head: true }).eq("pinned", false),
          );
          const { count, error } = await nonPinnedCountQuery;
          if ((window as any).__reqId !== reqId) return;
          if (error) throw error;
          nonPinnedCount = count || 0;
        }

        setFilteredGames([...visiblePinned, ...nonPinnedGames]);
        setTotalCount(pinnedCount + nonPinnedCount);
        setCurrentPage(page);
        return;
      }

      function buildMetaQuery() {
        return applyGameFilters(
          supabase.from("games").select("id, name, updatedate, pinned, category_id, subcategory_id"),
        );
      }

      const metaData: {
        id: number;
        name?: string;
        updatedate: string;
        pinned?: boolean;
        category_id?: number | null;
        subcategory_id?: number | null;
      }[] = [];
      const META_BATCH = 1000;
      let metaPage = 0;

      while (true) {
        const metaFrom = metaPage * META_BATCH;
        const metaTo = metaFrom + META_BATCH - 1;
        const { data, error } = await buildMetaQuery()
          .order("id", { ascending: true })
          .range(metaFrom, metaTo);

        if ((window as any).__reqId !== reqId) return;
        if (error) throw error;
        if (!data || data.length === 0) break;

        metaData.push(...data);
        if (data.length < META_BATCH) break;
        metaPage++;
      }

      const pinPriorityMap = await fetchPinPriorityMap();
      if ((window as any).__reqId !== reqId) return;

      const sortedMeta = [...metaData].sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        if (a.pinned && b.pinned) {
          const pinOrderDiff =
            getPinPriority(a, pinPriorityMap) - getPinPriority(b, pinPriorityMap);
          if (pinOrderDiff !== 0) return pinOrderDiff;
        }

        if (curSort === "name") {
          const nameDiff = (a.name || "").localeCompare(b.name || "", "zh-CN");
          if (nameDiff !== 0) return nameDiff;
          return a.id - b.id;
        }

        if (curSort === "updatedate_desc" || curSort === "updatedate_asc") {
          const dateA = parseUpdateDate(a.updatedate);
          const dateB = parseUpdateDate(b.updatedate);
          if (!dateA && !dateB) {
            return curSort === "updatedate_desc" ? b.id - a.id : a.id - b.id;
          }
          if (!dateA) return 1;
          if (!dateB) return -1;
          if (dateA.getTime() !== dateB.getTime()) {
            return curSort === "updatedate_desc"
              ? dateB.getTime() - dateA.getTime()
              : dateA.getTime() - dateB.getTime();
          }
          return curSort === "updatedate_desc" ? b.id - a.id : a.id - b.id;
        }

        return a.id - b.id;
      });

      const pageIds = sortedMeta.slice(from, to + 1).map((item) => item.id);
      if (pageIds.length === 0) {
        setFilteredGames([]);
        setTotalCount(sortedMeta.length);
        setCurrentPage(page);
        return;
      }

      const { data, error } = await supabase.from("games").select("*").in("id", pageIds);
      if ((window as any).__reqId !== reqId) return;
      if (error) throw error;

      const gamesById = new Map((data || []).map((item) => [item.id, item]));
      setFilteredGames(
        pageIds
          .map((id) => {
            const game = gamesById.get(id);
            if (!game) return null;
            return {
              ...game,
              pinPriority: game.pinned ? pinPriorityMap[id] ?? 0 : null,
            };
          })
          .filter(Boolean) as Game[],
      );
      setTotalCount(sortedMeta.length);
      setCurrentPage(page);
    } catch (error: any) {
      alert("筛选失败: " + error.message);
    } finally {
      if ((window as any).__reqId === reqId) {
        setLoading(false);
      }
    }
  }

  function handleCategoryClick(categoryId: number) {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId("all");
    setSearchKeyword("");
    applyFilters(1, categoryId, "all");
  }

  function handleSubcategoryClick(sub: number | "all") {
    setSelectedSubcategoryId(sub);
    applyFilters(1, undefined, sub);
  }

  function handleSearch() {
    applyFilters(1);
  }

  function handleSortChange(
    nextSort: "default" | "name" | "updatedate_desc" | "updatedate_asc",
  ) {
    setSortBy(nextSort);
    applyFilters(1, undefined, undefined, undefined, nextSort);
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
    const dbCategories = categories.length > 0 ? categories : await fetchDbCategoryOptions();
    const wb = XLSX.utils.book_new();

    dbCategories.forEach((category) => {
      const exampleSubcategory = category.subcategories[0]?.name || "";
      const sheetData = [
        SHEET_COLS,
        [
          "示例游戏",
          category.name,
          exampleSubcategory,
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
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, category.name.slice(0, 31));
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
      invalidateAdminMetaCache();
      await loadCategories();
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
      invalidateAdminMetaCache();
      await loadCategories();
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
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryClick={handleCategoryClick}
        />

        <SubcategoryFilter
          className="subcat-filter"
          selectedCategory={categories.find((category) => category.id === selectedCategoryId) || null}
          selectedSubcategoryId={selectedSubcategoryId}
          onSubcategoryClick={handleSubcategoryClick}
        />

        <Toolbar
          className="toolbar"
          searchKeyword={searchKeyword}
          sortBy={sortBy}
          onSearchChange={setSearchKeyword}
          onSortChange={handleSortChange}
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
            invalidateAdminMetaCache();
            loadCategories();
            applyFilters(currentPage);
          }}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            invalidateAdminMetaCache();
            loadCategories();
            applyFilters(currentPage);
          }}
        />
      )}

      {showImageMatchModal && (
        <ImageMatchModal
          onClose={() => setShowImageMatchModal(false)}
          onDone={() => {
            setShowImageMatchModal(false);
            invalidateAdminMetaCache();
            loadCategories();
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
