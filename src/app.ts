// src/app.ts
import { Application, Router, send, type Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { getGoldPrice } from "./utils/goldPrice.ts";
import { getStrategy } from "./utils/strategyService.ts";

const app = new Application();
const router = new Router();

// 获取环境配置
const DENO_ENV = Deno.env.get("DENO_ENV") || "development";
const PORT = parseInt(Deno.env.get("PORT") || "8000", 10);

// 全局错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(`[Error] ${ctx.request.method} ${ctx.request.url.pathname}:`, err);
    
    ctx.response.status = 500;
    ctx.response.body = { 
      success: false,
      error: "Internal server error",
      details: DENO_ENV === "production" ? undefined : err.message
    };
  }
});

// JSON 解析中间件
app.use(async (ctx, next) => {
  if (ctx.request.hasBody && ctx.request.headers.get("content-type") === "application/json") {
    try {
      const body = ctx.request.body();
      if (body.type === "json") {
        ctx.state.body = await body.value;
      }
    } catch (error) {
      console.error("JSON parsing middleware error:", error);
    }
  }
  await next();
});

// CORS 中间件
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  await next();
});

// 健康检查端点
router.get("/health", (ctx) => {
  ctx.response.body = { 
    status: "ok", 
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: DENO_ENV
  };
});

// 获取实时金价
router.get("/api/price", async (ctx) => {
  try {
    const price = await getGoldPrice();
    ctx.response.body = { success: true, price };
  } catch (error) {
    ctx.response.body = { success: false, error: error.message };
  }
});

// 生成交易策略
router.post("/api/strategy", async (ctx: Context) => {
  let body: { price?: number };
  
  try {
    // 尝试从中间件获取已解析的请求体
    if (ctx.state.body) {
      body = ctx.state.body;
    } else {
      // 直接解析请求体
      const bodyResult = ctx.request.body();
      if (bodyResult.type !== "json") {
        throw new Error("Invalid content type. Expected application/json");
      }
      body = await bodyResult.value;
    }
  } catch (error) {
    console.error("Request body parsing error:", error);
    ctx.response.body = { 
      success: false, 
      error: "Invalid request body" 
    };
    ctx.response.status = 400;
    return;
  }
  
  if (!body || !body.price) {
    ctx.response.body = { 
      success: false, 
      error: "Price is required" 
    };
    ctx.response.status = 400;
    return;
  }

  try {
    const strategy = await getStrategy(body.price);
    ctx.response.body = { success: true, strategy };
  } catch (error) {
    console.error("Strategy generation error:", error);
    ctx.response.body = { 
      success: false, 
      error: "Failed to generate strategy" 
    };
    ctx.response.status = 500;
  }
});

// 静态文件服务
app.use(async (ctx, next) => {
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

console.log(`Server running in ${DENO_ENV} mode on http://localhost:${PORT}`);
await app.listen({ port: PORT });
