import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { getGoldPrice } from "./goldPrice.ts";

// 模拟 fetch 函数
const mockFetch = (response: any, status = 200) => {
  globalThis.fetch = () => 
    Promise.resolve({
      ok: status === 200,
      status,
      json: () => Promise.resolve(response),
    } as Response);
};

Deno.test("成功获取 goldprice.org 金价", async () => {
  mockFetch({ price: 3335.42 });
  const price = await getGoldPrice();
  assertEquals(price, 3335.42);
});

Deno.test("API 失败时返回默认值", async () => {
  // 模拟所有 API 失败
  globalThis.fetch = () => Promise.reject(new Error("Network error"));
  const price = await getGoldPrice();
  assertEquals(price, 3340);
}); 