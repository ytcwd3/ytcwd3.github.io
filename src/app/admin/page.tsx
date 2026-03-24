'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Game } from '@/lib/supabase'

const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  pc: ['必备软件', '各种合集', '横版过关', '平台跳跃', '战棋策略', 'RPG', '双人', '射击', '动作', '经营', '魂类', '竞速运动', '潜行', '解谜', '格斗无双', '恐怖', '不正经', '小游戏', '修改器金手指', '互动影游', '网游单机', '安卓'],
  ns: ['NS', 'NS乙女'],
  handheld: ['GBA', 'NDS', '3DS', 'GB', 'GBC'],
  console: ['FC', 'SFC', 'N64', 'NGC', 'Wii', 'Wii U'],
  sony: ['PS2', 'PS3', 'PS1', 'PSP', 'PS Vita', 'PS4'],
  other: ['MD', 'SS', 'DC', 'Xbox', '街机', 'Neogeo', 'DOS', '文曲星', '步步高电子词典', 'JAVA', 'J2ME（诺基亚时代java）', '安卓']
}

// category 字段实际存的值（用于数据库查询）
const CATEGORY_DB_VALUE: Record<string, string> = {
  pc: 'PC',
  ns: 'NS',
  handheld: '任天堂掌机',
  console: '任天堂主机',
  sony: '索尼',
  other: 'Ohter'
}

const CATEGORY_NAMES: Record<string, string> = {
  pc: 'PC',
  ns: 'NS',
  handheld: '任天堂掌机',
  console: '任天堂主机',
  sony: '索尼',
  other: 'Other'
}

// UI显示用中文名
const CATEGORY_DISPLAY: Record<string, string> = {
  pc: 'PC',
  ns: 'NS',
  handheld: '任天堂掌机',
  console: '任天堂主机',
  sony: '索尼',
  other: 'Other'
}

const PAGE_SIZE = 20

// 兼容首页分类色的 RGBA 版本
const CAT_RGBA: Record<string, string> = {
  pc: 'var(--pc-android-rgb)',
  ns: 'var(--nintendo-rgb)',
  handheld: 'var(--nintendo-rgb)',
  console: 'var(--nintendo-rgb)',
  sony: 'var(--sony-rgb)',
  other: 'var(--other-rgb)',
}
const CAT_COLOR: Record<string, string> = {
  pc: 'var(--color-pc-android)',
  ns: 'var(--color-nintendo)',
  handheld: 'var(--color-nintendo)',
  console: 'var(--color-nintendo)',
  sony: 'var(--color-sony)',
  other: 'var(--color-other)',
}

export default function AdminDashboard() {
  const [games, setGames] = useState<Game[]>([])
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('pc')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [subcatCounts, setSubcatCounts] = useState<Record<string, number>>({})
  const [allGameMeta, setAllGameMeta] = useState<{ category: string; subcategory: string }[]>([])
  const [statsLoaded, setStatsLoaded] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)

  const [formData, setFormData] = useState({
    name: '', category1: '', category2: '',
    subcategory1: '', subcategory2: '',
    code: '', unzipcode: '', quarkpan: '', baidupan: '', thunderpan: '', updatedate: ''
  })

  const [excelData, setExcelData] = useState<any[]>([])
  const [diffResult, setDiffResult] = useState<any>({ added: [], modified: [], unchanged: [] })
  const [importLoading, setImportLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkAuth()
    loadData(1)
    loadAllMeta() // 一次性加载所有元数据并计算统计
  }, [])

  function checkAuth() {
    const loggedIn = localStorage.getItem('admin_logged_in')
    if (!loggedIn) { window.location.href = '/admin/login'; return }
    setUser(JSON.parse(localStorage.getItem('admin_user') || '{}'))
  }

  async function loadData(page: number = 1) {
    setLoading(true)
    try {
      const from = (page - 1) * PAGE_SIZE
      const to = page * PAGE_SIZE - 1
      const catName = CATEGORY_DB_VALUE[selectedCategory]
      let query = supabase.from('games').select('*', { count: 'exact' })
        .contains('category', [catName])
        .order('id', { ascending: true }).range(from, to)
      const { data, error, count } = await query
      if (error) throw error
      setGames(data || [])
      setFilteredGames(data || [])
      setTotalCount(count || 0)
      setCurrentPage(page)
    } catch (error: any) { alert('加载数据失败: ' + error.message) }
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

  async function applyFilters(page: number = 1) {
    setLoading(true)
    try {
      const from = (page - 1) * PAGE_SIZE
      const to = page * PAGE_SIZE - 1
      let query = supabase.from('games').select('*', { count: 'exact' })
      if (selectedCategory !== 'all') {
        const catName = CATEGORY_DB_VALUE[selectedCategory]
        if (catName) query = query.contains('category', [catName])
      }
      if (selectedSubcategory !== 'all') query = query.contains('subcategory', [selectedSubcategory])
      if (searchKeyword) query = query.ilike('name', `%${searchKeyword}%`)
      const { data, error, count } = await query.order('id', { ascending: true }).range(from, to)
      if (error) throw error
      setFilteredGames(data || [])
      setTotalCount(count || 0)
      setCurrentPage(page)
    } catch (error: any) { alert('筛选失败: ' + error.message) }
    setLoading(false)
  }

  function handleCategoryClick(cat: string) {
    setSelectedCategory(cat); setSelectedSubcategory('all'); setSearchKeyword('')
    applyFilters(1)
    // 从已加载的内存数据计算子分类统计，0个额外请求
    const catName = CATEGORY_DB_VALUE[cat]
    const subcatCountsNew: Record<string, number> = {}
    const subcats = CATEGORY_SUBCATEGORIES[cat] || []
    subcats.forEach(sub => {
      subcatCountsNew[sub] = allGameMeta.filter(g => g.category === catName && g.subcategory === sub).length
    })
    setSubcatCounts(subcatCountsNew)
  }

  function handleSubcategoryClick(sub: string) { setSelectedSubcategory(sub); applyFilters(1) }
  function handleSearch() { applyFilters(1) }

  // 一次性批量加载所有元数据，从内存计算所有统计（替代N个请求）
  async function loadAllMeta() {
    const allMeta: { category: string; subcategory: string }[] = []
    const BATCH = 1000
    let page = 0
    while (true) {
      const from = page * BATCH
      const to = from + BATCH - 1
      const { data, error } = await supabase
        .from('games').select('category, subcategory')
        .order('id', { ascending: true }).range(from, to)
      if (error || !data || data.length === 0) break
      data.forEach((g: any) => allMeta.push({ category: g.category?.[0] || '', subcategory: g.subcategory?.[0] || '' }))
      if (data.length < BATCH) break
      page++
    }
    setAllGameMeta(allMeta)

    // 计算主分类统计
    const catCounts: Record<string, number> = {}
    for (const catKey of Object.keys(CATEGORY_DB_VALUE)) {
      const catName = CATEGORY_DB_VALUE[catKey]
      catCounts[catKey] = allMeta.filter(g => g.category === catName).length
    }
    setCategoryCounts(catCounts)

    // 计算当前选中分类的子分类统计
    const catName = CATEGORY_DB_VALUE[selectedCategory]
    const subcatCountsNew: Record<string, number> = {}
    const subcats = CATEGORY_SUBCATEGORIES[selectedCategory] || []
    subcats.forEach(sub => {
      subcatCountsNew[sub] = allMeta.filter(g => g.category === catName && g.subcategory === sub).length
    })
    setSubcatCounts(subcatCountsNew)
    setStatsLoaded(true)
  }

  function openAddModal() {
    setEditingGame(null)
    setFormData({
      name: '', category1: '', category2: '', subcategory1: '', subcategory2: '',
      code: '', unzipcode: '', quarkpan: '', baidupan: '', thunderpan: '',
      updatedate: new Date().toLocaleDateString('zh-CN').replace(/\//g, '.')
    })
    setShowEditModal(true)
  }

  function openEditModal(game: Game) {
    setEditingGame(game)
    const cats = game.category || []; const subcats = game.subcategory || []
    setFormData({
      name: game.name || '', category1: cats[0] || '', category2: cats[1] || '',
      subcategory1: subcats[0] || '', subcategory2: subcats[1] || '',
      code: game.code || '', unzipcode: game.unzipcode || '',
      quarkpan: game.quarkpan || '', baidupan: game.baidupan || '',
      thunderpan: game.thunderpan || '', updatedate: game.updatedate || ''
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
    const gameData = { name: formData.name, category, subcategory, code: formData.code, unzipcode: formData.unzipcode, quarkpan: formData.quarkpan, baidupan: formData.baidupan, thunderpan: formData.thunderpan, updatedate: formData.updatedate }
    try {
      if (editingGame) {
        const { error } = await supabase.from('games').update(gameData).eq('id', editingGame.id)
        if (error) throw error; alert('更新成功')
      } else {
        const { error } = await supabase.from('games').insert([gameData])
        if (error) throw error; alert('添加成功')
      }
      setShowEditModal(false); loadData(1)
    } catch (error: any) { alert('操作失败: ' + error.message) }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定要删除这条数据吗？')) return
    try {
      const { error } = await supabase.from('games').delete().eq('id', id)
      if (error) throw error; alert('删除成功'); loadData(1)
    } catch (error: any) { alert('删除失败: ' + error.message) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('admin_logged_in'); localStorage.removeItem('admin_user')
    window.location.href = '/admin/login'
  }

  function openImportModal() { setShowImportModal(true); setExcelData([]); setDiffResult({ added: [], modified: [], unchanged: [] }) }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setImportLoading(true)
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
          let startRow = 0
          for (let i = 0; i < Math.min(5, json.length); i++) {
            if (json[i] && json[i][0]) {
              const firstCell = String(json[i][0])
              if (firstCell.includes('游戏名') || (firstCell.includes('共') && firstCell.includes('条'))) { startRow = i + 1; break }
              if (i === 0) startRow = 1
            }
          }
          let defaultCategory: string[] = []; let defaultSubcategory: string[] = []
          const sheetNameUpper = sheetName.toUpperCase()
          if (sheetNameUpper.includes('PC') && !sheetNameUpper.includes('NS')) defaultCategory = ['PC及安卓']
          else if (sheetNameUpper === 'NS' || sheetNameUpper.includes('NS')) { defaultCategory = ['任天堂']; defaultSubcategory = ['NS'] }
          else if (sheetNameUpper.includes('掌机')) defaultCategory = ['任天堂']
          else if (sheetNameUpper.includes('主机')) defaultCategory = ['任天堂']
          else if (sheetNameUpper.includes('索尼') || sheetNameUpper.includes('SONY')) defaultCategory = ['索尼']
          else if (sheetNameUpper.includes('OTHER')) defaultCategory = ['其他平台']
          for (let i = startRow; i < json.length; i++) {
            const row = json[i]; if (!row || !row[0]) continue
            const name = String(row[0] || '').trim(); if (!name) continue
            const category: string[] = []
            const p1 = String(row[1] || '').trim(); const p2 = String(row[2] || '').trim()
            if (p1) category.push(p1); else if (defaultCategory.length) category.push(...defaultCategory)
            if (p2) category.push(p2)
            const subcategory: string[] = []
            const s1 = String(row[3] || '').trim(); const s2 = String(row[4] || '').trim()
            if (s1) subcategory.push(s1); else if (defaultSubcategory.length) subcategory.push(...defaultSubcategory)
            if (s2) subcategory.push(s2)
            allGames.push({ name, category, subcategory, code: String(row[5] || '').trim(), unzipcode: String(row[9] || '').trim(), quarkpan: String(row[6] || '').trim(), baidupan: String(row[7] || '').trim(), thunderpan: String(row[8] || '').trim(), updatedate: String(row[10] || '').trim() })
          }
        })
        setExcelData(allGames); await compareData(allGames)
      } catch (err: any) { alert('读取Excel失败: ' + err.message) }
      setImportLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  async function compareData(excelGames: any[]) {
    const allExisting: Game[] = []; const PAGE_SIZE_FETCH = 1000; let page = 0
    while (true) {
      const from = page * PAGE_SIZE_FETCH; const to = from + PAGE_SIZE_FETCH - 1
      const { data, error } = await supabase.from('games').select('*').order('id', { ascending: true }).range(from, to)
      if (error || !data || data.length === 0) break
      allExisting.push(...(data as Game[]))
      if (data.length < PAGE_SIZE_FETCH) break; page++
    }
    const existingMap = new Map<string, Game>(); allExisting.forEach(g => existingMap.set(g.name, g))
    const result = { added: [], modified: [], unchanged: [] }
    excelGames.forEach(excelGame => {
      const existing = existingMap.get(excelGame.name)
      if (!existing) { result.added.push(excelGame) }
      else {
        const changed = excelGame.quarkpan !== existing.quarkpan || excelGame.baidupan !== existing.baidupan || excelGame.thunderpan !== existing.thunderpan || excelGame.code !== existing.code || JSON.stringify(excelGame.category) !== JSON.stringify(existing.category) || JSON.stringify(excelGame.subcategory) !== JSON.stringify(existing.subcategory)
        if (changed) result.modified.push({ new: excelGame, old: existing })
        else result.unchanged.push(excelGame)
      }
    })
    setDiffResult(result)
  }

  async function doImport() {
    const total = diffResult.added.length + diffResult.modified.length
    if (total === 0) { alert('没有需要导入的数据'); return }
    if (!confirm(`确定要导入 ${total} 条数据吗？\n新增: ${diffResult.added.length}, 修改: ${diffResult.modified.length}`)) return
    setImportLoading(true); let success = 0; let failed = 0
    for (const item of diffResult.modified) {
      try {
        const { error } = await supabase.from('games').update({ category: item.new.category, subcategory: item.new.subcategory, code: item.new.code, unzipcode: item.new.unzipcode, quarkpan: item.new.quarkpan, baidupan: item.new.baidupan, thunderpan: item.new.thunderpan, updatedate: item.new.updatedate }).eq('name', item.new.name)
        if (error) throw error; success++
      } catch { failed++ }
    }
    for (const game of diffResult.added) {
      try {
        const { error } = await supabase.from('games').insert([{ name: game.name, category: game.category, subcategory: game.subcategory, code: game.code, unzipcode: game.unzipcode, quarkpan: game.quarkpan, baidupan: game.baidupan, thunderpan: game.thunderpan, updatedate: game.updatedate }])
        if (error) throw error; success++
      } catch { failed++ }
    }
    setImportLoading(false); setShowImportModal(false)
    alert(`导入完成！成功: ${success}, 失败: ${failed}`); loadData(1)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1
  const startIndex = (currentPage - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalCount)

  // 通用卡片样式
  const cardStyle = { background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid rgba(255,255,255,0.6)', marginBottom: '20px' }
  const inputStyle = { width: '100%' as const, padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: 'rgba(255,255,255,0.9)', color: 'var(--text-primary)', transition: 'all var(--transition-fast)', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }

  return (
    <>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #d857e8 0%, #9333ea 100%)', color: 'white', padding: '14px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(216,87,232,0.3)' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>游戏数据库管理后台</h1>
          <p style={{ fontSize: '12px', margin: '2px 0 0', opacity: 0.85 }}>单游仓鼠 · 游戏资源管理</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '13px', opacity: 0.9 }}>👤 {user?.github || user?.email}</span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '7px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>退出登录</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {Object.keys(CATEGORY_NAMES).map(key => (
            <div key={key} onClick={() => handleCategoryClick(key)} style={{
              flex: 1, minWidth: 120, background: selectedCategory === key
                ? `rgba(${CAT_RGBA[key]}, 0.12)`
                : 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 'var(--radius-md)', padding: '14px 12px', cursor: 'pointer',
              textAlign: 'center', border: `2px solid ${selectedCategory === key ? `rgba(${CAT_RGBA[key]}, 0.4)` : 'rgba(255,255,255,0.6)'}`,
              boxShadow: selectedCategory === key ? `0 4px 12px rgba(${CAT_RGBA[key]}, 0.2)` : 'var(--shadow-sm)',
              transition: 'all 0.2s'
            }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>{CATEGORY_DISPLAY[key]}</h3>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: `rgba(${CAT_RGBA[key]}, 0.9)` }}>{categoryCounts[key] || 0}</div>
            </div>
          ))}
        </div>

        {/* Subcategory Filter */}
        <div style={{ ...cardStyle }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: selectedSubcategory !== 'all' ? '12px' : 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>子分类：</span>
            <button onClick={() => handleSubcategoryClick('all')} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', cursor: 'pointer',
              border: `1px solid ${selectedSubcategory === 'all' ? CAT_COLOR[selectedCategory] : 'var(--border-light)'}`,
              backgroundColor: selectedSubcategory === 'all' ? `rgba(${CAT_RGBA[selectedCategory]}, 0.12)` : 'rgba(255,255,255,0.8)',
              color: selectedSubcategory === 'all' ? CAT_COLOR[selectedCategory] : 'var(--text-secondary)',
              fontWeight: selectedSubcategory === 'all' ? 600 : 400,
              transition: 'all 0.2s'
            }}>全部 ({totalCount})</button>
            {(CATEGORY_SUBCATEGORIES[selectedCategory] || []).map(sub => (
              subcatCounts[sub] > 0 && (
                <button key={sub} onClick={() => handleSubcategoryClick(sub)} style={{
                  padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer',
                  border: `1px solid ${selectedSubcategory === sub ? CAT_COLOR[selectedCategory] : 'var(--border-light)'}`,
                  backgroundColor: selectedSubcategory === sub ? `rgba(${CAT_RGBA[selectedCategory]}, 0.15)` : 'rgba(255,255,255,0.7)',
                  color: selectedSubcategory === sub ? CAT_COLOR[selectedCategory] : 'var(--text-secondary)',
                  fontWeight: selectedSubcategory === sub ? 600 : 400,
                  transition: 'all 0.2s'
                }}>{sub} ({subcatCounts[sub]})</button>
              )
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ ...cardStyle, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '15px 20px' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input type="text" placeholder="搜索游戏名称..." value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ ...inputStyle }}
            />
          </div>
          <button onClick={openImportModal} style={{ padding: '9px 20px', background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 3px 8px rgba(216,87,232,0.25)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>📥 导入Excel</button>
          <button onClick={openAddModal} style={{ padding: '9px 20px', background: 'linear-gradient(90deg, var(--secondary-color), var(--primary-color))', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 3px 8px rgba(147,51,234,0.25)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>+ 添加游戏</button>
          <button onClick={() => loadData(1)} style={{ padding: '9px 20px', background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>🔄 刷新</button>
        </div>

        {/* Table */}
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div className="loading" style={{ justifyContent: 'center' }} />
              <p style={{ marginTop: '10px', fontSize: '14px' }}>加载中...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="empty-state-icon">🎮</div>
              <div className="empty-state-text">暂无数据</div>
              <div className="empty-state-subtext">试试其他分类或关键词搜索</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(216,87,232,0.06)' }}>
                    {['ID', '游戏名称', '主分类', '子分类', '提取码', '夸克链接', '更新日期', '操作'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.map((game, idx) => {
                    const catKey = getCategoryKey(game.subcategory || [])
                    return (
                      <tr key={game.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s', background: idx % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(216,87,232,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)')}>
                        <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{startIndex + idx}</td>
                        <td style={{ padding: '11px 14px', fontSize: '14px' }}><strong style={{ color: 'var(--text-primary)' }}>{game.name}</strong></td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600, background: `rgba(${CAT_RGBA[catKey]}, 0.12)`, color: `rgba(${CAT_RGBA[catKey]}, 0.9)`, border: `1px solid rgba(${CAT_RGBA[catKey]}, 0.25)` }}>{CATEGORY_NAMES[catKey]}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {(game.subcategory || []).map(s => (
                              <span key={s} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: `rgba(${CAT_RGBA[catKey]}, 0.08)`, color: `rgba(${CAT_RGBA[catKey]}, 0.8)`, border: `1px solid rgba(${CAT_RGBA[catKey]}, 0.15)` }}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{game.code || '-'}</td>
                        <td style={{ padding: '11px 14px', fontSize: '13px' }}>{game.quarkpan ? <a href={game.quarkpan} target="_blank" className="resource-link">查看</a> : '-'}</td>
                        <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{game.updatedate || '-'}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <button onClick={() => openEditModal(game)} style={{ padding: '5px 12px', background: 'rgba(33,150,243,0.1)', color: 'var(--color-sony)', border: '1px solid rgba(33,150,243,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, marginRight: '5px', transition: 'all 0.2s' }}>编辑</button>
                          <button onClick={() => handleDelete(game.id)} style={{ padding: '5px 12px', background: 'rgba(229,57,53,0.08)', color: 'var(--color-nintendo)', border: '1px solid rgba(229,57,53,0.15)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, transition: 'all 0.2s' }}>删除</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '15px' }}>
          <button onClick={() => applyFilters(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '8px 16px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-sm)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', opacity: currentPage === 1 ? 0.5 : 1, transition: 'all 0.2s' }}>上一页</button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 12px', background: 'rgba(216,87,232,0.08)', borderRadius: 'var(--radius-sm)' }}>第 {currentPage} / {totalPages} 页 · 共 {totalCount} 条</span>
          <button onClick={() => applyFilters(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '8px 16px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-sm)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)', opacity: currentPage === totalPages ? 0.5 : 1, transition: 'all 0.2s' }}>下一页</button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="popup-mask" style={{ display: 'flex' }} onClick={() => setShowEditModal(false)}>
          <div className="popup-content" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{editingGame ? '编辑游戏' : '添加游戏'}</h2>
              <button onClick={() => setShowEditModal(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>游戏名称 *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>主分类 1</label>
                  <select value={formData.category1} onChange={e => setFormData({ ...formData, category1: e.target.value })} style={{ ...inputStyle }}>
                    <option value="">选择分类</option>
                    <option value="任天堂">任天堂</option><option value="索尼">索尼</option><option value="PC及安卓">PC及安卓</option><option value="其他平台">其他平台</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>主分类 2</label>
                  <select value={formData.category2} onChange={e => setFormData({ ...formData, category2: e.target.value })} style={{ ...inputStyle }}>
                    <option value="">无</option>
                    <option value="任天堂">任天堂</option><option value="索尼">索尼</option><option value="PC及安卓">PC及安卓</option><option value="其他平台">其他平台</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>子分类 1</label>
                  <input type="text" value={formData.subcategory1} onChange={e => setFormData({ ...formData, subcategory1: e.target.value })} placeholder="如: NS, PS4, RPG" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>子分类 2</label>
                  <input type="text" value={formData.subcategory2} onChange={e => setFormData({ ...formData, subcategory2: e.target.value })} placeholder="如: 动作, 冒险" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>提取码</label>
                  <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>解压密码</label>
                  <input type="text" value={formData.unzipcode} onChange={e => setFormData({ ...formData, unzipcode: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>夸克网盘链接</label>
                <input type="url" value={formData.quarkpan} onChange={e => setFormData({ ...formData, quarkpan: e.target.value })} placeholder="https://pan.quark.cn/s/..." style={inputStyle} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>百度网盘链接</label>
                <input type="url" value={formData.baidupan} onChange={e => setFormData({ ...formData, baidupan: e.target.value })} placeholder="https://pan.baidu.com/s/..." style={inputStyle} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>迅雷网盘链接</label>
                <input type="url" value={formData.thunderpan} onChange={e => setFormData({ ...formData, thunderpan: e.target.value })} placeholder="https://pan.xunlei.com/s/..." style={inputStyle} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>更新日期</label>
                <input type="text" value={formData.updatedate} onChange={e => setFormData({ ...formData, updatedate: e.target.value })} placeholder="2026.3.23" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-light)' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '9px 20px', background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px' }}>取消</button>
                <button type="submit" style={{ padding: '9px 24px', background: 'linear-gradient(90deg, var(--success-color), var(--primary-color))', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 3px 8px rgba(129,199,132,0.3)' }}>保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="popup-mask" style={{ display: 'flex' }} onClick={() => setShowImportModal(false)}>
          <div className="popup-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>📥 导入Excel数据</h2>
              <button onClick={() => setShowImportModal(false)} className="close-btn">×</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>选择Excel文件（.xlsx）</label>
              <input type="file" ref={fileInputRef} accept=".xlsx" onChange={handleFileSelect} style={{ padding: 10, border: '2px dashed var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', boxSizing: 'border-box' as const, fontSize: '13px', background: 'rgba(255,255,255,0.9)' }} />
            </div>
            {excelData.length > 0 && (
              <div style={{ display: 'flex', gap: '15px', marginBottom: 15, padding: '12px', background: 'rgba(216,87,232,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(216,87,232,0.1)' }}>
                <span style={{ color: 'var(--success-color)', fontWeight: 600, fontSize: '13px' }}>🆕 新增: {diffResult.added.length}</span>
                <span style={{ color: 'var(--warning-color)', fontWeight: 600, fontSize: '13px' }}>✏️ 修改: {diffResult.modified.length}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>无变化: {diffResult.unchanged.length}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 20 }}>
              <button onClick={() => setShowImportModal(false)} style={{ padding: '9px 20px', background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px' }}>取消</button>
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '9px 20px', background: 'linear-gradient(90deg, var(--secondary-color), var(--primary-color))', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 3px 8px rgba(147,51,234,0.25)' }}>{excelData.length > 0 ? '重新选择' : '选择文件'}</button>
              <button onClick={doImport} disabled={diffResult.added.length + diffResult.modified.length === 0} style={{ padding: '9px 24px', background: diffResult.added.length + diffResult.modified.length > 0 ? 'linear-gradient(90deg, var(--success-color), var(--primary-color))' : 'var(--bg-disabled)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: diffResult.added.length + diffResult.modified.length > 0 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600, boxShadow: diffResult.added.length + diffResult.modified.length > 0 ? '0 3px 8px rgba(129,199,132,0.3)' : 'none', opacity: diffResult.added.length + diffResult.modified.length === 0 ? 0.6 : 1 }}>确认导入</button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {importLoading && (
        <div className="popup-mask" style={{ display: 'flex', background: 'rgba(255,255,255,0.92)' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading" style={{ justifyContent: 'center' }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '14px' }}>处理中，请稍候...</p>
          </div>
        </div>
      )}
    </>
  )
}
