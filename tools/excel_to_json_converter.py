#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel转JSON工具 - 游戏数据转换器
支持从Excel的不同sheet读取数据并生成对应的JSON文件
"""

import pandas as pd
import json
import os
import sys
from datetime import datetime
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path


class ExcelToJsonConverter:
    def __init__(self):
        self.excel_file = None
        self.output_dir = None

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
            for col in df.columns:
                value = row[col]

                # 处理分类字段（支持多分类，用逗号分隔）
                if col in ['category', 'subCategory']:
                    if isinstance(value, str) and value.strip():
                        # 分割并清理空格
                        game_data[col] = [v.strip() for v in value.split(',') if v.strip()]
                    else:
                        game_data[col] = []
                else:
                    # 其他字段直接转换为字符串
                    game_data[col] = str(value).strip() if value else ''

            # 只添加有游戏名称的行
            if game_data.get('name', '').strip():
                data.append(game_data)

        return data

    def save_json(self, data, output_path):
        """保存JSON文件"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, ensure_ascii=False, indent=2, fp=f)
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
        self.root.title("Excel转JSON工具 - 游戏数据转换器")
        self.root.geometry("700x500")
        self.root.resizable(False, False)

        self.converter = ExcelToJsonConverter()
        self.excel_path = None
        self.output_dir = None

        self.setup_ui()

    def setup_ui(self):
        """设置UI界面"""
        # 标题
        title_label = tk.Label(
            self.root,
            text="Excel转JSON转换工具",
            font=("Arial", 16, "bold"),
            pady=10
        )
        title_label.pack()

        # 说明文字
        info_text = """
使用说明：
1. Excel文件需要包含多个sheet，每个sheet对应一个分类
2. 每个sheet必须包含以下列：name, category, subCategory, code, unzipCode,
   quarkPan, baiduPan, thunderPan, updateDate
3. category和subCategory支持多分类，用英文逗号分隔
4. 转换后会生成对应的JSON文件：gameData_[sheet名称].json
        """
        info_label = tk.Label(
            self.root,
            text=info_text,
            justify=tk.LEFT,
            font=("Arial", 10),
            pady=10
        )
        info_label.pack()

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
