"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const messages = [
  "嗨~我是仓鼠君！有什么游戏找不到吗？",
  "试试点击分类标签哦~ 游戏都在里面呢！",
  "缺游戏？去B站或QQ群找我呀~",
  "这个搜索超好用的，不信你试试？",
  "嘿嘿，看我看我！我超可爱的！",
  "模拟器、固件、金手指...都在置顶词条里！",
  "找不到想要的？加群问问说不定有惊喜~",
  "今天的你也玩游戏玩得很开心吧！",
  "点我点我！我还可以说很多话哦~",
  "有任何问题都可以问我...才怪，我是只仓鼠啦！",
  "欢迎来到单游仓鼠！这里有你想要的游戏~",
  "鼠标点点点~ 好玩的游戏在前面等着你！",
];

const welcomeMessage = "欢迎来到单游仓鼠！这里有你想要的游戏~";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "深夜好~注意休息哦！";
  if (hour < 9) return "早上好~来点游戏提提神？";
  if (hour < 12) return "上午好~今天的游戏准备找什么？";
  if (hour < 14) return "中午好~吃饱饭来玩会儿游戏吧！";
  if (hour < 18) return "下午好~下午茶配游戏，绝配！";
  if (hour < 22) return "晚上好~夜游时间到啦！";
  return "夜深了~还在找游戏？注意身体哦！";
}

export default function Mascot() {
  const [currentMessage, setCurrentMessage] = useState(welcomeMessage);
  const [displayedMessage, setDisplayedMessage] = useState(welcomeMessage);
  const [isHovered, setIsHovered] = useState(false);
  const [bubbleVersion, setBubbleVersion] = useState(0);
  const currentMessageRef = useRef(welcomeMessage);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTalkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickRandomMessage = useCallback((pool = messages, previous = currentMessageRef.current) => {
    if (pool.length <= 1) return pool[0] ?? welcomeMessage;
    let next = previous;
    while (next === previous) {
      const idx = Math.floor(Math.random() * pool.length);
      next = pool[idx] ?? pool[0];
    }
    return next;
  }, []);

  const speak = useCallback((message: string) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }
    currentMessageRef.current = message;
    setBubbleVersion((value) => value + 1);
    setCurrentMessage(message);
    setDisplayedMessage(message.charAt(0));

    let index = 0;
    typingTimerRef.current = setInterval(() => {
      index += 1;
      setDisplayedMessage(message.slice(0, index));
      if (index >= message.length && typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }, 28);
  }, []);

  const scheduleAutoTalk = useCallback(() => {
    if (autoTalkTimerRef.current) {
      clearTimeout(autoTalkTimerRef.current);
    }

    const delay = 5000 + Math.floor(Math.random() * 4000);
    autoTalkTimerRef.current = setTimeout(() => {
      speak(pickRandomMessage());
      scheduleAutoTalk();
    }, delay);
  }, [pickRandomMessage, speak]);

  useEffect(() => {
    // 页面加载后直接欢迎，避免用户看不到第一次发言。
    speak(getGreeting());
    scheduleAutoTalk();

    return () => {
      if (autoTalkTimerRef.current) {
        clearTimeout(autoTalkTimerRef.current);
      }
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, [scheduleAutoTalk, speak]);

  const handleClick = useCallback(() => {
    speak(pickRandomMessage());
    scheduleAutoTalk();
  }, [pickRandomMessage, scheduleAutoTalk, speak]);

  return (
    <div
      className="mascot-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => handleClick()}
    >
      {/* 气泡 */}
      <div key={bubbleVersion} className="mascot-bubble" aria-live="polite">
        <div className="mascot-bubble-head">仓鼠君</div>
        <div className="mascot-bubble-text">
          {displayedMessage || currentMessage || welcomeMessage}
        </div>
        <div className="mascot-bubble-tail" />
      </div>

      {/* 仓鼠图片 */}
      <button
        className={`mascot-img-btn ${isHovered ? "hovered" : ""}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        aria-label="点击仓鼠说话"
      >
        <img src="/cangshu.png" alt="仓鼠君" width={150} height={150} />
      </button>
    </div>
  );
}
