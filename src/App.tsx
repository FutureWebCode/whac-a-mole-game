import { useState, useEffect, useCallback, useRef } from 'react'
import './index.css'

/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 地鼠类型枚举
 */
type MoleType = 'normal' | 'golden' | null

/**
 * 定时器类型（兼容浏览器）
 */
type TimerId = ReturnType<typeof setTimeout>

/**
 * 地鼠状态接口
 */
interface Mole {
  id: number
  type: MoleType
  isVisible: boolean
}

/**
 * 游戏状态枚举
 */
type GameState = 'start' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'victory'

/**
 * 关卡配置接口
 */
interface LevelConfig {
  level: number
  targetScore: number
  moleSpeed: number
  moleStayTime: number
  goldenMoleChance: number
  simultaneousMoles: number
}

/**
 * 关卡配置数据 - 5 个关卡，难度递增
 */
const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, targetScore: 100, moleSpeed: 1500, moleStayTime: 1200, goldenMoleChance: 0.1, simultaneousMoles: 1 },
  { level: 2, targetScore: 200, moleSpeed: 1200, moleStayTime: 1000, goldenMoleChance: 0.15, simultaneousMoles: 2 },
  { level: 3, targetScore: 350, moleSpeed: 1000, moleStayTime: 800, goldenMoleChance: 0.2, simultaneousMoles: 2 },
  { level: 4, targetScore: 500, moleSpeed: 800, moleStayTime: 600, goldenMoleChance: 0.25, simultaneousMoles: 3 },
  { level: 5, targetScore: 700, moleSpeed: 600, moleStayTime: 500, goldenMoleChance: 0.3, simultaneousMoles: 3 },
]

/**
 * 音效控制器 - 使用 Web Audio API 生成简单音效
 */
const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled || !audioContextRef.current) return
    
    const audioContext = audioContextRef.current
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = type
    oscillator.start()
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
    oscillator.stop(audioContext.currentTime + duration)
  }, [soundEnabled])

  const playHitSound = useCallback(() => {
    playTone(523.25, 0.1, 'sine') // C5
  }, [playTone])

  const playGoldenHitSound = useCallback(() => {
    playTone(783.99, 0.15, 'triangle') // G5
    setTimeout(() => playTone(1046.50, 0.1, 'triangle'), 50) // C6
  }, [playTone])

  const playMissSound = useCallback(() => {
    playTone(196.00, 0.2, 'sawtooth') // G3
  }, [playTone])

  const playLevelCompleteSound = useCallback(() => {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'sine'), i * 100)
    })
  }, [playTone])

  const playGameOverSound = useCallback(() => {
    [392.00, 349.23, 311.13, 261.63].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sawtooth'), i * 150)
    })
  }, [playTone])

  const playVictorySound = useCallback(() => {
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, 'triangle'), i * 80)
    })
  }, [playTone])

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev)
  }, [])

  return {
    initAudio,
    playHitSound,
    playGoldenHitSound,
    playMissSound,
    playLevelCompleteSound,
    playGameOverSound,
    playVictorySound,
    soundEnabled,
    toggleSound
  }
}

/**
 * 打地鼠游戏主组件
 * @returns {React.JSX.Element} 游戏主界面
 */
function App() {
  // 游戏状态
  const [gameState, setGameState] = useState<GameState>('start')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  
  // 地鼠状态 - 9 个洞
  const [moles, setMoles] = useState<Mole[]>(
    Array.from({ length: 9 }, (_, i) => ({ id: i, type: null, isVisible: false }))
  )
  
  // 游戏统计
  const [totalHits, setTotalHits] = useState(0)
  const [goldenHits, setGoldenHits] = useState(0)
  const [missedClicks, setMissedClicks] = useState(0)
  
  // 音效
  const {
    initAudio,
    playHitSound,
    playGoldenHitSound,
    playMissSound,
    playLevelCompleteSound,
    playGameOverSound,
    playVictorySound,
    soundEnabled,
    toggleSound
  } = useSound()
  
  // 计时器引用
  const gameTimerRef = useRef<TimerId | null>(null)
  const moleTimerRef = useRef<TimerId | null>(null)
  const hideTimerRef = useRef<TimerId | null>(null)

  /**
   * 随机显示地鼠
   */
  const showMole = useCallback(() => {
    const config = LEVEL_CONFIGS[currentLevel - 1]
    if (!config) return

    setMoles(prevMoles => {
      // 找出当前隐藏的地鼠洞
      const hiddenIndices = prevMoles
        .map((mole, index) => (!mole.isVisible ? index : -1))
        .filter(index => index !== -1)
      
      if (hiddenIndices.length === 0) return prevMoles

      // 随机选择一个地鼠洞
      const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)]
      
      // 决定是否是金色地鼠
      const isGolden = Math.random() < config.goldenMoleChance
      const newMoles = [...prevMoles]
      newMoles[randomIndex] = {
        ...newMoles[randomIndex],
        type: isGolden ? 'golden' : 'normal',
        isVisible: true
      }

      // 设置自动隐藏定时器
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
      
      hideTimerRef.current = setTimeout(() => {
        setMoles(currentMoles => {
          const updatedMoles = [...currentMoles]
          if (updatedMoles[randomIndex] && updatedMoles[randomIndex].isVisible) {
            updatedMoles[randomIndex] = { ...updatedMoles[randomIndex], isVisible: false, type: null }
          }
          return updatedMoles
        })
      }, config.moleStayTime)

      return newMoles
    })

    // 安排下一个地鼠出现
    if (gameState === 'playing') {
      moleTimerRef.current = setTimeout(showMole, config.moleSpeed)
    }
  }, [currentLevel, gameState])

  /**
   * 开始游戏
   */
  const startGame = useCallback(() => {
    initAudio()
    setCurrentLevel(1)
    setScore(0)
    setTimeLeft(60)
    setTotalHits(0)
    setGoldenHits(0)
    setMissedClicks(0)
    setMoles(Array.from({ length: 9 }, (_, i) => ({ id: i, type: null, isVisible: false })))
    setGameState('playing')
  }, [initAudio])

  /**
   * 开始当前关卡
   */
  const startLevel = useCallback(() => {
    const config = LEVEL_CONFIGS[currentLevel - 1]
    if (!config) return

    setTimeLeft(60)
    setScore(0)
    setMoles(Array.from({ length: 9 }, (_, i) => ({ id: i, type: null, isVisible: false })))
    setGameState('playing')
  }, [currentLevel])

  /**
   * 暂停游戏
   */
  const pauseGame = useCallback(() => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current)
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setGameState('paused')
  }, [])

  /**
   * 继续游戏
   */
  const resumeGame = useCallback(() => {
    setGameState('playing')
  }, [])

  /**
   * 结束游戏
   */
  const endGame = useCallback(() => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current)
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setGameState('gameOver')
    playGameOverSound()
  }, [playGameOverSound])

  /**
   * 点击地鼠
   * @param {number} moleId - 地鼠 ID
   */
  const hitMole = useCallback((moleId: number) => {
    setMoles(prevMoles => {
      const mole = prevMoles[moleId]
      if (!mole || !mole.isVisible) {
        // 点击空位置，记录失误
        setMissedClicks(prev => prev + 1)
        playMissSound()
        return prevMoles
      }

      // 击中地鼠
      const points = mole.type === 'golden' ? 20 : 10
      setScore(prev => prev + points)
      setTotalHits(prev => prev + 1)
      
      if (mole.type === 'golden') {
        setGoldenHits(prev => prev + 1)
        playGoldenHitSound()
      } else {
        playHitSound()
      }

      const updatedMoles = [...prevMoles]
      updatedMoles[moleId] = { ...mole, isVisible: false, type: null }
      
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }

      return updatedMoles
    })
  }, [playHitSound, playGoldenHitSound, playMissSound])

  /**
   * 点击地面（未击中地鼠）
   */
  const hitGround = useCallback(() => {
    setMissedClicks(prev => prev + 1)
    playMissSound()
  }, [playMissSound])

  // 游戏计时器
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (gameTimerRef.current) clearInterval(gameTimerRef.current)
            if (moleTimerRef.current) clearTimeout(moleTimerRef.current)
            
            const config = LEVEL_CONFIGS[currentLevel - 1]
            if (!config) {
              setGameState('gameOver')
              playGameOverSound()
              return 0
            }

            if (score >= config.targetScore) {
              if (currentLevel >= LEVEL_CONFIGS.length) {
                setGameState('victory')
                playVictorySound()
              } else {
                setGameState('levelComplete')
                playLevelCompleteSound()
              }
            } else {
              setGameState('gameOver')
              playGameOverSound()
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current)
    }
  }, [gameState, currentLevel, score, playLevelCompleteSound, playGameOverSound, playVictorySound])

  // 地鼠生成器
  useEffect(() => {
    if (gameState === 'playing') {
      showMole()
    }

    return () => {
      if (moleTimerRef.current) clearTimeout(moleTimerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [gameState, showMole])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current)
      if (moleTimerRef.current) clearTimeout(moleTimerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  /**
   * 渲染启动界面
   * @returns {React.JSX.Element} 启动界面组件
   */
  const renderStartScreen = () => (
    <div className="start-screen">
      <h1 className="game-title">🎮 打地鼠游戏</h1>
      <p className="game-subtitle">Whac-A-Mole</p>
      
      <div className="instructions">
        <h3>📖 游戏说明</h3>
        <ul>
          <li>点击出现的地鼠获得分数</li>
          <li>普通地鼠：10 分 | 金色地鼠：20 分</li>
          <li>共 5 个关卡，每关 60 秒</li>
          <li>达到目标分数即可进入下一关</li>
        </ul>
      </div>

      <div className="level-info">
        <h3>📊 关卡信息</h3>
        {LEVEL_CONFIGS.map(config => (
          <div key={config.level} className="level-row">
            <span>第{config.level}关</span>
            <span>目标：{config.targetScore}分</span>
            <span>地鼠：{config.simultaneousMoles}只</span>
          </div>
        ))}
      </div>

      <div className="button-group">
        <button className="btn-start" onClick={startGame}>
          🚀 开始游戏
        </button>
      </div>

      <div className="sound-toggle">
        <button onClick={toggleSound} className="btn-sound">
          {soundEnabled ? '🔊 音效：开' : '🔇 音效：关'}
        </button>
      </div>
    </div>
  )

  /**
   * 渲染游戏界面
   * @returns {React.JSX.Element} 游戏界面组件
   */
  const renderGameScreen = () => (
    <div className="game-screen">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        <div className="status-item">
          <span className="label">关卡</span>
          <span className="value">{currentLevel}/{LEVEL_CONFIGS.length}</span>
        </div>
        <div className="status-item">
          <span className="label">分数</span>
          <span className="value score">{score}/{LEVEL_CONFIGS[currentLevel - 1]?.targetScore}</span>
        </div>
        <div className="status-item">
          <span className="label">时间</span>
          <span className={`value ${timeLeft <= 10 ? 'warning' : ''}`}>{timeLeft}秒</span>
        </div>
        <button onClick={toggleSound} className="btn-sound-small">
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* 游戏区域 - 3x3 地鼠洞 */}
      <div className="game-board" onClick={hitGround}>
        {moles.map((mole, _index) => (
          <div
            key={mole.id}
            className={`hole ${mole.isVisible ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (mole.isVisible) hitMole(mole.id)
            }}
          >
            <div className={`mole ${mole.type === 'golden' ? 'golden' : ''} ${mole.isVisible ? 'up' : ''}`}>
              {mole.type === 'golden' ? '🌟' : '🐹'}
            </div>
            <div className="hole-cover"></div>
          </div>
        ))}
      </div>

      {/* 底部控制栏 */}
      <div className="control-bar">
        <button onClick={pauseGame} className="btn-pause">
          ⏸️ 暂停
        </button>
        <button onClick={endGame} className="btn-quit">
          🚪 退出
        </button>
      </div>
    </div>
  )

  /**
   * 渲染暂停界面
   * @returns {React.JSX.Element} 暂停界面组件
   */
  const renderPauseScreen = () => (
    <div className="pause-screen overlay">
      <div className="modal">
        <h2>⏸️ 游戏暂停</h2>
        <div className="pause-stats">
          <p>当前关卡：{currentLevel}</p>
          <p>当前分数：{score}</p>
          <p>剩余时间：{timeLeft}秒</p>
        </div>
        <div className="button-group">
          <button onClick={resumeGame} className="btn-resume">
            ▶️ 继续游戏
          </button>
          <button onClick={endGame} className="btn-quit">
            🚪 退出游戏
          </button>
        </div>
      </div>
    </div>
  )

  /**
   * 渲染关卡完成界面
   * @returns {React.JSX.Element} 关卡完成界面组件
   */
  const renderLevelCompleteScreen = () => (
    <div className="level-complete-screen overlay">
      <div className="modal">
        <h2>🎉 关卡完成!</h2>
        <p className="congratulations">恭喜通过第 {currentLevel} 关!</p>
        <div className="level-stats">
          <p>本关得分：<span className="highlight">{score}</span></p>
          <p>击中地鼠：<span className="highlight">{totalHits}</span></p>
          <p>金色地鼠：<span className="highlight golden">{goldenHits}</span></p>
        </div>
        {currentLevel < LEVEL_CONFIGS.length ? (
          <div className="button-group">
            <button onClick={() => {
              setCurrentLevel(prev => prev + 1)
              startLevel()
            }} className="btn-next">
              🚀 下一关
            </button>
            <button onClick={endGame} className="btn-quit">
              🚪 退出游戏
            </button>
          </div>
        ) : (
          <div className="button-group">
            <button onClick={() => {
              setGameState('victory')
              playVictorySound()
            }} className="btn-next">
              🏆 查看胜利
            </button>
          </div>
        )}
      </div>
    </div>
  )

  /**
   * 渲染游戏结束界面
   * @returns {React.JSX.Element} 游戏结束界面组件
   */
  const renderGameOverScreen = () => (
    <div className="game-over-screen overlay">
      <div className="modal">
        <h2>😢 游戏结束</h2>
        <p className="fail-reason">很遗憾，未达到目标分数!</p>
        <div className="game-stats">
          <p>最终关卡：<span className="highlight">{currentLevel}</span></p>
          <p>最终分数：<span className="highlight">{score}</span></p>
          <p>目标分数：<span className="highlight">{LEVEL_CONFIGS[currentLevel - 1]?.targetScore}</span></p>
          <p>总击中数：<span className="highlight">{totalHits}</span></p>
          <p>金色地鼠：<span className="highlight golden">{goldenHits}</span></p>
          <p>失误点击：<span className="highlight miss">{missedClicks}</span></p>
        </div>
        <div className="button-group">
          <button onClick={startGame} className="btn-restart">
            🔄 重新开始
          </button>
          <button onClick={() => setGameState('start')} className="btn-menu">
            📋 返回主菜单
          </button>
        </div>
      </div>
    </div>
  )

  /**
   * 渲染胜利界面
   * @returns {React.JSX.Element} 胜利界面组件
   */
  const renderVictoryScreen = () => (
    <div className="victory-screen overlay">
      <div className="modal victory">
        <h2>🏆 恭喜通关!</h2>
        <p className="victory-text">你完成了所有 5 个关卡!</p>
        <div className="final-stats">
          <p>总击中数：<span className="highlight">{totalHits}</span></p>
          <p>金色地鼠：<span className="highlight golden">{goldenHits}</span></p>
          <p>失误点击：<span className="highlight miss">{missedClicks}</span></p>
          <p className="accuracy">
            准确率：
            <span className="highlight">
              {totalHits + missedClicks > 0 
                ? Math.round((totalHits / (totalHits + missedClicks)) * 100) 
                : 0}%
            </span>
          </p>
        </div>
        <div className="button-group">
          <button onClick={startGame} className="btn-restart">
            🔄 再玩一次
          </button>
          <button onClick={() => setGameState('start')} className="btn-menu">
            📋 返回主菜单
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app">
      {gameState === 'start' && renderStartScreen()}
      {gameState === 'playing' && renderGameScreen()}
      {gameState === 'paused' && (
        <>
          {renderGameScreen()}
          {renderPauseScreen()}
        </>
      )}
      {gameState === 'levelComplete' && renderLevelCompleteScreen()}
      {gameState === 'gameOver' && renderGameOverScreen()}
      {gameState === 'victory' && renderVictoryScreen()}
    </div>
  )
}

export default App

/* eslint-enable no-undef */
/* eslint-enable @typescript-eslint/no-explicit-any */
