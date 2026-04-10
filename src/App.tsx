import { useState, useEffect, useCallback } from 'react'
import './index.css'

/**
 * 地鼠位置类型
 */
type MolePosition = number | null

/**
 * 游戏状态枚举
 */
enum GameState {
  START = 'start',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LEVEL_COMPLETE = 'level_complete',
  RESULT = 'result'
}

/**
 * 关卡配置
 */
interface LevelConfig {
  level: number
  targetScore: number
  duration: number
  moleSpeed: number
  moleCount: number
}

/**
 * 关卡配置数据
 */
const LEVELS: LevelConfig[] = [
  { level: 1, targetScore: 30, duration: 60, moleSpeed: 2000, moleCount: 1 },
  { level: 2, targetScore: 60, duration: 60, moleSpeed: 1700, moleCount: 1 },
  { level: 3, targetScore: 100, duration: 60, moleSpeed: 1400, moleCount: 2 },
  { level: 4, targetScore: 150, duration: 60, moleSpeed: 1100, moleCount: 2 },
  { level: 5, targetScore: 220, duration: 60, moleSpeed: 800, moleCount: 3 },
]

/**
 * 音效控制器
 */
class SoundController {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    try {
      this.audioContext = new AudioContext()
    } catch (e) {
      console.warn('Audio context not supported')
    }
  }

  /**
   * 播放击中音效
   */
  playHit(): void {
    if (!this.enabled || !this.audioContext) return
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  /**
   * 播放关卡切换音效
   */
  playLevelUp(): void {
    if (!this.enabled || !this.audioContext) return
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    oscillator.frequency.value = 600
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.3)
  }

  /**
   * 播放胜利音效
   */
  playWin(): void {
    if (!this.enabled || !this.audioContext) return
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      const oscillator = this.audioContext!.createOscillator()
      const gainNode = this.audioContext!.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext!.destination)
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, this.audioContext!.currentTime + i * 0.15)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + i * 0.15 + 0.2)
      oscillator.start(this.audioContext!.currentTime + i * 0.15)
      oscillator.stop(this.audioContext!.currentTime + i * 0.15 + 0.2)
    })
  }

  /**
   * 播放失败音效
   */
  playLose(): void {
    if (!this.enabled || !this.audioContext) return
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    oscillator.frequency.value = 200
    oscillator.type = 'sawtooth'
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5)
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.5)
  }

  /**
   * 切换音效开关
   */
  toggle(): boolean {
    this.enabled = !this.enabled
    return this.enabled
  }

  /**
   * 获取音效状态
   */
  isEnabled(): boolean {
    return this.enabled
  }
}

// 创建全局音效控制器
const soundController = new SoundController()

/**
 * App 组件 - 打地鼠游戏主组件
 * @returns {React.JSX.Element} 游戏主组件
 */
function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START)
  const [currentLevel, setCurrentLevel] = useState<number>(0)
  const [score, setScore] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(60)
  const [activeMole, setActiveMole] = useState<MolePosition>(null)
  const [isGoldenMole, setIsGoldenMole] = useState<boolean>(false)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [gameResult, setGameResult] = useState<{ win: boolean; finalScore: number } | null>(null)
  const [completedLevel, setCompletedLevel] = useState<number>(0)
  const [hitPosition, setHitPosition] = useState<number | null>(null)

  const config = LEVELS[currentLevel] || LEVELS[LEVELS.length - 1]

  /**
   * 随机显示地鼠
   */
  const showMole = useCallback(() => {
    if (gameState !== GameState.PLAYING) return
    
    const position = Math.floor(Math.random() * 9)
    const isGolden = Math.random() < 0.2 // 20% 概率出现金色地鼠
    setActiveMole(position)
    setIsGoldenMole(isGolden)

    const speed = config.moleSpeed * (0.8 + Math.random() * 0.4) // 随机速度波动
    setTimeout(() => {
      setActiveMole(null)
      if (gameState === GameState.PLAYING) {
        showMole()
      }
    }, speed)
  }, [gameState, config.moleSpeed])

  /**
   * 处理地鼠点击
   */
  const handleMoleClick = useCallback((position: number) => {
    if (activeMole !== position || gameState !== GameState.PLAYING) return

    const points = isGoldenMole ? 20 : 10
    setScore(prev => prev + points)
    setHitPosition(position)
    soundController.playHit()
    
    // 显示打击效果后隐藏
    setTimeout(() => {
      setHitPosition(null)
      setActiveMole(null)
    }, 150)
  }, [activeMole, gameState, isGoldenMole])

  /**
   * 开始游戏
   */
  const startGame = useCallback(() => {
    setGameState(GameState.PLAYING)
    setCurrentLevel(0)
    setScore(0)
    setTimeLeft(LEVELS[0].duration)
    setGameResult(null)
    soundController.playLevelUp()
  }, [])

  /**
   * 暂停/继续游戏
   */
  const togglePause = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED)
      setActiveMole(null) // 隐藏地鼠
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING)
    }
  }, [gameState])

  /**
   * 继续下一关
   */
  const nextLevel = useCallback(() => {
    setCurrentLevel(completedLevel + 1)
    setScore(0)
    setTimeLeft(LEVELS[completedLevel + 1].duration)
    setGameState(GameState.PLAYING)
    soundController.playLevelUp()
  }, [completedLevel])

  /**
   * 重新开始当前关
   */
  const retryLevel = useCallback(() => {
    setScore(0)
    setTimeLeft(LEVELS[currentLevel].duration)
    setGameState(GameState.PLAYING)
  }, [currentLevel])

  /**
   * 切换音效
   */
  const toggleSound = useCallback(() => {
    const enabled = soundController.toggle()
    setSoundEnabled(enabled)
  }, [])

  /**
   * 检查关卡完成
   */
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return

    if (score >= config.targetScore) {
      if (currentLevel < LEVELS.length - 1) {
        // 进入下一关前显示确认
        setCompletedLevel(currentLevel)
        setGameState(GameState.LEVEL_COMPLETE)
        soundController.playLevelUp()
      } else {
        // 游戏胜利
        setTimeout(() => {
          setGameState(GameState.RESULT)
          setGameResult({ win: true, finalScore: score })
          soundController.playWin()
        }, 500)
      }
    }
  }, [score, config.targetScore, currentLevel, gameState])

  /**
   * 倒计时
   */
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // 时间到，检查是否通关
          if (score >= config.targetScore) {
            if (currentLevel < LEVELS.length - 1) {
              setCurrentLevel(c => c + 1)
              setScore(0)
              return LEVELS[currentLevel + 1].duration
            } else {
              setGameState(GameState.RESULT)
              setGameResult({ win: true, finalScore: score })
              soundController.playWin()
              return 0
            }
          } else {
            // 游戏失败
            setGameState(GameState.RESULT)
            setGameResult({ win: false, finalScore: score })
            soundController.playLose()
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, config.targetScore, currentLevel, score])

  /**
   * 开始显示地鼠
   */
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      showMole()
    }
  }, [gameState, showMole])

  /**
   * 渲染启动界面
   */
  const renderStartScreen = () => (
    <div className="start-screen">
      <h1>🎮 打地鼠</h1>
      <div className="start-buttons">
        <button className="btn btn-primary" onClick={startGame}>
          🚀 开始游戏
        </button>
        <button className="btn btn-secondary" onClick={() => window.close()}>
          ❌ 退出游戏
        </button>
      </div>
      <button className="btn btn-sound" onClick={toggleSound}>
        {soundEnabled ? '🔊 音效开' : '🔇 音效关'}
      </button>
    </div>
  )

  /**
   * 渲染游戏界面
   */
  const renderGameScreen = () => (
    <div className={`game-screen ${gameState === GameState.PAUSED ? 'paused' : ''}`}>
      <div className="game-header">
        <div className="stat">
          <span className="stat-label">关卡</span>
          <span className="stat-value">{currentLevel + 1}</span>
        </div>
        <div className="stat">
          <span className="stat-label">分数</span>
          <span className="stat-value">{score} / {config.targetScore}</span>
        </div>
        <div className="stat">
          <span className="stat-label">时间</span>
          <span className={`stat-value ${timeLeft <= 10 ? 'warning' : ''}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className="mole-grid">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className={`mole-hole ${activeMole === index ? 'active' : ''} ${hitPosition === index ? 'hit' : ''}`}
            onClick={() => handleMoleClick(index)}
          >
            {activeMole === index && gameState === GameState.PLAYING && (
              <div className={`mole ${isGoldenMole ? 'golden' : ''}`} />
            )}
          </div>
        ))}
      </div>

      <div className="game-controls">
        <button className="btn btn-pause" onClick={togglePause}>
          {gameState === GameState.PAUSED ? '▶️ 继续' : '⏸️ 暂停'}
        </button>
        <button className="btn btn-sound" onClick={toggleSound}>
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {gameState === GameState.PAUSED && (
        <div className="pause-overlay">
          <div className="pause-content">
            <div className="pause-icon">⏸️</div>
            <h2>游戏暂停</h2>
            <button className="btn btn-primary" onClick={togglePause}>
              ▶️ 继续游戏
            </button>
          </div>
        </div>
      )}
    </div>
  )

  /**
   * 渲染关卡完成界面
   */
  const renderLevelCompleteScreen = () => (
    <div className="result-screen">
      <div className="result-icon">🎉</div>
      <h2>关卡完成！</h2>
      <p className="result-score">第 {completedLevel + 1} 关已完成</p>
      <p className="result-score">得分：{score}</p>
      <div className="result-buttons">
        <button className="btn btn-primary" onClick={nextLevel}>
          🚀 继续下一关
        </button>
        <button className="btn btn-secondary" onClick={retryLevel}>
          🔄 重新挑战
        </button>
      </div>
    </div>
  )

  /**
   * 渲染结果界面
   */
  const renderResultScreen = () => (
    <div className="result-screen">
      <div className="result-icon">
        {gameResult?.win ? '🏆' : '😢'}
      </div>
      <h2>{gameResult?.win ? '恭喜通关！' : '游戏结束'}</h2>
      <p className="result-score">最终分数：{gameResult?.finalScore}</p>
      {gameResult?.win && (
        <p className="result-score">通关所有 {LEVELS.length} 个关卡！</p>
      )}
      <div className="result-buttons">
        <button className="btn btn-primary" onClick={startGame}>
          🔄 重新开始
        </button>
        <button className="btn btn-secondary" onClick={() => setGameState(GameState.START)}>
          🏠 返回主页
        </button>
      </div>
    </div>
  )

  return (
    <div className="app">
      {gameState === GameState.START && renderStartScreen()}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && renderGameScreen()}
      {gameState === GameState.LEVEL_COMPLETE && renderLevelCompleteScreen()}
      {gameState === GameState.RESULT && renderResultScreen()}
    </div>
  )
}

export default App
