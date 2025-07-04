import { Application, Router, send, Context } from "oak";
import { getGoldPrice } from "../utils/goldPrice.ts";
import { getStrategy } from "../utils/strategyService.ts";

const app = new Application();
const router = new Router();

// 获取实时金价
router.get("/api/price", async (ctx: Context) => {
  try {
    const price = await getGoldPrice();
    ctx.response.body = { success: true, price };
  } catch (error) {
    ctx.response.body = { success: false, error: (error as Error).message };
  }
});

// 生成交易策略
router.post("/api/strategy", async (ctx: Context) => {
  try {
    // 尝试多种方式获取 body
    let body;
    
    // 方式 1：直接获取
    try {
      body = await ctx.request.body.value;
    } catch {
      // 方式 2：指定类型
      try {
        body = await ctx.request.body({ type: "json" }).value;
      } catch {
        // 方式 3：分步获取
        try {
          const result = ctx.request.body();
          body = await result.value;
        } catch {
          // 方式 4：最后尝试
          body = await ctx.request.body.value;
        }
      }
    }
    
    console.log("Received body:", body); // 调试信息
    
    if (!body || typeof body !== 'object') {
      ctx.response.body = { success: false, error: "Invalid request body" };
      return;
    }
    
    const { price } = body;
    if (!price) {
      ctx.response.body = { success: false, error: "Price is required" };
      return;
    }
    
    const strategy = await getStrategy(price);
    ctx.response.body = { success: true, strategy };
  } catch (error) {
    console.error("Strategy error:", error);
    ctx.response.body = { success: false, error: (error as Error).message };
  }
});

// CORS 中间件
app.use(async (ctx: Context, next: () => Promise<unknown>) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }
  await next();
});

// 静态文件服务
app.use(async (ctx: Context, next: () => Promise<unknown>) => {
  if (ctx.request.url.pathname.startsWith("/api")) {
    await next();
    return;
  }
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 }); 
