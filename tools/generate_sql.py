#!/usr/bin/env python3
"""
生成 Supabase INSERT SQL 语句
"""
import json
import re

def escape_sql(val):
    """转义 SQL 字符串"""
    if val is None:
        return "''"
    val = str(val)
    # 转义单引号
    val = val.replace("'", "''")
    # 转义反斜杠
    val = val.replace("\\", "\\\\")
    return f"'{val}'"

def escape_sql_array(arr):
    """转义 SQL 数组"""
    if not arr:
        return "'{}'"
    escaped = [escape_sql(v).strip("'") for v in arr]
    return "ARRAY['" + "','".join(escaped) + "']"

def generate_insert_sql(json_path, output_path, batch_size=500):
    """生成 INSERT SQL 语句，分批处理避免 SQL 太长"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    sql_statements = []

    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        values = []

        for g in batch:
            name = escape_sql(g.get('name', ''))
            category = escape_sql_array(g.get('category', []))
            subcategory = escape_sql_array(g.get('subCategory', []))
            code = escape_sql(g.get('code', ''))
            unzipcode = escape_sql(g.get('unzipCode', ''))
            quarkpan = escape_sql(g.get('quarkPan', ''))
            baidupan = escape_sql(g.get('baiduPan', ''))
            thunderpan = escape_sql(g.get('thunderPan', ''))
            updatedate = escape_sql(g.get('updateDate', ''))

            values.append(f"({name}, {category}, {subcategory}, {code}, {unzipcode}, {quarkpan}, {baidupan}, {thunderpan}, {updatedate})")

        sql = f"INSERT INTO games (name, category, subcategory, code, unzipcode, quarkpan, baidupan, thunderpan, updatedate) VALUES\n"
        sql += ",\n".join(values) + ";"

        sql_statements.append(sql)

        batch_num = i // batch_size + 1
        total_batches = (len(data) + batch_size - 1) // batch_size
        print(f"批次 {batch_num}/{total_batches}: {len(batch)} 条")

    # 保存到文件
    with open(output_path, 'w', encoding='utf-8') as f:
        for stmt in sql_statements:
            f.write(stmt + "\n\n")

    print(f"\n生成了 {len(sql_statements)} 个 INSERT 语句")
    print(f"保存至: {output_path}")

    # 计算文件大小
    import os
    size = os.path.getsize(output_path)
    print(f"文件大小: {size / 1024 / 1024:.2f} MB")

    return sql_statements

if __name__ == '__main__':
    json_path = '/Users/whitefox/Desktop/work/ytcwd3.github.io/data/supabase_import.json'
    output_path = '/Users/whitefox/Desktop/work/ytcwd3.github.io/data/supabase_insert.sql'

    stmts = generate_insert_sql(json_path, output_path)

    # 显示前两个语句的预览
    print("\n=== SQL 预览（前500字符） ===")
    for i, stmt in enumerate(stmts[:2]):
        print(f"\n--- 语句 {i+1} ---")
        print(stmt[:500] + "..." if len(stmt) > 500 else stmt)
