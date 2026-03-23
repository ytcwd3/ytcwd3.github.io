#!/usr/bin/env python3
"""
通过 Supabase REST API 导入数据
"""
import json
import requests
import time

# Supabase 配置
SUPABASE_URL = "https://mjrqvffiinflzdwnzvte.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA"

# 读取 JSON 数据
json_path = '/Users/whitefox/Desktop/work/ytcwd3.github.io/data/supabase_import.json'
with open(json_path, 'r', encoding='utf-8') as f:
    games = json.load(f)

print(f"总共 {len(games)} 条数据需要导入")

def insert_to_supabase(games, batch_size=100):
    """分批插入数据"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    total = len(games)
    success = 0
    failed = 0

    for i in range(0, total, batch_size):
        batch = games[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        # 构建批量插入的数据
        records = []
        for g in batch:
            record = {
                "name": g.get('name', ''),
                "category": g.get('category', []),
                "subcategory": g.get('subCategory', []),
                "code": g.get('code', ''),
                "unzipcode": g.get('unzipCode', ''),
                "quarkpan": g.get('quarkPan', ''),
                "baidupan": g.get('baiduPan', ''),
                "thunderpan": g.get('thunderPan', ''),
                "updatedate": g.get('updateDate', '')
            }
            records.append(record)

        # 发送到 Supabase
        url = f"{SUPABASE_URL}/rest/v1/games"
        try:
            response = requests.post(url, headers=headers, json=records)
            if response.status_code in [200, 201]:
                success += len(batch)
                print(f"批次 {batch_num}/{total_batches}: ✓ 成功插入 {len(batch)} 条")
            else:
                failed += len(batch)
                print(f"批次 {batch_num}/{total_batches}: ✗ 失败 ({response.status_code}) - {response.text[:100]}")
        except Exception as e:
            failed += len(batch)
            print(f"批次 {batch_num}/{total_batches}: ✗ 错误 - {e}")

        # 避免请求过快
        if i + batch_size < total:
            time.sleep(0.3)

    print(f"\n导入完成！成功: {success}, 失败: {failed}")
    return success, failed

if __name__ == '__main__':
    insert_to_supabase(games)
