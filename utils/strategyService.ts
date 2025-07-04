import { config } from "dotenv";

const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";
const API_KEY = Deno.env.get("DEEPSEEK_API_KEY");

const strategyCache = new Map<number, { data: any; timestamp: number }>();

export async function getStrategy(price: number): Promise<any> {
  const cacheKey = Math.round(price);
  // 检查缓存
  if (strategyCache.has(cacheKey)) {
    const cached = strategyCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
  }

  const prompt = `此刻金价${price}美金，你现在角色是专业的黄金期货交易大师，结合全网最新大数据，全网最新知识库，时时新闻，金十数据，各种技术指标，全球事件，给出此刻黄金期货交易策略。要求返回JSON格式：{\n  \"strategies\": [{\n    \"title\": \"策略名称\", \n    \"scenario\": \"适用场景\",\n    \"entry\": \"入场点位\",\n    \"target\": \"目标价位\",\n    \"stopLoss\": \"止损点位\",\n    \"probability\": \"胜率百分比\",\n    \"reason\": \"逻辑简述\"\n  }]\n}`;

  try {
    const response = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);
    // 更新缓存
    strategyCache.set(cacheKey, {
      data: result.strategies.slice(0, 3),
      timestamp: Date.now()
    });
    return result.strategies.slice(0, 3);
  } catch (error) {
    console.error("Strategy generation failed:", error);
    return [{
      title: "策略生成失败",
      entry: "请稍后重试",
      target: "请稍后重试",
      stopLoss: "请稍后重试",
      reason: (error as Error).message
    }];
  }
}

// 兼容旧用法
export function getStrategySignal(price: number): string {
  // 简单 mock 策略：金价高于 470 卖出，否则买入
  if (price > 470) return 'SELL';
  return 'BUY';
} 
