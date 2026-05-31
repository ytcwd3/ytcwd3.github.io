"use client";

import { useState, useEffect } from "react";
import { Game } from "@/lib/games";
import { HomeCategory, fetchHomeCategories } from "@/lib/categories";
import { decryptData } from "@/lib/encrypt";
import SearchResults from "./components/SearchResults";
import GuestbookPopup from "./components/Popups/GuestbookPopup";
import EmulatorPopup from "./components/Popups/EmulatorPopup";
import FanGroupPopup from "./components/Popups/FanGroupPopup";
import RewardPopup from "./components/Popups/RewardPopup";
import UpdateRecordPopup from "./components/Popups/UpdateRecordPopup";
import ToolPatchPopup from "./components/Popups/ToolPatchPopup";
import HelpCenterPopup from "./components/Popups/HelpCenterPopup";
import QrCodeModal from "./components/QrCode/QrCodeModal";
import Mascot from "./components/Mascot";

export default function HomePage() {
  function getPinPriority(
    game: { id: number; pinned?: boolean },
    pinPriorityMap: Record<number, number>,
  ) {
    if (!game.pinned) return Number.MAX_SAFE_INTEGER;
    const raw = pinPriorityMap[game.id];
    return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  }

  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<{
    category: string;
    value: string;
  } | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showPanel, setShowPanel] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalSrc, setQrModalSrc] = useState("");
  const [qrModalTitle, setQrModalTitle] = useState("");
  const [showPopups, setShowPopups] = useState<Record<string, boolean>>({});
  const [homeCategories, setHomeCategories] = useState<HomeCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // 分页相关
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  // 排序相关
  const [sortBy, setSortBy] = useState<"updatedate" | "hot">("updatedate");

  // 加载数据 - 不再预加载所有数据
  useEffect(() => {
    // localStorage.clear(); // Disabled - breaks sessionStorage cache
    // sessionStorage.clear(); // Disabled - breaks categories cache

    setCategoriesLoading(true);
    fetchHomeCategories()
      .then(setHomeCategories)
      .catch(() => setHomeCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  async function fetchGamesPage(
    page: number,
    sort: "updatedate" | "hot",
    tagValue?: string,
    keyword?: string,
  ) {
    // Use encrypted API route instead of direct Supabase query
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("sort", sort);
    if (tagValue) params.set("tag", tagValue);
    if (keyword) params.set("keyword", keyword);
    params.set("pageSize", String(PAGE_SIZE));

    const response = await fetch(`/api/games?${params.toString()}`);

    if (!response.ok) {
      console.error("API error:", response.status);
      return { data: [], count: 0 };
    }

    const encrypted = await response.text();
    const result = decryptData(encrypted);

    if (!result || !result.data) {
      return { data: [], count: 0 };
    }

    const pinPriorityMap = (result.pinPriorityMap || {}) as Record<number, number>;

    // Separate pinned and regular games
    const pinnedGames = (result.data as Game[])
      .filter((g) => g.pinned)
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        if (a.pinned && b.pinned) {
          const pinOrderDiff = getPinPriority(a, pinPriorityMap) - getPinPriority(b, pinPriorityMap);
          if (pinOrderDiff !== 0) return pinOrderDiff;
        }
        return a.id - b.id;
      })
      .map((game) => ({ ...game, pinPriority: game.pinned ? pinPriorityMap[game.id] ?? 0 : null }));

    const regularGames = (result.data as Game[])
      .filter((g) => !g.pinned)
      .map((game) => ({ ...game, pinPriority: null }));

    return {
      data: [...pinnedGames, ...regularGames],
      count: result.count || 0,
    };
  }

  async function loadGames(
    page: number,
    options?: {
      tagValue?: string;
      keyword?: string;
      sort?: "updatedate" | "hot";
    },
  ) {
    const tagValue = options?.tagValue ?? selectedTag?.value;
    const keyword = (options?.keyword ?? searchKeyword).trim();
    const activeSort = options?.sort ?? sortBy;

    return fetchGamesPage(page, activeSort, tagValue, keyword);
  }

  function handleSearch() {
    const keyword = searchKeyword.trim();
    if (!keyword) return;

    setLoading(true);
    setShowResult(true);
    setCurrentPage(1);
    loadGames(1, { keyword })
      .then(({ data, count }) => {
        setFilteredGames(data);
        setTotalCount(count);
      })
      .catch(() => {
        setFilteredGames([]);
        setTotalCount(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function selectTag(category: string, value: string) {
    setSelectedTag({ category, value });
    setSelectedCategory(category);
    setShowPanel(null);
    setCurrentPage(1); // 重置页码

    // 直接从数据库查询该子类的数据
    setLoading(true);
    setShowResult(true);
    loadGames(1, { tagValue: value })
      .then(({ data, count }) => {
        setFilteredGames(data);
        setTotalCount(count);
      })
      .catch(() => {
        setFilteredGames([]);
        setTotalCount(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  // 翻页加载
  function loadPage(page: number) {
    if (loading) return;

    const nextPage = Math.min(
      Math.max(1, page),
      Math.ceil(totalCount / PAGE_SIZE) || 1,
    );
    setLoading(true);
    setCurrentPage(nextPage);

    loadGames(nextPage)
      .then(({ data, count }) => {
        setFilteredGames(data);
        setTotalCount(count);
      })
      .catch(() => {
        setFilteredGames([]);
        setTotalCount(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function clearTag() {
    setSelectedTag(null);
    setShowResult(false);
    setFilteredGames([]);
    setCurrentPage(1);
    setTotalCount(0);
  }

  // 排序切换
  function handleSortChange(sort: "updatedate" | "hot") {
    setSortBy(sort);
    setCurrentPage(1);
    if (showResult) {
      setLoading(true);
      loadGames(1, { sort })
        .then(({ data, count }) => {
          setFilteredGames(data);
          setTotalCount(count);
        })
        .catch(() => {
          setFilteredGames([]);
          setTotalCount(0);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }

  function openBigQrcode(src: string, title: string) {
    setQrModalSrc(src);
    setQrModalTitle(title);
    setShowQrModal(true);
  }

  function togglePopup(id: string) {
    setShowPopups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <>
      <div className="container">
        <div className="brand-title-wrap">
          <img
            className="site-logo"
            src="https://cloudflarecnimg.scdn.io/i/6a1c314ee83c0_1780232526.webp"
            alt="单游仓鼠 Logo"
            width={88}
            height={58}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <h1 className="title">单游仓鼠-主机掌机+PC一键检索</h1>
        </div>
        <p className="sub-title">缺游戏，资源有问题-B站，QQ群联系均可！</p>

        {/* 母标签栏 */}
        <div className="tab-header">
          {categoriesLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 60 + i * 10,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.5)",
                    animation: "pulse 1.5s infinite",
                  }}
                />
              ))}
            </>
          ) : (
            homeCategories.map((category) => (
              <button
                key={category.name}
                className={`tab-btn ${selectedCategory === category.name ? "active" : ""}`}
                data-category={category.name}
                onClick={() => {
                  setSelectedCategory(category.name);
                  setShowPanel(
                    showPanel === category.name ? null : category.name,
                  );
                }}
              >
                {category.name}
              </button>
            ))
          )}
        </div>

        {/* 标签面板 */}
        <div className="tab-panel-wrapper">
          {homeCategories.map((category) => (
            <div
              key={category.name}
              className={`tab-panel ${showPanel === category.name ? "show" : ""}`}
              id={`panel-${category.name}`}
            >
              {category.tags.map((tag, tagIndex) => (
                <div
                  key={`${category.name}-${tag}-${tagIndex}`}
                  className={`tag-item ${selectedTag?.value === tag ? "active" : ""}`}
                  data-category={category.name}
                  onClick={() => selectTag(category.name, tag)}
                >
                  {tag}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 已选分类栏 */}
        <div className="selected-tag-hint">
          <span style={{ color: "var(--text-secondary)" }}>已选分类：</span>
          <div className="selected-tag-wrapper">
            {selectedTag ? (
              <span
                style={{
                  color: "var(--primary-color)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {selectedTag.category} - {selectedTag.value}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearTag();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "var(--text-tertiary)",
                    padding: "0 2px",
                    lineHeight: 1,
                    transition: "color 0.2s",
                    marginLeft: "2px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-tertiary)")
                  }
                >
                  ×
                </button>
              </span>
            ) : (
              <span>暂无</span>
            )}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="search-box">
          <div className="search-input-wrap">
            <input
              type="text"
              id="gameSearch"
              placeholder="推荐先选择平台，再输入游戏名称搜索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            {searchKeyword && (
              <button
                className="search-clear-btn"
                onClick={() => {
                  setSearchKeyword("");
                  setShowResult(false);
                  setFilteredGames([]);
                  setSelectedTag(null);
                  setSelectedCategory(null);
                }}
              >
                ×
              </button>
            )}
          </div>
          <button id="searchBtn" onClick={handleSearch}>
            搜索
          </button>
        </div>
        <div
          style={{
            marginTop: "8px",
            textAlign: "center",
            color: "#7b2cbf",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          模拟器固件金手指等以及没搜到的英文游戏。可以选择对应平台在置顶词条里查看
        </div>

        {/* 提示 - 有数据时隐藏 */}
        {filteredGames.length === 0 && showResult && !loading && (
          <div
            style={{
              textAlign: "center",
              color: "red",
              fontSize: "15px",
              marginTop: "6px",
            }}
          >
            未搜到的资源，选对应平台后弹出该平台所有资源！如外文和改版游戏+模拟器固件密钥等
          </div>
        )}

        {/* 结果区域 */}
        <div style={{ display: showResult ? "block" : "none" }}>
          <SearchResults
            games={filteredGames}
            homeCategories={homeCategories}
            loading={loading}
            currentPage={currentPage}
            totalCount={totalCount}
            totalPages={Math.ceil(totalCount / PAGE_SIZE) || 1}
            onPageChange={loadPage}
            onClose={() => setShowResult(false)}
            onOpenQrModal={openBigQrcode}
            sortBy={sortBy}
            onSortChange={handleSortChange}
          />
        </div>

        <Mascot />

        {/* 底部按钮 */}
        <div className="footer-popup-container">
          <button className="popup-btn" onClick={() => togglePopup("popup2")}>
            模拟器大全
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup3")}>
            粉丝群
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup6")}>
            工具补丁
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup7")}>
            帮助中心
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup4")}>
            打赏捐赠
          </button>
        </div>

        <div className="update-record-btn-container">
          <button
            className="popup-btn"
            data-target="popup5"
            onClick={() => togglePopup("popup5")}
          >
            资源更新记录
          </button>
        </div>

        <GuestbookPopup embedded />

        {/* 页脚 */}
        <div className="footer">
          <p>
            © 2026 单游仓鼠搜索站 - 仅供学习交流使用 |{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert(
                  "免责声明：本站资源仅用于学习交流，请勿用于商业用途，如有侵权请联系删除",
                );
              }}
            >
              免责声明
            </a>
          </p>
        </div>
      </div>

      {/* 模拟器弹窗 */}
      {showPopups["popup2"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup2")}
        >
          <EmulatorPopup onClose={() => togglePopup("popup2")} />
        </div>
      )}

      {/* 粉丝群弹窗 */}
      {showPopups["popup3"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup3")}
        >
          <FanGroupPopup onClose={() => togglePopup("popup3")} />
        </div>
      )}

      {/* 打赏弹窗 */}
      {showPopups["popup4"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup4")}
        >
          <RewardPopup
            onClose={() => togglePopup("popup4")}
            onOpenQrModal={openBigQrcode}
          />
        </div>
      )}

      {/* 更新记录弹窗 */}
      {showPopups["popup5"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup5")}
        >
          <UpdateRecordPopup onClose={() => togglePopup("popup5")} />
        </div>
      )}

      {/* 工具补丁弹窗 */}
      {showPopups["popup6"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup6")}
        >
          <ToolPatchPopup onClose={() => togglePopup("popup6")} />
        </div>
      )}

      {/* 帮助中心弹窗 */}
      {showPopups["popup7"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup7")}
        >
          <HelpCenterPopup onClose={() => togglePopup("popup7")} />
        </div>
      )}

      {/* 二维码放大弹窗 */}
      {showQrModal && (
        <QrCodeModal
          src={qrModalSrc}
          title={qrModalTitle}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </>
  );
}
