"use client";

import { useState, useEffect, useRef } from "react";
import { supabase, Game, Guestbook } from "@/lib/supabase";

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
  const PAGE_SIZE = 10; // 每页加载10条

  // 留言板相关
  const [guestbookName, setGuestbookName] = useState("");
  const [guestbookMessage, setGuestbookMessage] = useState("");
  const [guestbookSubmitting, setGuestbookSubmitting] = useState(false);
  const [guestbookSuccess, setGuestbookSuccess] = useState(false);

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
            console.error("搜索失败:", error);
            setFilteredGames([]);
          } else {
            console.log("搜索到", data?.length, "条记录");
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
        console.error("查询失败:", error);
        setFilteredGames([]);
      } else {
        console.log("查询到", data?.length, "条记录");
        setFilteredGames(data || []);
        setHasMore(data?.length === PAGE_SIZE); // 如果返回10条，说明还有更多
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
        console.error("加载更多失败:", error);
      } else {
        console.log("加载更多:", data?.length, "条");
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

  // 提交留言
  async function handleGuestbookSubmit() {
    setGuestbookSubmitting(true);
    setGuestbookSuccess(false);

    try {
      const { error } = await supabase.from("guestbook").insert([
        {
          name: guestbookName,
          message: guestbookMessage,
        },
      ]);

      if (error) throw error;

      setGuestbookSuccess(true);
      setGuestbookName("");
      setGuestbookMessage("");

      // 3秒后隐藏成功提示
      setTimeout(() => {
        setGuestbookSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("提交留言失败:", error);
      alert("提交失败，请重试");
    } finally {
      setGuestbookSubmitting(false);
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

  function generateQRCode(elementId: string, link: string) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = "";
    if (!link || link === "#" || !link.trim()) {
      el.innerHTML =
        '<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">无链接</div>';
      return;
    }

    // 简单实现 - 显示链接文本
    el.innerHTML = `<div style="width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#666;padding:5px;word-break:break-all;text-align:center;">${link.substring(0, 15)}...</div>`;
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
        <div
          className="result-box"
          id="resultBox"
          style={{ display: showResult ? "block" : "none" }}
        >
          <div className="result-header">
            搜索结果
            <button className="close-btn" onClick={() => setShowResult(false)}>
              ×
            </button>
          </div>
          <div
            className="loading"
            id="loading"
            style={{ display: loading ? "flex" : "none" }}
          >
            正在检索资源...
          </div>
          <div id="resultContent">
            {filteredGames.map((game, idx) => (
              <div
                key={game.id}
                className="result-item"
                data-category={game.category?.[0]}
              >
                <div className="qrcode-area">
                  <div
                    className="qrcode-box"
                    style={{
                      width: 80,
                      height: 80,
                      textAlign: "center",
                      background: "white",
                      padding: 6,
                      borderRadius: 6,
                      border: "1px solid var(--border-light)",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      game.quarkpan &&
                      openBigQrcode(game.quarkpan, `${game.name} 夸克`)
                    }
                  >
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 5,
                        fontWeight: 600,
                      }}
                    >
                      夸克
                    </p>
                  </div>
                  <div
                    className="qrcode-box"
                    style={{
                      width: 80,
                      height: 80,
                      textAlign: "center",
                      background: "white",
                      padding: 6,
                      borderRadius: 6,
                      border: "1px solid var(--border-light)",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      game.baidupan &&
                      openBigQrcode(game.baidupan, `${game.name} 百度`)
                    }
                  >
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 5,
                        fontWeight: 600,
                      }}
                    >
                      百度
                    </p>
                  </div>
                  <div
                    className="qrcode-box"
                    style={{
                      width: 80,
                      height: 80,
                      textAlign: "center",
                      background: "white",
                      padding: 6,
                      borderRadius: 6,
                      border: "1px solid var(--border-light)",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      game.thunderpan &&
                      openBigQrcode(game.thunderpan, `${game.name} 迅雷`)
                    }
                  >
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 5,
                        fontWeight: 600,
                      }}
                    >
                      迅雷
                    </p>
                  </div>
                </div>
                <div className="result-content-wrap">
                  <span
                    style={{
                      color: ["#d857e8", "#f06292", "#9333ea"][idx % 3],
                      fontWeight: "bold",
                    }}
                  >
                    {idx + 1}. {game.name}
                  </span>
                  <span style={{ color: "#666" }}>
                    （{game.category?.[0] || ""} - {game.subcategory?.[0] || ""}
                    ）
                  </span>
                  <div className="code-row">
                    <div className="code-item">
                      <label style={{ color: "#999" }}>提取码：</label>
                      <span>{game.code || "无"}</span>
                    </div>
                    {game.unzipcode && game.unzipcode !== "无" && (
                      <div className="code-item">
                        <label style={{ color: "#999" }}>解压密码：</label>
                        <span>{game.unzipcode}</span>
                      </div>
                    )}
                  </div>
                  <div className="pan-links">
                    <div className="pan-link-item">
                      <label style={{ color: "#999" }}>夸克：</label>
                      <a
                        href={game.quarkpan}
                        target="_blank"
                        style={{ color: "#0078d7" }}
                      >
                        {game.quarkpan || "无"}
                      </a>
                    </div>
                    <div className="pan-link-item">
                      <label style={{ color: "#999" }}>百度：</label>
                      <a
                        href={game.baidupan}
                        target="_blank"
                        style={{ color: "#0078d7" }}
                      >
                        {game.baidupan || "无"}
                      </a>
                    </div>
                    {game.thunderpan && (
                      <div className="pan-link-item">
                        <label style={{ color: "#999" }}>迅雷：</label>
                        <a
                          href={game.thunderpan}
                          target="_blank"
                          style={{ color: "#0078d7" }}
                        >
                          {game.thunderpan}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredGames.length === 0 && !loading && (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-text">未找到相关资源</div>
              </div>
            )}

            {/* 加载更多按钮 */}
            {hasMore && filteredGames.length > 0 && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <button
                  onClick={loadMore}
                  disabled={loading}
                  style={{
                    padding: "10px 30px",
                    fontSize: "16px",
                    backgroundColor: "var(--primary-color, #0078d7)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? "加载中..." : "加载更多"}
                </button>
                <div
                  style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}
                >
                  已显示 {filteredGames.length} 条
                </div>
              </div>
            )}
          </div>
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
          <div
            className="popup-content"
            style={{ maxWidth: "600px", maxHeight: "80vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="close-btn" onClick={() => togglePopup("popup1")}>
              &times;
            </span>
            <h3 className="popup-title">留言板</h3>

            {/* 留言表单 */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleGuestbookSubmit();
              }}
              style={{ marginBottom: "20px" }}
            >
              <div
                style={{ marginBottom: "12px" }}
              >
                <input
                  type="text"
                  value={guestbookName}
                  onChange={(e) => setGuestbookName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid var(--border-light)",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                  placeholder="名称"
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <textarea
                  value={guestbookMessage}
                  onChange={(e) => setGuestbookMessage(e.target.value)}
                  required
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid var(--border-light)",
                    borderRadius: "4px",
                    fontSize: "14px",
                    resize: "vertical",
                  }}
                  placeholder="留言内容"
                />
              </div>

              <button
                type="submit"
                disabled={guestbookSubmitting}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#0078d7",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "16px",
                  cursor: guestbookSubmitting ? "not-allowed" : "pointer",
                  opacity: guestbookSubmitting ? 0.6 : 1,
                }}
              >
                {guestbookSubmitting ? "提交中..." : "提交留言"}
              </button>

              {guestbookSuccess && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#d4edda",
                    color: "#155724",
                    borderRadius: "4px",
                    textAlign: "center",
                  }}
                >
                  ✓ 留言提交成功！
                </div>
              )}
            </form>

            {/* 留言列表 */}
            <GuestbookList />
          </div>
        </div>
      )}

      {/* 模拟器弹窗 */}
      {showPopups["popup2"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup2")}
        >
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn" onClick={() => togglePopup("popup2")}>
              &times;
            </span>
            <h3 className="popup-title">模拟器大全</h3>
            <div className="popup-text">
              <p>1. 夸克：https://pan.quark.cn/s/03d883257f8f/</p>
              <p>
                2.
                百度：https://pan.baidu.com/s/1sXOTOkot8gR78h4Aj7NCDg?pwd=aty3/
              </p>
              <p>
                3.
                迅雷：https://pan.xunlei.com/s/VOWZBcb3fFbdEb52GbNxkpFFA1?pwd=kjcq#/
              </p>
              <p>4. RetroArch.v1.21.0：https://pan.quark.cn/s/31337e2949a0/</p>
            </div>
          </div>
        </div>
      )}

      {/* 粉丝群弹窗 */}
      {showPopups["popup3"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup3")}
        >
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn" onClick={() => togglePopup("popup3")}>
              &times;
            </span>
            <h3 className="popup-title">粉丝交流群</h3>
            <div className="popup-text">
              <p>QQ群：745804936 进潜水群后，想聊天私信群主申请进入主群即可</p>
            </div>
          </div>
        </div>
      )}

      {/* 打赏弹窗 */}
      {showPopups["popup4"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup4")}
        >
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn" onClick={() => togglePopup("popup4")}>
              &times;
            </span>
            <h3 className="popup-title">打赏捐赠</h3>
            <div className="popup-text">
              <p style={{ textAlign: "center", marginBottom: 0 }}>
                感谢您的支持！
              </p>
              <div className="reward-qrcode">
                <div className="qrcode-item">
                  <img
                    className="reward-qrcode-img"
                    src="https://pic1.zhimg.com/100/v2-4cdf5265a1d612f1acb8cd9e6baa6c26_r.jpg"
                    alt="微信"
                    width={180}
                    onClick={() =>
                      openBigQrcode(
                        "https://pic1.zhimg.com/100/v2-4cdf5265a1d612f1acb8cd9e6baa6c26_r.jpg",
                        "微信",
                      )
                    }
                  />
                </div>
                <div className="qrcode-item">
                  <img
                    className="reward-qrcode-img"
                    src="https://pic3.zhimg.com/100/v2-10e23bad10b7782f15bfa7bac9b8079e_r.jpg"
                    alt="支付宝"
                    width={180}
                    onClick={() =>
                      openBigQrcode(
                        "https://pic3.zhimg.com/100/v2-10e23bad10b7782f15bfa7bac9b8079e_r.jpg",
                        "支付宝",
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 更新记录弹窗 */}
      {showPopups["popup5"] && (
        <div
          className="popup-mask"
          style={{ display: "flex" }}
          onClick={() => togglePopup("popup5")}
        >
          <div
            className="popup-content update-record-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="close-btn" onClick={() => togglePopup("popup5")}>
              &times;
            </span>
            <h3 className="popup-title">资源更新一览表</h3>
            <div className="popup-text">
              <div className="update-records-container">
                {filteredGames.length > 0 ? (
                  <div className="update-record-date">📅 最新更新</div>
                ) : (
                  <div className="update-record-empty">暂无更新记录</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 二维码放大弹窗 */}
      {showQrModal && (
        <div
          className="qrcode-modal"
          style={{ display: "flex" }}
          onClick={() => setShowQrModal(false)}
        >
          <div className="qrcode-modal-mask" />
          <div
            className="qrcode-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="qrcode-modal-close"
              onClick={() => setShowQrModal(false)}
            >
              ×
            </button>
            <div className="qrcode-modal-title">{qrModalTitle}</div>
            <div className="qrcode-big-container">
              <img
                src={qrModalSrc}
                alt={qrModalTitle}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            </div>
            <p className="qrcode-modal-tip">点击二维码外区域关闭</p>
          </div>
        </div>
      )}
    </>
  );
}

// 留言列表组件
function GuestbookList() {
  const [guestbooks, setGuestbooks] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    // 检测管理员登录状态
    const adminLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
    setIsAdmin(adminLoggedIn);

    loadGuestbooks();
  }, []);

  async function loadGuestbooks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("guestbook")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100); // 只显示最近100条

      if (error) throw error;
      setGuestbooks(data || []);
    } catch (error) {
      console.error("加载留言失败:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(parentId: number) {
    if (!replyContent.trim()) {
      alert("请输入回复内容");
      return;
    }

    setReplySubmitting(true);
    try {
      const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

      const { error } = await supabase
        .from("guestbook")
        .insert([
          {
            name: adminUser.github || adminUser.email || "管理员",
            message: replyContent,
            parent_id: parentId,
            admin_id: adminUser.github || adminUser.email,
            is_reply: true
          }
        ]);

      if (error) throw error;

      setReplyContent("");
      setReplyingTo(null);
      loadGuestbooks(); // 重新加载留言列表
      alert("回复成功！");
    } catch (error) {
      console.error("回复失败:", error);
      alert("回复失败，请重试");
    } finally {
      setReplySubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除这条留言吗？")) return;

    try {
      const { error } = await supabase
        .from("guestbook")
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadGuestbooks(); // 重新加载留言列表
      alert("删除成功！");
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败，请重试");
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>加载留言中...</div>
    );
  }

  // 分离主留言和回复
  const mainMessages = guestbooks.filter(g => !g.is_reply && !g.parent_id);
  const replies = guestbooks.filter(g => g.is_reply || g.parent_id);

  // 按parent_id分组回复
  const repliesByParent = replies.reduce((acc, reply) => {
    const parentId = reply.parent_id;
    if (!acc[parentId]) {
      acc[parentId] = [];
    }
    acc[parentId].push(reply);
    return acc;
  }, {} as Record<number, Guestbook[]>);

  // 计算总留言数（不含回复）
  const mainMessageCount = mainMessages.length;

  if (mainMessageCount === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
        暂无留言
      </div>
    );
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <h4
        style={{
          marginBottom: "12px",
          borderBottom: "2px solid #0078d7",
          paddingBottom: "8px",
        }}
      >
        留言列表（共 {mainMessageCount} 条）
      </h4>
      <div style={{ maxHeight: "500px", overflowY: "auto" }}>
        {mainMessages.map((item) => (
          <div key={item.id} style={{ marginBottom: "15px" }}>
            {/* 主留言 */}
            <div
              style={{
                padding: "12px",
                backgroundColor: "#f5f5f5",
                borderRadius: "6px",
                borderLeft: "3px solid #0078d7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <strong style={{ color: "#333" }}>{item.name}</strong>
                <span style={{ fontSize: "12px", color: "#999" }}>
                  {new Date(item.created_at).toLocaleString("zh-CN")}
                </span>
              </div>
              <div style={{ color: "#666", fontSize: "14px", lineHeight: "1.5", marginBottom: "8px" }}>
                {item.message}
              </div>

              {/* 管理员操作按钮 */}
              {isAdmin && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button
                    onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#0078d7",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    {replyingTo === item.id ? "取消回复" : "回复"}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    删除
                  </button>
                </div>
              )}

              {/* 回复表单 */}
              {replyingTo === item.id && (
                <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#e8f0fe", borderRadius: "6px" }}>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="输入管理员回复..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #0078d7",
                      borderRadius: "4px",
                      fontSize: "14px",
                      resize: "vertical",
                      marginBottom: "8px"
                    }}
                  />
                  <button
                    onClick={() => handleReply(item.id)}
                    disabled={replySubmitting}
                    style={{
                      padding: "6px 16px",
                      fontSize: "13px",
                      backgroundColor: "#0078d7",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: replySubmitting ? "not-allowed" : "pointer",
                      opacity: replySubmitting ? 0.6 : 1
                    }}
                  >
                    {replySubmitting ? "提交中..." : "提交回复"}
                  </button>
                </div>
              )}
            </div>

            {/* 回复列表 */}
            {repliesByParent[item.id] && repliesByParent[item.id].length > 0 && (
              <div style={{ marginLeft: "20px", marginTop: "8px" }}>
                {repliesByParent[item.id].map((reply) => (
                  <div
                    key={reply.id}
                    style={{
                      padding: "10px",
                      backgroundColor: "#e8f0fe",
                      borderRadius: "6px",
                      borderLeft: "3px solid #0078d7",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <strong style={{ color: "#0078d7", fontSize: "13px" }}>
                        👑 {reply.name}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#999" }}>
                        {new Date(reply.created_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <div style={{ color: "#555", fontSize: "13px", lineHeight: "1.5" }}>
                      {reply.message}
                    </div>
                    {/* 管理员可以删除回复 */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(reply.id)}
                        style={{
                          marginTop: "6px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          backgroundColor: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer"
                        }}
                      >
                        删除回复
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
