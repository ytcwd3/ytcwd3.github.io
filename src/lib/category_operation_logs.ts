import { supabase } from "./supabase";

const OPERATOR_NAME = "admin";

// category_operation_logs 分类管理操作记录
// 记录父分类/子分类的新增、改名、迁移、删除等后台操作。
export async function logCategoryOperation(params: {
  action: string;
  targetType: string;
  targetId?: number | null;
  targetName?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  const { error } = await supabase.from("category_operation_logs").insert({
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    target_name: params.targetName ?? null,
    before_data: params.beforeData ?? null,
    after_data: params.afterData ?? null,
    actor: OPERATOR_NAME,
  });
  if (error) throw error;
}
