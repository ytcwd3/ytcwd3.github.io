"use client";

import { useState, useEffect } from "react";
import { supabase, Game } from "@/lib/supabase";
import SearchResults from "./components/SearchResults";
import GuestbookPopup from "./components/Popups/GuestbookPopup";
import EmulatorPopup from "./components/Popups/EmulatorPopup";
import FanGroupPopup from "./components/Popups/FanGroupPopup";
import RewardPopup from "./components/Popups/RewardPopup";
import UpdateRecordPopup from "./components/Popups/UpdateRecordPopup";
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
        "J2ME（诺基亚时代Java）",
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
        "网游单击",
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
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  // 加载数据 - 不再预加载所有数据
  useEffect(() => {
    // 页面加载时不需要预加载所有数据
  }, []);

  function handleSearch() {
    // 如果已有筛选结果，只做关键词搜索
    if (selectedTag && filteredGames.length > 0 && searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      const result = filteredGames.filter((g) =>
        g.name.toLowerCase().includes(keyword),
      );
      setFilteredGames(result);
    } else if (searchKeyword.trim() && !selectedTag) {
      // 如果没有选分类但有关键词，从数据库搜索
      setLoading(true);
      setCurrentPage(1);

      supabase
        .from("games")
        .select("*")
        .ilike("name", `%${searchKeyword}%`) // 使用ilike进行模糊搜索
        .range(0, PAGE_SIZE - 1) // 只加载前10条
        .order("id", { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            setFilteredGames([]);
          } else {
            setFilteredGames(data || []);
            setHasMore(data?.length === PAGE_SIZE);
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

    // 构建查询 - 只加载前10条
    let query = supabase
      .from("games")
      .select("*")
      .contains("subcategory", [value]) // 使用contains查询subcategory数组
      .range(0, PAGE_SIZE - 1); // 分页：每页10条

    // 如果有关键词，同时搜索名称
    if (searchKeyword.trim()) {
      query = query.ilike("name", `%${searchKeyword}%`);
    }

    query.order("id", { ascending: true }).then(({ data, error }) => {
      if (error) {
        setFilteredGames([]);
      } else {
        setFilteredGames(data || []);
        setHasMore(data?.length === PAGE_SIZE);
      }
      setLoading(false);
    });
  }

  // 加载更多数据
  function loadMore() {
    if (loading || !hasMore) return;

    setLoading(true);
    const nextPage = currentPage + 1;
    const from = (nextPage - 1) * PAGE_SIZE;
    const to = nextPage * PAGE_SIZE - 1;

    // 构建查询
    let query = supabase
      .from("games")
      .select("*")
      .contains("subcategory", selectedTag ? [selectedTag.value] : [])
      .range(from, to);

    // 如果有关键词
    if (searchKeyword.trim()) {
      query = query.ilike("name", `%${searchKeyword}%`);
    }

    query.order("id", { ascending: true }).then(({ data, error }) => {
      if (error) {
        // 加载失败，忽略
      } else {
        setFilteredGames((prev) => [...prev, ...(data || [])]);
        setCurrentPage(nextPage);
        setHasMore(data?.length === PAGE_SIZE);
      }
      setLoading(false);
    });
  }

  function clearTag() {
    setSelectedTag(null);
    setShowResult(false);
    setFilteredGames([]);
    setCurrentPage(1);
    setHasMore(true);
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
        <div className="selected-tag-hint" onClick={clearTag}>
          已选分类：
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
                }}
              >
                {selectedTag.category} - {selectedTag.value}
              </span>
            ) : (
              <span id="selectedTagText">无</span>
            )}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="search-box">
          <input
            type="text"
            id="gameSearch"
            placeholder="推荐先选择对应平台，再输入游戏名称搜索..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button id="searchBtn" onClick={handleSearch}>
            搜索
          </button>
        </div>

        {/* 提示 */}
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

        {/* 结果区域 */}
        <div style={{ display: showResult ? "block" : "none" }}>
          <SearchResults
            games={filteredGames}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onClose={() => setShowResult(false)}
            onOpenQrModal={openBigQrcode}
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
            hasData={filteredGames.length > 0}
          />
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
