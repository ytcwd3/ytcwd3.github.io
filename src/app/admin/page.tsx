'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Game } from '@/lib/supabase'

const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  pc: ['必备软件', '各种合集', 'RPG', 'SLG', 'ACT', 'AVG', '策略', '模拟经营', 'FPS', '射击', '格斗', '赛车', '休闲益智', '塔防', '即时战略', 'MOBA', '卡牌', '音乐', '其他PC游戏', '移植PC', '安卓模拟器'],
  ns: ['NS'],
  handheld: ['GB', 'GBC', 'GBA', '3DS', 'NDS'],
  console: ['FC', 'SFC', 'N64', 'NGC', 'Wii', 'Wii U'],
  sony: ['PSP', 'PS2', 'PS3', 'PS Vita', 'PS1', 'PS4'],
  other: ['MD', 'SS', 'DC', '街机', 'Xbox', 'Java', 'Neogeo', 'DOS', '文曲星', 'J2ME', '安卓', '步步高']
}

const CATEGORY_NAMES: Record<string, string> = {
  pc: 'PC',
  ns: 'NS',
  handheld: '任天堂掌机',
  console: '任天堂主机',
  sony: '索尼',
  other: 'Other'
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pc: { bg: '#fef3c7', border: '#fcd34d', text: '#b45309' },
  ns: { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' },
  handheld: { bg: '#d1fae5', border: '#6ee7b7', text: '#047857' },
  console: { bg: '#ede9fe', border: '#c4b5fd', text: '#7c3aed' },
  sony: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
  other: { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }
}

const PAGE_SIZE = 20

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string>('pc')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category1: '',
    category2: '',
    subcategory1: '',
    subcategory2: '',
    code: '',
    unzipcode: '',
    quarkpan: '',
    baidupan: '',
    thunderpan: '',
    updatedate: ''
  })

  // Import state
  const [excelData, setExcelData] = useState<any[]>([])
  const [diffResult, setDiffResult] = useState<any>({ added: [], modified: [], unchanged: [] })
  const [importLoading, setImportLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

  function checkAuth() {
    const loggedIn = localStorage.getItem('admin_logged_in')
    if (!loggedIn) {
      window.location.href = '/admin/login'
      return
    }
    const userData = JSON.parse(localStorage.getItem('admin_user') || '{}')
    setUser(userData)
  }

  async function loadData() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      setGames(data || [])
      applyFilters(data || [])
    } catch (error: any) {
      alert('加载数据失败: ' + error.message)
    }
    setLoading(false)
  }

  function getCategoryKey(subcats: string[]): string {
    if (subcats.includes('NS')) return 'ns'
    if (subcats.some(s => ['PSP', 'PS2', 'PS3', 'PS Vita', 'PS1', 'PS4'].includes(s))) return 'sony'
    if (subcats.some(s => ['GB', 'GBC', 'GBA', '3DS', 'NDS'].includes(s))) return 'handheld'
    if (subcats.some(s => ['FC', 'SFC', 'N64', 'NGC', 'Wii', 'Wii U'].includes(s))) return 'console'
    if (subcats.some(s => ['MD', 'SS', 'DC', '街机', 'Xbox', 'Java', 'Neogeo', 'DOS', '文曲星', 'J2ME', '安卓', '步步高'].includes(s))) return 'other'
    return 'pc'
  }

  function getCategoryName(key: string): string {
    return CATEGORY_NAMES[key] || 'PC'
  }

  function applyFilters(data: Game[]) {
    let filtered = [...data]

    // Category filter
    filtered = filtered.filter(g => {
      const subcats = g.subcategory || []
      return getCategoryKey(subcats) === selectedCategory
    })

    // Subcategory filter
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(g => (g.subcategory || []).includes(selectedSubcategory))
    }

    // Search filter
    if (searchKeyword) {
      filtered = filtered.filter(g => g.name.toLowerCase().includes(searchKeyword.toLowerCase()))
    }

    setFilteredGames(filtered)
    setCurrentPage(1)
  }

  function handleCategoryClick(cat: string) {
    setSelectedCategory(cat)
    setSelectedSubcategory('all')
    applyFilters(games)
  }

  function handleSubcategoryClick(sub: string) {
    setSelectedSubcategory(sub)
    applyFilters(games)
  }

  function handleSearch() {
    applyFilters(games)
  }

  function getCategoryCounts() {
    const counts: Record<string, number> = {}
    Object.keys(CATEGORY_SUBCATEGORIES).forEach(cat => {
      counts[cat] = games.filter(g => getCategoryKey(g.subcategory || []) === cat).length
    })
    return counts
  }

  function getSubcategoryCounts() {
    const subcats = CATEGORY_SUBCATEGORIES[selectedCategory] || []
    const counts: Record<string, number> = {}
    games.filter(g => getCategoryKey(g.subcategory || []) === selectedCategory).forEach(g => {
      (g.subcategory || []).forEach(s => {
        if (subcats.includes(s)) {
          counts[s] = (counts[s] || 0) + 1
        }
      })
    })
    return counts
  }

  function openAddModal() {
    setEditingGame(null)
    setFormData({
      name: '',
      category1: '',
      category2: '',
      subcategory1: '',
      subcategory2: '',
      code: '',
      unzipcode: '',
      quarkpan: '',
      baidupan: '',
      thunderpan: '',
      updatedate: new Date().toLocaleDateString('zh-CN').replace(/\//g, '.')
    })
    setShowEditModal(true)
  }

  function openEditModal(game: Game) {
    setEditingGame(game)
    const cats = game.category || []
    const subcats = game.subcategory || []
    setFormData({
      name: game.name || '',
      category1: cats[0] || '',
      category2: cats[1] || '',
      subcategory1: subcats[0] || '',
      subcategory2: subcats[1] || '',
      code: game.code || '',
      unzipcode: game.unzipcode || '',
      quarkpan: game.quarkpan || '',
      baidupan: game.baidupan || '',
      thunderpan: game.thunderpan || '',
      updatedate: game.updatedate || ''
    })
    setShowEditModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const category: string[] = []
    if (formData.category1) category.push(formData.category1)
    if (formData.category2) category.push(formData.category2)

    const subcategory: string[] = []
    if (formData.subcategory1) subcategory.push(formData.subcategory1)
    if (formData.subcategory2) subcategory.push(formData.subcategory2)

    const gameData = {
      name: formData.name,
      category,
      subcategory,
      code: formData.code,
      unzipcode: formData.unzipcode,
      quarkpan: formData.quarkpan,
      baidupan: formData.baidupan,
      thunderpan: formData.thunderpan,
      updatedate: formData.updatedate
    }

    try {
      if (editingGame) {
        const { error } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', editingGame.id)
        if (error) throw error
        alert('更新成功')
      } else {
        const { error } = await supabase
          .from('games')
          .insert([gameData])
        if (error) throw error
        alert('添加成功')
      }
      setShowEditModal(false)
      loadData()
    } catch (error: any) {
      alert('操作失败: ' + error.message)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定要删除这条数据吗？')) return
    try {
      const { error } = await supabase.from('games').delete().eq('id', id)
      if (error) throw error
      alert('删除成功')
      loadData()
    } catch (error: any) {
      alert('删除失败: ' + error.message)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('admin_logged_in')
    localStorage.removeItem('admin_user')
    window.location.href = '/admin/login'
  }

  // Excel Import Functions
  function openImportModal() {
    setShowImportModal(true)
    setExcelData([])
    setDiffResult({ added: [], modified: [], unchanged: [] })
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)

    // 动态加载 xlsx 库
    const XLSX = await import('xlsx')

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const allGames: any[] = []

        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

          // 找到数据起始行
          let startRow = 0
          for (let i = 0; i < Math.min(5, json.length); i++) {
            if (json[i] && json[i][0]) {
              const firstCell = String(json[i][0])
              if (firstCell.includes('游戏名') || (firstCell.includes('共') && firstCell.includes('条'))) {
                startRow = i + 1
                break
              }
              if (i === 0) startRow = 1
            }
          }

          // 确定默认分类
          let defaultCategory: string[] = []
          let defaultSubcategory: string[] = []
          const sheetNameUpper = sheetName.toUpperCase()

          if (sheetNameUpper.includes('PC') && !sheetNameUpper.includes('NS')) {
            defaultCategory = ['PC及安卓']
          } else if (sheetNameUpper === 'NS' || sheetNameUpper.includes('NS')) {
            defaultCategory = ['任天堂']
            defaultSubcategory = ['NS']
          } else if (sheetNameUpper.includes('掌机')) {
            defaultCategory = ['任天堂']
          } else if (sheetNameUpper.includes('主机')) {
            defaultCategory = ['任天堂']
          } else if (sheetNameUpper.includes('索尼') || sheetNameUpper.includes('SONY')) {
            defaultCategory = ['索尼']
          } else if (sheetNameUpper.includes('OTHER')) {
            defaultCategory = ['其他平台']
          }

          // 读取数据
          for (let i = startRow; i < json.length; i++) {
            const row = json[i]
            if (!row || !row[0]) continue

            const name = String(row[0] || '').trim()
            if (!name) continue

            const category: string[] = []
            const p1 = String(row[1] || '').trim()
            const p2 = String(row[2] || '').trim()
            if (p1) category.push(p1)
            else if (defaultCategory.length) category.push(...defaultCategory)
            if (p2) category.push(p2)

            const subcategory: string[] = []
            const s1 = String(row[3] || '').trim()
            const s2 = String(row[4] || '').trim()
            if (s1) subcategory.push(s1)
            else if (defaultSubcategory.length) subcategory.push(...defaultSubcategory)
            if (s2) subcategory.push(s2)

            allGames.push({
              name,
              category,
              subcategory,
              code: String(row[5] || '').trim(),
              unzipcode: String(row[9] || '').trim(),
              quarkpan: String(row[6] || '').trim(),
              baidupan: String(row[7] || '').trim(),
              thunderpan: String(row[8] || '').trim(),
              updatedate: String(row[10] || '').trim()
            })
          }
        })

        setExcelData(allGames)
        compareData(allGames)
      } catch (err: any) {
        alert('读取Excel失败: ' + err.message)
      }
      setImportLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  function compareData(excelGames: any[]) {
    const existingMap = new Map()
    games.forEach(g => existingMap.set(g.name, g))

    const result = { added: [], modified: [], unchanged: [] }

    excelGames.forEach(excelGame => {
      const existing = existingMap.get(excelGame.name)
      if (!existing) {
        result.added.push(excelGame)
      } else {
        const changed =
          excelGame.quarkpan !== existing.quarkpan ||
          excelGame.baidupan !== existing.baidupan ||
          excelGame.thunderpan !== existing.thunderpan ||
          excelGame.code !== existing.code ||
          JSON.stringify(excelGame.category) !== JSON.stringify(existing.category) ||
          JSON.stringify(excelGame.subcategory) !== JSON.stringify(existing.subcategory)

        if (changed) {
          result.modified.push({ new: excelGame, old: existing })
        } else {
          result.unchanged.push(excelGame)
        }
      }
    })

    setDiffResult(result)
  }

  async function doImport() {
    const total = diffResult.added.length + diffResult.modified.length
    if (total === 0) {
      alert('没有需要导入的数据')
      return
    }

    if (!confirm(`确定要导入 ${total} 条数据吗？\n新增: ${diffResult.added.length}, 修改: ${diffResult.modified.length}`)) {
      return
    }

    setImportLoading(true)
    let success = 0
    let failed = 0

    // 先处理修改
    for (const item of diffResult.modified) {
      try {
        const { error } = await supabase
          .from('games')
          .update({
            category: item.new.category,
            subcategory: item.new.subcategory,
            code: item.new.code,
            unzipcode: item.new.unzipcode,
            quarkpan: item.new.quarkpan,
            baidupan: item.new.baidupan,
            thunderpan: item.new.thunderpan,
            updatedate: item.new.updatedate
          })
          .eq('name', item.new.name)

        if (error) throw error
        success++
      } catch {
        failed++
      }
    }

    // 再处理新增
    for (const game of diffResult.added) {
      try {
        const { error } = await supabase
          .from('games')
          .insert([{
            name: game.name,
            category: game.category,
            subcategory: game.subcategory,
            code: game.code,
            unzipcode: game.unzipcode,
            quarkpan: game.quarkpan,
            baidupan: game.baidupan,
            thunderpan: game.thunderpan,
            updatedate: game.updatedate
          }])

        if (error) throw error
        success++
      } catch {
        failed++
      }
    }

    setImportLoading(false)
    setShowImportModal(false)
    alert(`导入完成！成功: ${success}, 失败: ${failed}`)
    loadData()
  }

  // Pagination
  const totalPages = Math.ceil(filteredGames.length / PAGE_SIZE) || 1
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const endIndex = startIndex + PAGE_SIZE
  const pageData = filteredGames.slice(startIndex, endIndex)

  const counts = getCategoryCounts()
  const subcatCounts = getSubcategoryCounts()

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: 20 }}>游戏数据库管理后台</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <span style={{ fontSize: 14 }}>👤 {user?.github || user?.email}</span>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}>退出登录</button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '20px auto', padding: '0 20px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
            <div
              key={key}
              onClick={() => handleCategoryClick(key)}
              style={{
                background: 'white',
                padding: '12px 15px',
                borderRadius: 10,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                flex: 1,
                textAlign: 'center',
                border: `2px solid ${selectedCategory === key ? CATEGORY_COLORS[key].border : 'transparent'}`,
                backgroundColor: selectedCategory === key ? CATEGORY_COLORS[key].bg : 'white',
                transition: 'all 0.2s'
              }}
            >
              <h3 style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>{name}</h3>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: CATEGORY_COLORS[key].text }}>{counts[key] || 0}</div>
            </div>
          ))}
        </div>

        {/* Subcategory Filter */}
        <div style={{
          background: 'white',
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <span style={{ fontSize: 13, color: '#666', marginRight: 10 }}>筛选子分类：</span>
          <button
            onClick={() => handleSubcategoryClick('all')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
              border: `1px solid ${CATEGORY_COLORS[selectedCategory].border}`,
              backgroundColor: selectedSubcategory === 'all' ? CATEGORY_COLORS[selectedCategory].bg : 'white',
              color: CATEGORY_COLORS[selectedCategory].text
            }}
          >
            全部 ({filteredGames.length})
          </button>
          {(CATEGORY_SUBCATEGORIES[selectedCategory] || []).map(sub => (
            subcatCounts[sub] > 0 && (
              <button
                key={sub}
                onClick={() => handleSubcategoryClick(sub)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                  border: `1px solid ${CATEGORY_COLORS[selectedCategory].border}`,
                  backgroundColor: selectedSubcategory === sub ? CATEGORY_COLORS[selectedCategory].bg : 'white',
                  color: CATEGORY_COLORS[selectedCategory].text
                }}
              >
                {sub} ({subcatCounts[sub]})
              </button>
            )
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ background: 'white', padding: 20, borderRadius: 10, marginBottom: 20, display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="搜索游戏名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ width: '100%', padding: '10px 15px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
            />
          </div>
          <button onClick={openImportModal} style={{ padding: '10px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>📥 导入Excel</button>
          <button onClick={openAddModal} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>+ 添加游戏</button>
          <button onClick={loadData} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>刷新数据</button>
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>ID</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>游戏名称</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>主分类</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>子分类</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>提取码</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>夸克链接</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>更新日期</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((game, idx) => {
                const catKey = getCategoryKey(game.subcategory || [])
                return (
                  <tr key={game.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 15px', fontSize: 14 }}>{startIndex + idx + 1}</td>
                    <td style={{ padding: '12px 15px', fontSize: 14 }}><strong>{game.name}</strong></td>
                    <td style={{ padding: '12px 15px', fontSize: 14 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        backgroundColor: CATEGORY_COLORS[catKey].bg,
                        color: CATEGORY_COLORS[catKey].text,
                        border: `1px solid ${CATEGORY_COLORS[catKey].border}`
                      }}>
                        {getCategoryName(catKey)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px', fontSize: 14 }}>
                      {(game.subcategory || []).map(s => (
                        <span key={s} style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          margin: '1px',
                          backgroundColor: CATEGORY_COLORS[catKey].bg,
                          color: CATEGORY_COLORS[catKey].text,
                          border: `1px solid ${CATEGORY_COLORS[catKey].border}`
                        }}>{s}</span>
                      ))}
                    </td>
                    <td style={{ padding: '12px 15px', fontSize: 14 }}>{game.code || '-'}</td>
                    <td style={{ padding: '12px 15px', fontSize: 14 }}>
                      {game.quarkpan ? <a href={game.quarkpan} target="_blank" style={{ color: '#1a73e8' }}>查看</a> : '-'}
                    </td>
                    <td style={{ padding: '12px 15px', fontSize: 14 }}>{game.updatedate || '-'}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <button onClick={() => openEditModal(game)} style={{ padding: '5px 10px', background: '#e8f0fe', color: '#1a73e8', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 5 }}>编辑</button>
                      <button onClick={() => handleDelete(game.id)} style={{ padding: '5px 10px', background: '#fee', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>删除</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '8px 15px', border: '1px solid #ddd', background: 'white', borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            上一页
          </button>
          <span>第 {currentPage} / {totalPages} 页</span>
          <span>共 {filteredGames.length} 条</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '8px 15px', border: '1px solid #ddd', background: 'white', borderRadius: 6, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            下一页
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          justifyContent: 'center', alignItems: 'center'
        }} onClick={() => setShowEditModal(false)}>
          <div style={{ background: 'white', padding: 30, borderRadius: 12, width: '90%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #eee' }}>
              <h2 style={{ fontSize: 18 }}>{editingGame ? '编辑游戏' : '添加游戏'}</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>游戏名称 *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>主分类 1</label>
                  <select value={formData.category1} onChange={e => setFormData({ ...formData, category1: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
                    <option value="">选择分类</option>
                    <option value="任天堂">任天堂</option>
                    <option value="索尼">索尼</option>
                    <option value="PC及安卓">PC及安卓</option>
                    <option value="其他平台">其他平台</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>主分类 2</label>
                  <select value={formData.category2} onChange={e => setFormData({ ...formData, category2: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
                    <option value="">无</option>
                    <option value="任天堂">任天堂</option>
                    <option value="索尼">索尼</option>
                    <option value="PC及安卓">PC及安卓</option>
                    <option value="其他平台">其他平台</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>子分类 1</label>
                  <input type="text" value={formData.subcategory1} onChange={e => setFormData({ ...formData, subcategory1: e.target.value })} placeholder="如: NS, PS4, RPG" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>子分类 2</label>
                  <input type="text" value={formData.subcategory2} onChange={e => setFormData({ ...formData, subcategory2: e.target.value })} placeholder="如: 动作, 冒险" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>提取码</label>
                  <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>解压密码</label>
                  <input type="text" value={formData.unzipcode} onChange={e => setFormData({ ...formData, unzipcode: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
                </div>
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>夸克网盘链接</label>
                <input type="url" value={formData.quarkpan} onChange={e => setFormData({ ...formData, quarkpan: e.target.value })} placeholder="https://pan.quark.cn/s/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>百度网盘链接</label>
                <input type="url" value={formData.baidupan} onChange={e => setFormData({ ...formData, baidupan: e.target.value })} placeholder="https://pan.baidu.com/s/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>迅雷网盘链接</label>
                <input type="url" value={formData.thunderpan} onChange={e => setFormData({ ...formData, thunderpan: e.target.value })} placeholder="https://pan.xunlei.com/s/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 14, color: '#666' }}>更新日期</label>
                <input type="text" value={formData.updatedate} onChange={e => setFormData({ ...formData, updatedate: e.target.value })} placeholder="2026.3.23" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>取消</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          justifyContent: 'center', alignItems: 'center'
        }} onClick={() => setShowImportModal(false)}>
          <div style={{ background: 'white', padding: 30, borderRadius: 12, width: '90%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>📥 导入Excel数据</h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>×</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#666' }}>选择Excel文件（.xlsx）</label>
                <input type="file" ref={fileInputRef} accept=".xlsx" onChange={handleFileSelect} style={{ padding: 10, border: '2px dashed #ddd', borderRadius: 8, width: '100%' }} />
              </div>
              {excelData.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
                    <span style={{ color: '#22c55e' }}>🆕 新增: {diffResult.added.length}</span>
                    <span style={{ color: '#f59e0b' }}>✏️ 修改: {diffResult.modified.length}</span>
                    <span style={{ color: '#666' }}>无变化: {diffResult.unchanged.length}</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowImportModal(false)} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>取消</button>
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
                {excelData.length > 0 ? '重新选择' : '选择文件'}
              </button>
              <button
                onClick={doImport}
                disabled={diffResult.added.length + diffResult.modified.length === 0}
                style={{
                  padding: '10px 20px',
                  background: diffResult.added.length + diffResult.modified.length > 0 ? '#22c55e' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: diffResult.added.length + diffResult.modified.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: 14
                }}
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {importLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(255,255,255,0.9)', zIndex: 3000, display: 'flex',
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 50, height: 50, border: '4px solid #f3f3f3', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
            <p style={{ color: '#666' }}>处理中...</p>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
