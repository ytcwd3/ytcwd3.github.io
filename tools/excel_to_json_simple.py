#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel转JSON工具 - 简化版
支持只填写分享码，自动生成完整链接
"""

import pandas as pd
import json
import os
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path
from datetime import datetime


class SimplifiedExcelToJsonConverter:
    def __init__(self):
        self.excel_file = None
        self.output_dir = None

    def generate_link(self, code, platform):
        """
        根据分享码生成完整链接

        Args:
            code: 分享码
            platform: 平台类型 (quark/baidu/thunder)

        Returns:
            完整的网盘链接
        """
        if not code or pd.isna(code) or str(code).strip() == '':
            return ''

        code = str(code).strip()

        # 如果已经是完整链接，直接返回
        if code.startswith('http://') or code.startswith('https://'):
            return code

        # 根据平台生成链接
        base_urls = {
            'quark': 'https://pan.quark.cn/s/',
            'baidu': 'https://pan.baidu.com/s/',
            'thunder': 'https://pan.xunlei.com/s/'
        }

        return base_urls.get(platform, '') + code

    def read_excel_sheets(self, excel_path):
        """读取Excel文件的所有sheet"""
        try:
            excel_file = pd.ExcelFile(excel_path)
            return excel_file.sheet_names, excel_file
        except Exception as e:
            raise Exception(f"读取Excel文件失败: {str(e)}")

    def convert_sheet_to_json(self, df, sheet_name):
        """将DataFrame转换为JSON格式"""
        # 替换NaN为空字符串
        df = df.fillna('')

        # 转换为字典列表
        data = []
        for _, row in df.iterrows():
            game_data = {}

            # 基本信息
            game_data['name'] = str(row.get('name', '')).strip()

            # 处理分类字段（支持多分类，用逗号分隔）
            for col in ['category', 'subCategory']:
                value = row.get(col, '')
                if isinstance(value, str) and value.strip():
                    game_data[col] = [v.strip() for v in value.split(',') if v.strip()]
                else:
                    game_data[col] = []

            # 提取码和解压密码
            game_data['code'] = str(row.get('code', '')).strip()
            game_data['unzipCode'] = str(row.get('unzipCode', '')).strip()

            # 处理网盘链接 - 支持两种列名
            # 1. 完整链接列名：quarkPan, baiduPan, thunderPan
            # 2. 分享码列名：quarkCode, baiduCode, thunderCode

            # 夸克网盘
            if 'quarkPan' in row and row['quarkPan']:
                game_data['quarkPan'] = str(row['quarkPan']).strip()
            elif 'quarkCode' in row:
                game_data['quarkPan'] = self.generate_link(row['quarkCode'], 'quark')
            else:
                game_data['quarkPan'] = ''

            # 百度网盘
            if 'baiduPan' in row and row['baiduPan']:
                game_data['baiduPan'] = str(row['baiduPan']).strip()
            elif 'baiduCode' in row:
                game_data['baiduPan'] = self.generate_link(row['baiduCode'], 'baidu')
            else:
                game_data['baiduPan'] = ''

            # 迅雷网盘
            if 'thunderPan' in row and row['thunderPan']:
                game_data['thunderPan'] = str(row['thunderPan']).strip()
            elif 'thunderCode' in row:
                game_data['thunderPan'] = self.generate_link(row['thunderCode'], 'thunder')
            else:
                game_data['thunderPan'] = ''

            # 更新日期
            update_date = row.get('updateDate', '')
            if update_date:
                game_data['updateDate'] = str(update_date).strip()
            else:
                # 如果没有日期，使用今天
                today = datetime.now()
                game_data['updateDate'] = f"{today.year}.{today.month}.{today.day}"

            # 只添加有游戏名称的行
            if game_data['name']:
                data.append(game_data)

        return data

    def save_json(self, data, output_path):
        """保存JSON文件"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            raise Exception(f"保存JSON文件失败: {str(e)}")

    def convert_all(self, excel_path, output_dir):
        """转换所有sheet到JSON文件"""
        results = []
        try:
            sheet_names, excel_file = self.read_excel_sheets(excel_path)

            for sheet_name in sheet_names:
                try:
                    # 读取sheet数据
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)

                    # 转换为JSON数据
                    json_data = self.convert_sheet_to_json(df, sheet_name)

                    # 生成输出文件名
                    output_filename = f"gameData_{sheet_name}.json"
                    output_path = os.path.join(output_dir, output_filename)

                    # 保存JSON文件
                    self.save_json(json_data, output_path)

                    results.append({
                        'sheet': sheet_name,
                        'file': output_filename,
                        'count': len(json_data),
                        'status': 'success'
                    })
                except Exception as e:
                    results.append({
                        'sheet': sheet_name,
                        'file': f"gameData_{sheet_name}.json",
                        'count': 0,
                        'status': 'error',
                        'error': str(e)
                    })

            return results
        except Exception as e:
            raise Exception(f"转换过程出错: {str(e)}")


class ConverterGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Excel转JSON工具 - 简化版")
        self.root.geometry("750x600")
        self.root.resizable(False, False)

        self.converter = SimplifiedExcelToJsonConverter()
        self.excel_path = None
        self.output_dir = None

        self.setup_ui()

    def setup_ui(self):
        """设置UI界面"""
        # 标题
        title_label = tk.Label(
            self.root,
            text="Excel转JSON转换工具（简化版）",
            font=("Arial", 16, "bold"),
            pady=10
        )
        title_label.pack()

        # 说明文字
        info_text = """
使用说明（两种方式任选其一）：

方式1：只填写分享码（推荐，最简单）✨
  列名：name, category, subCategory, code, unzipCode,
        quarkCode, baiduCode, thunderCode, updateDate
  示例：quarkCode填 "abc123"，自动生成 "https://pan.quark.cn/s/abc123"

方式2：填写完整链接（传统方式）
  列名：name, category, subCategory, code, unzipCode,
        quarkPan, baiduPan, thunderPan, updateDate
  示例：quarkPan填 "https://pan.quark.cn/s/abc123"

提示：
- category和subCategory支持多分类，用英文逗号分隔
- 如果没有某个网盘链接，留空即可
- updateDate可以留空，会自动使用今天的日期
        """
        info_label = tk.Label(
            self.root,
            text=info_text,
            justify=tk.LEFT,
            font=("Arial", 9),
            pady=10,
            bg="#f0f0f0"
        )
        info_label.pack(fill=tk.X, padx=20)

        # 文件选择区域
        file_frame = tk.Frame(self.root, pady=10)
        file_frame.pack(fill=tk.X, padx=20)

        tk.Label(file_frame, text="Excel文件:", font=("Arial", 10)).grid(row=0, column=0, sticky=tk.W, pady=5)
        self.excel_path_var = tk.StringVar()
        tk.Entry(file_frame, textvariable=self.excel_path_var, width=50, state='readonly').grid(row=0, column=1, padx=10)
        tk.Button(file_frame, text="选择文件", command=self.select_excel_file).grid(row=0, column=2)

        tk.Label(file_frame, text="输出目录:", font=("Arial", 10)).grid(row=1, column=0, sticky=tk.W, pady=5)
        self.output_dir_var = tk.StringVar()
        tk.Entry(file_frame, textvariable=self.output_dir_var, width=50, state='readonly').grid(row=1, column=1, padx=10)
        tk.Button(file_frame, text="选择目录", command=self.select_output_dir).grid(row=1, column=2)

        # 转换按钮
        convert_btn = tk.Button(
            self.root,
            text="开始转换",
            command=self.start_conversion,
            font=("Arial", 12, "bold"),
            bg="#4CAF50",
            fg="white",
            padx=20,
            pady=10
        )
        convert_btn.pack(pady=20)

        # 结果显示区域
        result_frame = tk.Frame(self.root)
        result_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        tk.Label(result_frame, text="转换结果:", font=("Arial", 10, "bold")).pack(anchor=tk.W)

        # 创建文本框显示结果
        self.result_text = tk.Text(result_frame, height=10, width=80, state='disabled')
        self.result_text.pack(fill=tk.BOTH, expand=True)

        # 滚动条
        scrollbar = tk.Scrollbar(self.result_text)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.result_text.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.result_text.yview)

    def select_excel_file(self):
        """选择Excel文件"""
        file_path = filedialog.askopenfilename(
            title="选择Excel文件",
            filetypes=[("Excel文件", "*.xlsx *.xls"), ("所有文件", "*.*")]
        )
        if file_path:
            self.excel_path = file_path
            self.excel_path_var.set(file_path)

    def select_output_dir(self):
        """选择输出目录"""
        dir_path = filedialog.askdirectory(title="选择输出目录")
        if dir_path:
            self.output_dir = dir_path
            self.output_dir_var.set(dir_path)

    def start_conversion(self):
        """开始转换"""
        if not self.excel_path:
            messagebox.showerror("错误", "请先选择Excel文件！")
            return

        if not self.output_dir:
            messagebox.showerror("错误", "请先选择输出目录！")
            return

        try:
            # 清空结果显示
            self.result_text.config(state='normal')
            self.result_text.delete(1.0, tk.END)

            # 执行转换
            results = self.converter.convert_all(self.excel_path, self.output_dir)

            # 显示结果
            self.result_text.insert(tk.END, f"转换完成！时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            for result in results:
                if result['status'] == 'success':
                    self.result_text.insert(
                        tk.END,
                        f"✓ {result['sheet']} -> {result['file']} ({result['count']}条数据)\n"
                    )
                else:
                    self.result_text.insert(
                        tk.END,
                        f"✗ {result['sheet']} 转换失败: {result.get('error', '未知错误')}\n"
                    )

            self.result_text.config(state='disabled')

            messagebox.showinfo("成功", f"转换完成！共处理{len(results)}个sheet")

        except Exception as e:
            messagebox.showerror("错误", f"转换失败: {str(e)}")
            self.result_text.config(state='normal')
            self.result_text.insert(tk.END, f"\n错误: {str(e)}\n")
            self.result_text.config(state='disabled')


def main():
    root = tk.Tk()
    app = ConverterGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
