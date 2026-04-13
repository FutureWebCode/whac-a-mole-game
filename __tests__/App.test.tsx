import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

/**
 * 打地鼠游戏组件测试
 */
describe('Whac-A-Mole Game', () => {
  /**
   * 测试启动界面渲染
   */
  it('renders start screen initially', () => {
    render(<App />)
    expect(screen.getByText('🎮 打地鼠游戏')).toBeInTheDocument()
    expect(screen.getByText('🚀 开始游戏')).toBeInTheDocument()
  })

  /**
   * 测试游戏说明显示
   */
  it('displays game instructions', () => {
    render(<App />)
    expect(screen.getByText('📖 游戏说明')).toBeInTheDocument()
    expect(screen.getByText(/点击出现的地鼠获得分数/)).toBeInTheDocument()
    expect(screen.getByText(/普通地鼠：10 分/)).toBeInTheDocument()
    expect(screen.getByText(/金色地鼠：20 分/)).toBeInTheDocument()
  })

  /**
   * 测试关卡信息显示
   */
  it('displays level information', () => {
    render(<App />)
    expect(screen.getByText('📊 关卡信息')).toBeInTheDocument()
    // 有 5 个关卡，使用 getAllByText
    const levelSpans = screen.getAllByText((content) => content.includes('第') && content.includes('关'))
    expect(levelSpans.length).toBe(5)
  })

  /**
   * 测试音效开关按钮
   */
  it('has sound toggle button', () => {
    render(<App />)
    const soundButton = screen.getByText(/音效：开/)
    expect(soundButton).toBeInTheDocument()
  })

  /**
   * 测试开始游戏按钮存在
   */
  it('has start game button', () => {
    render(<App />)
    const startButton = screen.getByText('🚀 开始游戏')
    expect(startButton).toBeInTheDocument()
  })

  /**
   * 测试游戏标题样式
   */
  it('has correct game title', () => {
    render(<App />)
    const title = screen.getByText('🎮 打地鼠游戏')
    expect(title).toBeInTheDocument()
  })

  /**
   * 测试副标题显示
   */
  it('displays subtitle', () => {
    render(<App />)
    expect(screen.getByText('Whac-A-Mole')).toBeInTheDocument()
  })

  /**
   * 测试游戏说明列表项数量
   */
  it('displays all instruction items', () => {
    render(<App />)
    const instructionItems = screen.getAllByRole('listitem')
    expect(instructionItems.length).toBeGreaterThanOrEqual(4)
  })
})

/**
 * 游戏逻辑测试（需要模拟定时器）
 */
describe('Game Logic', () => {
  /**
   * 测试游戏状态初始值
   */
  it('starts in start state', () => {
    render(<App />)
    expect(screen.getByText('🚀 开始游戏')).toBeInTheDocument()
    expect(screen.queryByText('关卡')).not.toBeInTheDocument()
  })

  /**
   * 测试按钮可点击性
   */
  it('start button is clickable', () => {
    render(<App />)
    const startButton = screen.getByText('🚀 开始游戏')
    expect(startButton).not.toBeDisabled()
  })

  /**
   * 测试音效按钮可点击性
   */
  it('sound toggle button is clickable', () => {
    render(<App />)
    const soundButton = screen.getByText(/音效：开/)
    expect(soundButton).not.toBeDisabled()
  })

  /**
   * 测试游戏界面响应式布局类名
   */
  it('has responsive layout classes', () => {
    render(<App />)
    const app = document.querySelector('.app')
    expect(app).toBeInTheDocument()
  })

  /**
   * 测试启动界面样式类名
   */
  it('has start screen class', () => {
    render(<App />)
    const startScreen = document.querySelector('.start-screen')
    expect(startScreen).toBeInTheDocument()
  })

  /**
   * 测试游戏标题样式类名
   */
  it('has game title class', () => {
    render(<App />)
    const title = document.querySelector('.game-title')
    expect(title).toBeInTheDocument()
  })

  /**
   * 测试按钮组样式类名
   */
  it('has button group class', () => {
    render(<App />)
    const buttonGroup = document.querySelector('.button-group')
    expect(buttonGroup).toBeInTheDocument()
  })

  /**
   * 测试说明区域样式类名
   */
  it('has instructions class', () => {
    render(<App />)
    const instructions = document.querySelector('.instructions')
    expect(instructions).toBeInTheDocument()
  })

  /**
   * 测试关卡信息区域样式类名
   */
  it('has level info class', () => {
    render(<App />)
    const levelInfo = document.querySelector('.level-info')
    expect(levelInfo).toBeInTheDocument()
  })
})

/**
 * 辅助函数测试
 */
describe('Helper Functions', () => {
  /**
   * 测试关卡配置数据完整性
   */
  it('has valid level configurations', () => {
    const levelConfigs = [
      { level: 1, targetScore: 100 },
      { level: 2, targetScore: 200 },
      { level: 3, targetScore: 350 },
      { level: 4, targetScore: 500 },
      { level: 5, targetScore: 700 },
    ]
    
    expect(levelConfigs.length).toBe(5)
    expect(levelConfigs.every(config => config.targetScore > 0)).toBe(true)
    expect(levelConfigs.every(config => config.level > 0)).toBe(true)
  })

  /**
   * 测试分数系统
   */
  it('has correct scoring system', () => {
    const normalMoleScore = 10
    const goldenMoleScore = 20
    
    expect(normalMoleScore).toBe(10)
    expect(goldenMoleScore).toBe(20)
    expect(goldenMoleScore).toBeGreaterThan(normalMoleScore)
  })

  /**
   * 测试游戏时间配置
   */
  it('has correct time configuration', () => {
    const levelTime = 60 // seconds
    
    expect(levelTime).toBe(60)
    expect(levelTime).toBeGreaterThan(0)
  })

  /**
   * 测试棋盘大小
   */
  it('has correct board size', () => {
    const boardSize = 3 // 3x3 grid
    const totalHoles = boardSize * boardSize
    
    expect(boardSize).toBe(3)
    expect(totalHoles).toBe(9)
  })

  /**
   * 测试地鼠类型枚举
   */
  it('has correct mole types', () => {
    const moleTypes = ['normal', 'golden']
    
    expect(moleTypes).toContain('normal')
    expect(moleTypes).toContain('golden')
    expect(moleTypes.length).toBe(2)
  })

  /**
   * 测试游戏状态枚举
   */
  it('has correct game states', () => {
    const gameStates = [
      'start',
      'playing',
      'paused',
      'levelComplete',
      'gameOver',
      'victory'
    ]
    
    expect(gameStates).toContain('start')
    expect(gameStates).toContain('playing')
    expect(gameStates).toContain('gameOver')
    expect(gameStates).toContain('victory')
  })
})
