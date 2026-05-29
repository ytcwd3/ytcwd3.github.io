// guestbook 评论表
// 存放用户留言、管理员回复和楼中楼结构。
export interface Guestbook {
  id: number;
  name: string;
  email?: string;
  message: string;
  created_at: string;
  parent_id?: number;
  admin_id?: string;
  is_reply?: boolean;
}
