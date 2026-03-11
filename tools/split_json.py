#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JSON文件分割工具
将大的gameData.json分割成多个小文件，提升网站加载速度
"""

import json
import os
from collections import defaultdict

def split_game_data(input_file, output_dir):
    """
    将gameData.json按分类分割成多个文件
    """
    # 读取原始JSON文件
    with open(input_file, 'r', encoding='utf-8') as f:
        games = json.load(f)

    print(f"读取到 {len(games)} 条游戏数据")

    # 按主分类分组
    categorized_games = defaultdict(list)

    for game in games:
        # 获取第一个分类作为主分类
        categories = game.get('category', [])
        if isinstance(categories, list) and len(categories) > 0:
            main_category = categories[0]
        elif isinstance(categories, str):
            main_category = categories
        else:
            main_category = '其他'

        categorized_games[main_category].append(game)

    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)

    # 保存分类文件
    category_mapping = {
        '任天堂': 'nintendo',
        '索尼': 'sony',
        'PC及安卓': 'pc_android',
        '其他平台': 'other',
        '其他': 'misc'
    }

    results = {}
    for category, games_list in categorized_games.items():
        # 生成文件名
        file_key = category_mapping.get(category, 'misc')
        output_file = os.path.join(output_dir, f'gameData_{file_key}.json')

        # 保存JSON文件
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(games_list, f, ensure_ascii=False, separators=(',', ':'))

        file_size = os.path.getsize(output_file) / 1024  # KB
        results[category] = {
            'file': f'gameData_{file_key}.json',
            'count': len(games_list),
            'size': f'{file_size:.2f} KB'
        }

        print(f"✓ {category}: {len(games_list)}条数据 -> {output_file} ({file_size:.2f} KB)")

    # 生成索引文件（只包含基本信息，用于快速搜索）
    index_data = []
    for game in games:
        index_data.append({
            'name': game.get('name', ''),
            'category': game.get('category', []),
            'subCategory': game.get('subCategory', [])
        })

    index_file = os.path.join(output_dir, 'gameData_index.json')
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, separators=(',', ':'))

    index_size = os.path.getsize(index_file) / 1024
    print(f"\n✓ 索引文件: {len(index_data)}条 -> {index_file} ({index_size:.2f} KB)")

    return results

if __name__ == '__main__':
    input_file = '../data/gameData.json'
    output_dir = '../data'

    if not os.path.exists(input_file):
        print(f"错误：找不到文件 {input_file}")
        exit(1)

    print("开始分割JSON文件...")
    print("=" * 50)

    results = split_game_data(input_file, output_dir)

    print("\n" + "=" * 50)
    print("分割完成！")
    print("\n建议：")
    print("1. 将 data 文件夹上传到网站")
    print("2. 修改 script.js 使用按需加载")
    print("3. 首次只加载索引文件，点击分类时再加载对应数据")
