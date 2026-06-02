"use client";
import "./admin.css";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Game } from "@/lib/games";
import { adminDeleteGames } from "@/lib/admin_games";
import { validateAdminSession } from "@/lib/admin_auth";
import { fetchPinPriorityMap } from "@/lib/site_links";
import { PAGE_SIZE } from "./components/constants";
import AdminHeader from "./components/Header";
import StatsCards from "./components/StatsCards";
import SubcategoryFilter from "./components/SubcategoryFilter";
import Toolbar from "./components/Toolbar";
import GameTable from "./components/GameTable";
import EditModal from "./components/EditModal";
import ImportModal from "./components/ImportModal";
import ConfirmModal from "./components/ConfirmModal";
import { DbCategory, fetchDbCategories } from "@/lib/categories";

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
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // 删除确认
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteBatch, setPendingDeleteBatch] = useState<number[] | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    async function initAdmin() {
      const result = await validateAdminSession();
      if (!result.ok || !mounted) return;

      setUser(result.user);
      const dbCategories = await loadCategories();
      if (!mounted) return;
      applyFilters(1, dbCategories[0]?.id ?? null, "all");

      const handleRefresh = () => applyFilters(currentPage);
      window.addEventListener("adminRefreshGames", handleRefresh);
      cleanup = () => window.removeEventListener("adminRefreshGames", handleRefresh);
    }

    initAdmin();
    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  async function loadCategories() {
    const countedCategories = await fetchDbCategories();
    setCategories(countedCategories);
    if (!selectedCategoryId && countedCategories.length > 0) {
      setSelectedCategoryId(countedCategories[0].id);
      setSelectedSubcategoryId("all");
    } else if (selectedCategoryId) {
      const exists = countedCategories.some((category) => category.id === selectedCategoryId);
      if (!exists && countedCategories.length > 0) {
        setSelectedCategoryId(countedCategories[0].id);
        setSelectedSubcategoryId("all");
      }
    }
    return countedCategories;
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

      const pinPriorityMap = await fetchPinPriorityMap();
      if ((window as any).__reqId !== reqId) return;

      if (curSort === "default") {
        // Get total count first, then get page data
        const countQuery = applyGameFilters(
          supabase.from("games").select("id", { count: "exact" }),
        );
        const { count: totalCount } = await countQuery;

        const gamesQuery = applyGameFilters(
          supabase.from("games").select("*"),
        );
        const { data, error } = await gamesQuery
          .order("pinned", { ascending: false, nullsFirst: false })
          .order("id", { ascending: true })
          .range(from, to);
        if ((window as any).__reqId !== reqId) return;
        if (error) throw error;

        setFilteredGames(
          ((data || []) as Game[])
            .sort((a, b) => {
              if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
              if (a.pinned && b.pinned) {
                const pinOrderDiff =
                  getPinPriority(a, pinPriorityMap) -
                  getPinPriority(b, pinPriorityMap);
                if (pinOrderDiff !== 0) return pinOrderDiff;
              }
              return a.id - b.id;
            })
            .map((game) => ({
              ...game,
              pinPriority: game.pinned ? pinPriorityMap[game.id] ?? 0 : null,
            })),
        );
        setTotalCount(totalCount || 0);
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
    const dbCategories = categories.length > 0 ? categories : await fetchDbCategories();
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
      await adminDeleteGames([id]);
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
      await adminDeleteGames(ids);
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

      <div className="admin-container" style={{ maxWidth: 1200, margin: "20px auto", padding: "0 20px", background: "transparent" }}>
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
