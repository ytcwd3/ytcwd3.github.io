"use client";

import { useState, useEffect } from "react";
import { supabase, Guestbook } from "@/lib/supabase";

interface GuestbookPopupProps {
  onClose: () => void;
}

export default function GuestbookPopup({ onClose }: GuestbookPopupProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [guestbooks, setGuestbooks] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    function checkAdminStatus() {
      setIsAdmin(localStorage.getItem("admin_logged_in") === "true");
    }
    checkAdminStatus();
    window.addEventListener("storage", checkAdminStatus);
    const intervalId = setInterval(checkAdminStatus, 1000);
    loadGuestbooks(1, false);
    return () => {
      window.removeEventListener("storage", checkAdminStatus);
      clearInterval(intervalId);
    };
  }, []);

  async function loadGuestbooks(page = 1, append = false) {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = page * PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("guestbook")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      if (append) {
        setGuestbooks((prev) => [...prev, ...(data || [])]);
      } else {
        setGuestbooks(data || []);
      }
      setHasMore(
        (data?.length || 0) === PAGE_SIZE && (count || 0) > page * PAGE_SIZE,
      );
      setCurrentPage(page);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    if (loading || !hasMore) return;
    loadGuestbooks(currentPage + 1, true);
  }

  async function handleSubmit() {
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("guestbook")
        .insert([{ name: name.trim(), message: message.trim() }]);
      if (error) throw error;
      setSuccess(true);
      setName("");
      setMessage("");
      loadGuestbooks(1, false);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      alert("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(parentId: number) {
    if (!replyContent.trim()) return;
    setReplySubmitting(true);
    try {
      const adminUser = JSON.parse(localStorage.getItem("admin_user") || "{}");
      const { error } = await supabase.from("guestbook").insert([
        {
          name: adminUser.github || adminUser.email || "管理员",
          message: replyContent.trim(),
          parent_id: parentId,
          admin_id: adminUser.github || adminUser.email,
          is_reply: true,
        },
      ]);
      if (error) throw error;
      setReplyContent("");
      setReplyingTo(null);
      loadGuestbooks(1, false);
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
      loadGuestbooks(1, false);
    } catch {
      alert("删除失败，请重试");
    }
  }

  const mainMessages = guestbooks.filter((g) => !g.is_reply && !g.parent_id);
  const replies = guestbooks.filter((g) => g.is_reply || g.parent_id);
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
      className="popup-content"
      style={{
        maxWidth: "560px",
        maxHeight: "85vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 头部 */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(216, 87, 232, 0.1)",
          flexShrink: 0,
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
                fontSize: "18px",
                fontWeight: 700,
                background:
                  "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              💬 留言板
            </h2>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "12px",
                color: "var(--text-tertiary)",
              }}
            >
              有任何问题或建议欢迎留言
            </p>
          </div>
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
        </div>
      </div>

      {/* 表单区域 */}
      <div
        style={{
          padding: "16px 20px",
          background: "rgba(216, 87, 232, 0.03)",
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
              color: "var(--text-secondary)",
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
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 20px 20px",
            }}
          >
            {mainMessages.map((item) => {
              const itemReplies = repliesByParent[item.id] || [];
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "14px",
                    background: "rgba(255,255,255,0.7)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(255,255,255,0.8)",
                    marginBottom: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
                        color: "var(--text-tertiary)",
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
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      lineHeight: "1.6",
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
                    <button
                      onClick={() =>
                        setReplyingTo(replyingTo === item.id ? null : item.id)
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
                      {replyingTo === item.id
                        ? "收起"
                        : `回复${itemReplies.length > 0 ? `(${itemReplies.length})` : ""}`}
                    </button>
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
                  {replyingTo === item.id && (
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
                          (e.target.style.borderColor = "var(--accent-color)")
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
                            cursor: replySubmitting ? "not-allowed" : "pointer",
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
                  {itemReplies.length > 0 && (
                    <div style={{ marginTop: "10px" }}>
                      {itemReplies.map((reply) => (
                        <div
                          key={reply.id}
                          style={{
                            marginLeft: "16px",
                            padding: "10px 12px",
                            background: "rgba(216, 87, 232, 0.04)",
                            borderRadius: "var(--radius-sm)",
                            borderLeft: "2px solid var(--accent-color)",
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
                                color: "var(--accent-color)",
                              }}
                            >
                              🛡 {reply.name}
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
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {hasMore && (
              <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                <button
                  onClick={loadMore}
                  disabled={loading}
                  style={{
                    padding: "8px 28px",
                    fontSize: "13px",
                    background: "rgba(216, 87, 232, 0.08)",
                    color: "var(--accent-color)",
                    border: "1px solid rgba(216, 87, 232, 0.2)",
                    borderRadius: "var(--radius-sm)",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    opacity: loading ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {loading ? "加载中..." : "加载更多"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
