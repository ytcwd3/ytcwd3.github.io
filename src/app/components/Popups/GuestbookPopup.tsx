"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Guestbook } from "@/lib/guestbook";

interface GuestbookPopupProps {
  onClose?: () => void;
  embedded?: boolean;
}

const ADMIN_GITHUB_USERS = ["anyebojue", "ytcwd3"];

function isAllowedAdminId(adminId?: string) {
  return !!adminId && ADMIN_GITHUB_USERS.includes(adminId);
}

function getAdminDisplayName(adminId?: string) {
  return isAllowedAdminId(adminId) ? `管理员(${adminId})` : null;
}

async function getCurrentAdminUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || session.user.app_metadata?.provider !== "github") {
    return null;
  }

  const githubUsername =
    session.user.user_metadata?.user_name ||
    session.user.user_metadata?.preferred_username;

  if (!isAllowedAdminId(githubUsername)) {
    return null;
  }

  return {
    email: session.user.email,
    github: githubUsername,
  };
}

export default function GuestbookPopup({
  onClose,
  embedded = false,
}: GuestbookPopupProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [guestbooks, setGuestbooks] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(!embedded);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<number[]>([]);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(!embedded);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    async function checkAdminStatus() {
      const cachedLoggedIn = localStorage.getItem("admin_logged_in") === "true";
      const cachedUser = JSON.parse(localStorage.getItem("admin_user") || "{}");
      if (cachedLoggedIn && isAllowedAdminId(cachedUser.github)) {
        setIsAdmin(true);
        return;
      }

      const adminUser = await getCurrentAdminUser();
      if (adminUser?.github) {
        localStorage.setItem("admin_logged_in", "true");
        localStorage.setItem("admin_user", JSON.stringify(adminUser));
        setIsAdmin(true);
        return;
      }

      setIsAdmin(false);
    }
    checkAdminStatus();
    const handleStorage = () => {
      void checkAdminStatus();
    };
    window.addEventListener("storage", handleStorage);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkAdminStatus();
    });
    if (!embedded) {
      loadGuestbooks(1, false);
    }
    return () => {
      window.removeEventListener("storage", handleStorage);
      subscription.unsubscribe();
    };
  }, [embedded]);

  // Auto-load more when scrolling to bottom using Intersection Observer
  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;

    // Create a sentinel element at the bottom
    const sentinel = document.createElement("div");
    sentinel.id = "guestbook-sentinel";
    sentinel.style.height = "1px";
    container.appendChild(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loadingMore && !loading && hasMore) {
          loadGuestbooks(currentPage + 1, true);
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      if (sentinel.parentNode) {
        sentinel.parentNode.removeChild(sentinel);
      }
    };
  }, [hasMore, loadingMore, loading, currentPage]);

  async function loadGuestbooks(page = 1, append = false, fresh = false) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (fresh) params.set("fresh", "1");
      const response = await fetch(`/api/guestbook?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Guestbook API error: ${response.status}`);
      const { data, hasMore: nextHasMore } = (await response.json()) as {
        data: Guestbook[];
        hasMore: boolean;
      };
      if (append) {
        setGuestbooks((prev) => {
          const nextGuestbooks = [...prev, ...(data || [])];
          const replyParentIds = Array.from(
            new Set(
              nextGuestbooks
                .filter((item) => item.is_reply || item.parent_id)
                .map((item) => item.parent_id)
                .filter(
                  (parentId): parentId is number =>
                    typeof parentId === "number",
                ),
            ),
          );
          setExpandedReplies((current) =>
            Array.from(new Set([...current, ...replyParentIds])),
          );
          return nextGuestbooks;
        });
      } else {
        const nextGuestbooks = data || [];
        setGuestbooks(nextGuestbooks);
        setExpandedReplies(
          Array.from(
            new Set(
              nextGuestbooks
                .filter((item) => item.is_reply || item.parent_id)
                .map((item) => item.parent_id)
                .filter(
                  (parentId): parentId is number =>
                    typeof parentId === "number",
                ),
            ),
          ),
        );
      }
      setHasMore(nextHasMore);
      setCurrentPage(page);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    if (loadingMore || loading || !hasMore) return;
    loadGuestbooks(currentPage + 1, true);
  }

  function showHistory() {
    if (historyVisible) return;
    setHistoryVisible(true);
    if (guestbooks.length === 0) {
      loadGuestbooks(1, false);
    }
  }

  function toggleReplies(parentId: number) {
    setExpandedReplies((prev) =>
      prev.includes(parentId)
        ? prev.filter((id) => id !== parentId)
        : [...prev, parentId],
    );
  }

  async function handleSubmit() {
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/guestbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          message: message.trim(),
        }),
      });
      if (!response.ok) {
        if (response.status === 409) {
          alert("请勿重复提交相同的留言");
          return;
        }
        throw new Error(`Guestbook submit error: ${response.status}`);
      }
      setSuccess(true);
      setName("");
      setMessage("");
      setHistoryVisible(true);
      loadGuestbooks(1, false, true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      if (err?.message === "AbortError") return;
      alert("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(parentId: number) {
    if (!replyContent.trim()) return;
    if (!isAdmin) return;
    setReplySubmitting(true);
    try {
      const adminUser = JSON.parse(localStorage.getItem("admin_user") || "{}");
      const liveAdminUser = (await getCurrentAdminUser()) || adminUser;
      const adminId = liveAdminUser.github || liveAdminUser.email;
      if (!isAllowedAdminId(adminId)) {
        throw new Error("Unauthorized admin reply");
      }
      const { error } = await supabase.from("guestbook").insert([
        {
          name: getAdminDisplayName(adminId),
          message: replyContent.trim(),
          parent_id: parentId,
          admin_id: adminId,
          is_reply: true,
        },
      ]);
      if (error) throw error;
      setReplyContent("");
      setReplyingTo(null);
      setHistoryVisible(true);
      loadGuestbooks(1, false, true);
    } catch {
      alert("回复失败，请重试");
    } finally {
      setReplySubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除这条留言吗？")) return;
    try {
      const { error } = await supabase.from("guestbook").delete().eq("id", id);
      if (error) throw error;
      setHistoryVisible(true);
      loadGuestbooks(1, false, true);
    } catch {
      alert("删除失败，请重试");
    }
  }

  const mainMessages = guestbooks.filter((g) => !g.is_reply && !g.parent_id);
  const replies = guestbooks.filter((g) => g.is_reply || g.parent_id);
  function getReplyDisplayName(reply: Guestbook) {
    return getAdminDisplayName(reply.admin_id) || reply.name;
  }
  const repliesByParent = replies.reduce(
    (acc, reply) => {
      const parentId = reply.parent_id;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(reply);
      return acc;
    },
    {} as Record<number, Guestbook[]>,
  );

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid rgba(216, 87, 232, 0.2)",
    borderRadius: "var(--radius-sm)",
    fontSize: "14px",
    background: "rgba(255,255,255,0.95)",
    color: "var(--text-primary)",
    outline: "none",
    transition: "all 0.2s",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      className={embedded ? "guestbook-embedded" : "popup-content"}
      style={{
        maxWidth: embedded ? "860px" : "560px",
        width: "100%",
        maxHeight: embedded ? "none" : "85vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        margin: embedded ? "18px auto 0" : undefined,
        textAlign: "left",
      }}
      onClick={(e) => {
        if (!embedded) e.stopPropagation();
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(216, 87, 232, 0.1)",
          flexShrink: 0,
          background: embedded ? "rgba(255,255,255,0.96)" : undefined,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: embedded ? "20px" : "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.01em",
              }}
            >
              💬 留言板
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: embedded ? "13px" : "12px",
                color: "rgba(55, 65, 81, 0.88)",
                lineHeight: 1.7,
                whiteSpace: "pre-line",
              }}
            >
              {
                "有任何问题或建议欢迎留言\n如有网站加载慢或者是异常情况，请联系 qq:786658882"
              }
            </p>
          </div>
          {!embedded && onClose && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(216, 87, 232, 0.08)",
                border: "1px solid rgba(216, 87, 232, 0.15)",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                fontSize: "18px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 表单区域 */}
      <div
        style={{
          padding: "16px 20px",
          background: embedded
            ? "rgba(255,255,255,0.92)"
            : "rgba(216, 87, 232, 0.03)",
          borderBottom: "1px solid rgba(216, 87, 232, 0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的昵称"
            style={{ ...inputStyle, flex: 1 }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--accent-color)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(216, 87, 232, 0.2)")
            }
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="说点什么吧..."
            rows={3}
            style={{
              ...inputStyle,
              resize: "none",
              lineHeight: "1.6",
              minHeight: embedded ? "92px" : undefined,
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--accent-color)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(216, 87, 232, 0.2)")
            }
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {success && (
            <span
              style={{
                fontSize: "13px",
                color: "var(--success-color)",
                fontWeight: 500,
              }}
            >
              ✓ 提交成功！
            </span>
          )}
          {!success && <span />}
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !message.trim()}
            style={{
              padding: "8px 24px",
              background:
                "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: "14px",
              fontWeight: 600,
              cursor:
                submitting || !name.trim() || !message.trim()
                  ? "not-allowed"
                  : "pointer",
              opacity: submitting || !name.trim() || !message.trim() ? 0.5 : 1,
              boxShadow: "0 3px 8px rgba(216,87,232,0.25)",
              transition: "all 0.2s",
            }}
          >
            {submitting ? "提交中..." : "发表评论"}
          </button>
        </div>
      </div>

      {/* 留言列表 */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {embedded && !historyVisible ? (
          <div
            style={{
              padding: "18px 20px 22px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              onClick={showHistory}
              style={{
                position: "relative",
                zIndex: 1,
                padding: "9px 24px",
                fontSize: "13px",
                background: "rgba(216, 87, 232, 0.08)",
                color: "var(--accent-color)",
                border: "1px solid rgba(216, 87, 232, 0.2)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              加载历史留言
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "12px 20px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "rgba(31, 41, 55, 0.88)",
                }}
              >
                全部留言 ({mainMessages.length})
              </span>
            </div>

            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--text-tertiary)",
                  fontSize: "14px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    border: "2px solid rgba(216,87,232,0.15)",
                    borderTopColor: "var(--accent-color)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 10px",
                  }}
                />
                加载中...
              </div>
            ) : mainMessages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--text-tertiary)",
                  fontSize: "14px",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>💭</div>
                还没有留言，来说点什么吧
              </div>
            ) : (
              <div
                ref={listContainerRef}
                style={{
                  flex: 1,
                  overflowY: embedded ? "visible" : "auto",
                  padding: "0 20px 20px",
                }}
              >
                {mainMessages.map((item) => {
                  const itemReplies = repliesByParent[item.id] || [];
                  const repliesExpanded = expandedReplies.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "14px",
                        background: "rgba(255,255,255,0.92)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid rgba(216, 87, 232, 0.1)",
                        marginBottom: "10px",
                        boxShadow: "0 8px 22px rgba(15, 23, 42, 0.05)",
                      }}
                    >
                      {/* 主留言 */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background:
                                "linear-gradient(135deg, var(--primary-color), var(--accent-color))",
                              color: "white",
                              fontSize: "13px",
                              fontWeight: 700,
                              textAlign: "center",
                              lineHeight: "28px",
                            }}
                          >
                            {item.name.charAt(0).toUpperCase()}
                          </span>
                          <strong
                            style={{
                              fontSize: "14px",
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.name}
                          </strong>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "rgba(75, 85, 99, 0.78)",
                          }}
                        >
                          {new Date(item.created_at).toLocaleString("zh-CN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color: "rgba(17, 24, 39, 0.9)",
                          fontSize: "14px",
                          lineHeight: "1.75",
                        }}
                      >
                        {item.message}
                      </p>

                      {/* 操作按钮 */}
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "10px",
                          paddingTop: "10px",
                          borderTop: "1px solid rgba(0,0,0,0.04)",
                        }}
                      >
                        {itemReplies.length > 0 && (
                          <button
                            onClick={() => toggleReplies(item.id)}
                            style={{
                              padding: "4px 12px",
                              fontSize: "12px",
                              background: "rgba(216, 87, 232, 0.08)",
                              color: "var(--accent-color)",
                              border: "1px solid rgba(216, 87, 232, 0.15)",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer",
                              fontWeight: 500,
                              transition: "all 0.2s",
                            }}
                          >
                            {repliesExpanded
                              ? "收起回复"
                              : `查看回复(${itemReplies.length})`}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() =>
                              setReplyingTo(
                                replyingTo === item.id ? null : item.id,
                              )
                            }
                            style={{
                              padding: "4px 12px",
                              fontSize: "12px",
                              background: "rgba(216, 87, 232, 0.08)",
                              color: "var(--accent-color)",
                              border: "1px solid rgba(216, 87, 232, 0.15)",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer",
                              fontWeight: 500,
                              transition: "all 0.2s",
                            }}
                          >
                            {replyingTo === item.id ? "收起回复框" : "回复"}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{
                              padding: "4px 12px",
                              fontSize: "12px",
                              background: "rgba(229, 57, 53, 0.06)",
                              color: "#dc2626",
                              border: "1px solid rgba(229, 57, 53, 0.12)",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer",
                              fontWeight: 500,
                              transition: "all 0.2s",
                            }}
                          >
                            删除
                          </button>
                        )}
                      </div>

                      {/* 回复表单 */}
                      {replyingTo === item.id && isAdmin && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "12px",
                            background: "rgba(216, 87, 232, 0.04)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid rgba(216, 87, 232, 0.1)",
                          }}
                        >
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="输入管理员回复..."
                            rows={2}
                            style={{
                              ...inputStyle,
                              resize: "none",
                              marginBottom: "8px",
                            }}
                            onFocus={(e) =>
                              (e.target.style.borderColor =
                                "var(--accent-color)")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor =
                                "rgba(216, 87, 232, 0.2)")
                            }
                          />
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "flex-end",
                            }}
                          >
                            <button
                              onClick={() => setReplyingTo(null)}
                              style={{
                                padding: "6px 14px",
                                fontSize: "12px",
                                background: "rgba(255,255,255,0.9)",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border-light)",
                                borderRadius: "var(--radius-sm)",
                                cursor: "pointer",
                              }}
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleReply(item.id)}
                              disabled={replySubmitting}
                              style={{
                                padding: "6px 14px",
                                fontSize: "12px",
                                background:
                                  "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
                                color: "white",
                                border: "none",
                                borderRadius: "var(--radius-sm)",
                                cursor: replySubmitting
                                  ? "not-allowed"
                                  : "pointer",
                                fontWeight: 600,
                                opacity: replySubmitting ? 0.6 : 1,
                              }}
                            >
                              {replySubmitting ? "..." : "发送"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 回复列表 */}
                      {itemReplies.length > 0 && repliesExpanded && (
                        <div style={{ marginTop: "10px" }}>
                          {itemReplies.map((reply) => {
                            const isAdminReply = isAllowedAdminId(
                              reply.admin_id,
                            );
                            return (
                              <div
                                key={reply.id}
                                style={{
                                  marginLeft: "16px",
                                  padding: "10px 12px",
                                  background: "rgba(216, 87, 232, 0.04)",
                                  borderRadius: "var(--radius-sm)",
                                  borderLeft: isAdminReply
                                    ? "2px solid var(--accent-color)"
                                    : "2px solid rgba(148, 163, 184, 0.45)",
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
                                  <span
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: isAdminReply
                                        ? "var(--accent-color)"
                                        : "var(--text-primary)",
                                    }}
                                  >
                                    {isAdminReply ? "🛡 " : ""}
                                    {getReplyDisplayName(reply)}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--text-tertiary)",
                                    }}
                                  >
                                    {new Date(reply.created_at).toLocaleString(
                                      "zh-CN",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "13px",
                                    color: "var(--text-secondary)",
                                    lineHeight: "1.5",
                                  }}
                                >
                                  {reply.message}
                                </p>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDelete(reply.id)}
                                    style={{
                                      marginTop: "6px",
                                      padding: "2px 8px",
                                      fontSize: "11px",
                                      background: "rgba(229, 57, 53, 0.06)",
                                      color: "#dc2626",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    删除
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {hasMore && (
                  <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                    <button
                      onClick={loadMore}
                      disabled={loadingMore || loading}
                      style={{
                        padding: "8px 28px",
                        fontSize: "13px",
                        background: "rgba(216, 87, 232, 0.08)",
                        color: "var(--accent-color)",
                        border: "1px solid rgba(216, 87, 232, 0.2)",
                        borderRadius: "var(--radius-sm)",
                        cursor: loadingMore || loading ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        opacity: loadingMore || loading ? 0.5 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {loadingMore ? "加载中..." : "加载更多"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
