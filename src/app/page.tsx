"use client";

import { useState, useEffect } from "react";
import { supabase, Game } from "@/lib/supabase";
import SearchResults from "./components/SearchResults";
import GuestbookPopup from "./components/Popups/GuestbookPopup";
import EmulatorPopup from "./components/Popups/EmulatorPopup";
import FanGroupPopup from "./components/Popups/FanGroupPopup";
import RewardPopup from "./components/Popups/RewardPopup";
import UpdateRecordPopup from "./components/Popups/UpdateRecordPopup";
import ToolPatchPopup from "./components/Popups/ToolPatchPopup";
import HelpCenterPopup from "./components/Popups/HelpCenterPopup";
import QrCodeModal from "./components/QrCode/QrCodeModal";

// 子分类数据
const CATEGORIES: Record<string, { name: string; tags: string[] }[]> = {
  任天堂: [
    {
      name: "任天堂",
      tags: [
        "NS",
        "NS乙女",
        "GBA",
        "NDS",
        "3DS",
        "GB",
        "GBC",
        "Wii",
        "NGC",
        "Wii U",
        "FC",
        "N64",
        "SFC",
      ],
    },
  ],
  索尼: [
    { name: "索尼", tags: ["PS2", "PS3", "PS1", "PSP", "PS Vita", "PS4"] },
  ],
  其他平台: [
    {
      name: "其他平台",
      tags: [
        "MD",
        "SS",
        "DC",
        "Xbox",
        "街机",
        "Neogeo",
        "DOS",
        "文曲星",
        "步步高电子词典",
        "JAVA",
        "J2ME（诺基亚时代java）",
      ],
    },
  ],
  PC及安卓: [
    {
      name: "PC及安卓",
      tags: [
        "必备软件",
        "各种合集",
        "横版过关",
        "平台跳跃",
        "战棋策略",
        "RPG",
        "双人",
        "射击",
        "动作",
        "经营",
        "魂类",
        "竞速运动",
        "潜行",
        "解谜",
        "格斗无双",
        "恐怖",
        "不正经",
        "小游戏",
        "修改器金手指",
        "互动影游",
        "网游单机",
        "安卓",
      ],
    },
  ],
};

const MAIN_CATEGORIES = ["任天堂", "索尼", "其他平台", "PC及安卓"];

export default function HomePage() {
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

  // 分页相关
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  // 排序相关
  const [sortBy, setSortBy] = useState<"id" | "updatedate" | "hot">("id");

  // 加载数据 - 不再预加载所有数据
  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
  }, []);

  function handleSearch() {
    const keyword = searchKeyword.trim();
    if (!keyword) return;

    setLoading(true);
    setShowResult(true);
    setCurrentPage(1);

    const from = 0;
    const to = PAGE_SIZE - 1;

    // 根据排序构建查询
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildQuery = (baseQuery: any) => {
      if (sortBy === "id") {
        return baseQuery.order("pinned", { ascending: false }).order("id", { ascending: true });
      } else if (sortBy === "updatedate") {
        return baseQuery.order("pinned", { ascending: false }).order("updatedate", { ascending: false }).order("id", { ascending: false });
      } else {
        // hot: 用 ID 降序替代
        return baseQuery.order("pinned", { ascending: false }).order("id", { ascending: false });
      }
    };

    // 如果有选中子标签，在该子标签范围内搜索
    if (selectedTag) {
      buildQuery(
        supabase
          .from("games")
          .select("*", { count: "exact" })
          .contains("subcategory", [selectedTag.value])
          .ilike("name", `%${keyword}%`)
          .range(from, to)
      ).then(({ data, error, count }) => {
        if (error) {
          setFilteredGames([]);
        } else {
          setFilteredGames(data || []);
          setTotalCount(count || 0);
        }
        setLoading(false);
      });
    } else {
      // 全局搜索
      buildQuery(
        supabase
          .from("games")
          .select("*", { count: "exact" })
          .ilike("name", `%${keyword}%`)
          .range(from, to)
      ).then(({ data, error, count }) => {
        if (error) {
          setFilteredGames([]);
        } else {
          setFilteredGames(data || []);
          setTotalCount(count || 0);
        }
        setLoading(false);
      });
    }
  }

  function selectTag(category: string, value: string) {
    setSelectedTag({ category, value });
    setSelectedCategory(category);
    setShowPanel(null);
    setCurrentPage(1); // 重置页码

    // 直接从数据库查询该子类的数据
    setLoading(true);
    setShowResult(true);

    const from = 0;
    const to = PAGE_SIZE - 1;

    // 根据排序构建查询
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildQuery = (baseQuery: any) => {
      if (sortBy === "id") {
        return baseQuery.order("pinned", { ascending: false }).order("id", { ascending: true });
      } else if (sortBy === "updatedate") {
        return baseQuery.order("pinned", { ascending: false }).order("updatedate", { ascending: false }).order("id", { ascending: false });
      } else {
        return baseQuery.order("pinned", { ascending: false }).order("id", { ascending: false });
      }
    };

    // 构建基础查询
    let baseQuery = supabase
      .from("games")
      .select("*", { count: "exact" })
      .contains("subcategory", [value])
      .range(from, to);

    // 如果有关键词，同时搜索名称
    if (searchKeyword.trim()) {
      baseQuery = baseQuery.ilike("name", `%${searchKeyword}%`);
    }

    buildQuery(baseQuery).then(({ data, error, count }) => {
      if (error) {
        setFilteredGames([]);
      } else {
        setFilteredGames(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    });
  }

  // 翻页加载
  function loadPage(page: number) {
    if (loading) return;

    setLoading(true);
    setCurrentPage(page);

    const from = (page - 1) * PAGE_SIZE;
    const to = page * PAGE_SIZE - 1;

    // 根据排序构建查询
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildQuery = (baseQuery: any) => {
      if (sortBy === "id") {
        return baseQuery.order("pinned", { ascending: false }).order("id", { ascending: true });
      } else if (sortBy === "updatedate") {
        return baseQuery.order("pinned", { ascending: false }).order("updatedate", { ascending: false }).order("id", { ascending: false });
      } else {
        return baseQuery.order("pinned", { ascending: false }).order("id", { ascending: false });
      }
    };

    // 构建基础查询
    let baseQuery = supabase
      .from("games")
      .select("*", { count: "exact" })
      .range(from, to);

    if (selectedTag) {
      baseQuery = baseQuery.contains("subcategory", [selectedTag.value]);
    }
    if (searchKeyword.trim()) {
      baseQuery = baseQuery.ilike("name", `%${searchKeyword}%`);
    }

    buildQuery(baseQuery).then(({ data, error, count }) => {
      if (error) {
        setFilteredGames([]);
      } else {
        setFilteredGames(data || []);
        setTotalCount(count || 0);
      }
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
  function handleSortChange(sort: "id" | "updatedate" | "hot") {
    setSortBy(sort);
    setCurrentPage(1);
    if (showResult) {
      const from = 0;
      const to = PAGE_SIZE - 1;
      setLoading(true);

      const buildQuery = (baseQuery: any) => {
        if (sort === "id") {
          return baseQuery.order("pinned", { ascending: false }).order("id", { ascending: true });
        } else if (sort === "updatedate") {
          return baseQuery.order("pinned", { ascending: false }).order("updatedate", { ascending: false }).order("id", { ascending: false });
        } else {
          return baseQuery.order("pinned", { ascending: false }).order("id", { ascending: false });
        }
      };

      let baseQuery = supabase
        .from("games")
        .select("*", { count: "exact" })
        .range(from, to);

      if (selectedTag) {
        baseQuery = baseQuery.contains("subcategory", [selectedTag.value]);
      }
      if (searchKeyword.trim()) {
        baseQuery = baseQuery.ilike("name", `%${searchKeyword}%`);
      }

      buildQuery(baseQuery).then(({ data, error, count }) => {
        if (error) {
          setFilteredGames([]);
        } else {
          setFilteredGames(data || []);
          setTotalCount(count || 0);
        }
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
      <div
        className="container"
        style={{
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        <h1 className="title">单游仓鼠-主机掌机+PC一键检索</h1>
        <p className="sub-title">缺游戏，资源有问题-B站，QQ群联系均可！</p>

        {/* 母标签栏 */}
        <div className="tab-header">
          {MAIN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`tab-btn ${selectedCategory === cat ? "active" : ""}`}
              data-category={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setShowPanel(showPanel === cat ? null : cat);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 标签面板 */}
        <div className="tab-panel-wrapper">
          {MAIN_CATEGORIES.map((cat) => (
            <div
              key={cat}
              className={`tab-panel ${showPanel === cat ? "show" : ""}`}
              id={`panel-${cat}`}
            >
              {CATEGORIES[cat]?.[0]?.tags.map((tag) => (
                <div
                  key={tag}
                  className={`tag-item ${selectedTag?.value === tag ? "active" : ""}`}
                  data-category={cat}
                  onClick={() => selectTag(cat, tag)}
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
                  color:
                    selectedTag.category === "任天堂"
                      ? "var(--color-nintendo)"
                      : selectedTag.category === "索尼"
                        ? "var(--color-sony)"
                        : selectedTag.category === "PC及安卓"
                          ? "var(--color-pc-android)"
                          : "var(--color-other)",
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
              <span id="selectedTagText">无</span>
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

        {/* 底部按钮 */}
        <div className="footer-popup-container">
          <button className="popup-btn" onClick={() => togglePopup("popup1")}>
            留言板
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup2")}>
            模拟器大全
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup3")}>
            粉丝群
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup4")}>
            打赏捐赠
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup6")}>
            工具补丁
          </button>
          <button className="popup-btn" onClick={() => togglePopup("popup7")}>
            帮助中心
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

      {/* 留言板弹窗 */}
      {showPopups["popup1"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup1")}
        >
          <GuestbookPopup onClose={() => togglePopup("popup1")} />
        </div>
      )}

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
          <UpdateRecordPopup
            onClose={() => togglePopup("popup5")}
          />
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
