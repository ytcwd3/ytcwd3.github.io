"use client";

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
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  useEffect(() => {
    checkAuth();
    applyFilters(1);
    loadAllMeta();
  }, []);

  function checkAuth() {
    const loggedIn = localStorage.getItem("admin_logged_in");
    if (!loggedIn) {
      window.location.href = "/admin/login";
      return;
    }
    setUser(JSON.parse(localStorage.getItem("admin_user") || "{}"));
  }

  async function applyFilters(page: number = 1, cat?: string, sub?: string) {
    const curCat = cat !== undefined ? cat : selectedCategory;
    const curSub = sub !== undefined ? sub : selectedSubcategory;
    const curKeyword = searchKeyword;
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

  function openEditModal(game: Game) {
    setEditingGame(game);
    setShowEditModal(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除这条数据吗？")) return;
    try {
      const { error } = await supabase.from("games").delete().eq("id", id);
      if (error) throw error;
      alert("删除成功");
      applyFilters(currentPage);
    } catch (error: any) {
      alert("删除失败: " + error.message);
    }
  }

  function openImportModal() {
    setShowImportModal(true);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <>
      <AdminHeader user={user} />

      <div style={{ maxWidth: 1200, margin: "20px auto", padding: "0 20px" }}>
        <StatsCards
          selectedCategory={selectedCategory}
          categoryCounts={categoryCounts}
          onCategoryClick={handleCategoryClick}
        />

        <SubcategoryFilter
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          categoryCounts={categoryCounts}
          subcatCounts={subcatCounts}
          onSubcategoryClick={handleSubcategoryClick}
        />

        <Toolbar
          searchKeyword={searchKeyword}
          onSearchChange={setSearchKeyword}
          onSearch={handleSearch}
          onOpenImport={openImportModal}
          onOpenAdd={openAddModal}
          onRefresh={handleRefresh}
        />

        <GameTable
          games={filteredGames}
          loading={loading}
          currentPage={currentPage}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onEdit={openEditModal}
          onDelete={handleDelete}
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
            applyFilters(1);
          }}
        />
      )}
    </>
  );
}
