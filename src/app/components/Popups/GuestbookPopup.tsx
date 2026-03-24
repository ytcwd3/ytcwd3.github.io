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
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    // 检测管理员登录状态
    function checkAdminStatus() {
      const adminLoggedIn = localStorage.getItem("admin_logged_in") === "true";
      setIsAdmin(adminLoggedIn);
    }

    checkAdminStatus();
    window.addEventListener("storage", checkAdminStatus);
    const intervalId = setInterval(checkAdminStatus, 1000);

    loadGuestbooks();

    return () => {
      window.removeEventListener("storage", checkAdminStatus);
      clearInterval(intervalId);
    };
  }, []);

  async function loadGuestbooks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("guestbook")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setGuestbooks(data || []);
    } catch (error) {
      // 加载失败，忽略
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSuccess(false);

    try {
      const { error } = await supabase.from("guestbook").insert([
        {
          name: name,
          message: message,
        },
      ]);

      if (error) throw error;

      setSuccess(true);
      setName("");
      setMessage("");

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      alert("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(parentId: number) {
    if (!replyContent.trim()) {
      alert("请输入回复内容");
      return;
    }

    setReplySubmitting(true);
    try {
      const adminUser = JSON.parse(localStorage.getItem("admin_user") || "{}");

      const { error } = await supabase.from("guestbook").insert([
        {
          name: adminUser.github || adminUser.email || "管理员",
          message: replyContent,
          parent_id: parentId,
          admin_id: adminUser.github || adminUser.email,
          is_reply: true,
        },
      ]);

      if (error) throw error;

      setReplyContent("");
      setReplyingTo(null);
      loadGuestbooks();
      alert("回复成功！");
    } catch (error) {
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

      await new Promise((resolve) => setTimeout(resolve, 500));
      loadGuestbooks();
      alert("删除成功！");
    } catch (error) {
      alert("删除失败，请重试");
    }
  }

  // 分离主留言和回复
  const mainMessages = guestbooks.filter((g) => !g.is_reply && !g.parent_id);
  const replies = guestbooks.filter((g) => g.is_reply || g.parent_id);

  // 按parent_id分组回复
  const repliesByParent = replies.reduce(
    (acc, reply) => {
      const parentId = reply.parent_id;
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(reply);
      return acc;
    },
    {} as Record<number, Guestbook[]>,
  );

  return (
    <div
      className="popup-content"
      style={{ maxWidth: "600px", maxHeight: "80vh", overflow: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="close-btn" onClick={onClose}>
        &times;
      </span>
      <h3 className="popup-title">留言板</h3>

      {/* 留言表单 */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await handleSubmit();
        }}
        style={{ marginBottom: "20px" }}
      >
        <div style={{ marginBottom: "12px" }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
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
          disabled={submitting}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#0078d7",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "提交中..." : "提交留言"}
        </button>

        {success && (
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
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          加载留言中...
        </div>
      ) : mainMessages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          暂无留言
        </div>
      ) : (
        <div style={{ marginTop: "20px" }}>
          <h4
            style={{
              marginBottom: "12px",
              borderBottom: "2px solid #0078d7",
              paddingBottom: "8px",
            }}
          >
            留言列表（共 {mainMessages.length} 条）
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
                  <div
                    style={{
                      color: "#666",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      marginBottom: "8px",
                    }}
                  >
                    {item.message}
                  </div>

                  {/* 管理员操作按钮 */}
                  {isAdmin && (
                    <div
                      style={{ display: "flex", gap: "8px", marginTop: "8px" }}
                    >
                      <button
                        onClick={() =>
                          setReplyingTo(replyingTo === item.id ? null : item.id)
                        }
                        style={{
                          padding: "4px 12px",
                          fontSize: "12px",
                          backgroundColor: "#0078d7",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
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
                          cursor: "pointer",
                        }}
                      >
                        删除
                      </button>
                    </div>
                  )}

                  {/* 回复表单 */}
                  {replyingTo === item.id && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px",
                        backgroundColor: "#e8f0fe",
                        borderRadius: "6px",
                      }}
                    >
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
                          marginBottom: "8px",
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
                          opacity: replySubmitting ? 0.6 : 1,
                        }}
                      >
                        {replySubmitting ? "提交中..." : "提交回复"}
                      </button>
                    </div>
                  )}
                </div>

                {/* 回复列表 */}
                {repliesByParent[item.id] &&
                  repliesByParent[item.id].length > 0 && (
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
                            <strong
                              style={{ color: "#0078d7", fontSize: "13px" }}
                            >
                              👑 {reply.name}
                            </strong>
                            <span style={{ fontSize: "11px", color: "#999" }}>
                              {new Date(reply.created_at).toLocaleString(
                                "zh-CN",
                              )}
                            </span>
                          </div>
                          <div
                            style={{
                              color: "#555",
                              fontSize: "13px",
                              lineHeight: "1.5",
                            }}
                          >
                            {reply.message}
                          </div>
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
                                cursor: "pointer",
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
      )}
    </div>
  );
}
