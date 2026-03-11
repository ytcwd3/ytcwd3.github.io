#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JSON合并工具
将多个JSON文件合并为一个文件
"""

import json
import os
import sys


def merge_json_files(input_files, output_file):
    """
    合并多个JSON文件

    Args:
        input_files: 输入文件列表
        output_file: 输出文件路径
    """
    merged_data = []

    for file_path in input_files:
        if not os.path.exists(file_path):
            print(f"警告: 文件不存在 - {file_path}")
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    merged_data.extend(data)
                    print(f"✓ 已读取: {file_path} ({len(data)}条)")
                else:
                    print(f"警告: {file_path} 不是数组格式")
        except Exception as e:
            print(f"错误: 读取 {file_path} 失败 - {str(e)}")

    # 保存合并后的数据
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, ensure_ascii=False, indent=2)
        print(f"\n✓ 合并完成！")
        print(f"  输出文件: {output_file}")
        print(f"  总数据量: {len(merged_data)}条")
    except Exception as e:
        print(f"错误: 保存文件失败 - {str(e)}")


if __name__ == "__main__":
    # 示例用法
    input_files = [
        "data/gameData_任天堂主机.json",
        "data/gameData_NS.json",
        "data/gameData_任天堂掌机.json",
        "data/gameData_索尼.json",
        "data/gameData_其他.json"
    ]

    output_file = "data/gameData_merged.json"

    print("JSON合并工具")
    print("=" * 50)
    merge_json_files(input_files, output_file)
