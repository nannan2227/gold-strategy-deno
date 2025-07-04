export async function getGoldPrice(): Promise<number> {
  const sources = [
    "https://api.goldprice.org/current",
    "https://api.metalpriceapi.com/v1/latest?api_key=free&base=XAU",
    "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD"
  ];
  
  for (const url of sources) {
    let timeout: number | undefined = undefined;
    try {
      const ctrl = new AbortController();
      timeout = setTimeout(() => ctrl.abort(), 3000) as unknown as number;
      
      const response = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        
        if (url.includes('goldprice.org')) return data.price;
        if (url.includes('metalpriceapi.com') && data.rates && data.rates.USD) {
          return 1 / data.rates.USD;
        }
        if (url.includes('swissquote.com')) return data[0].spreadProfilePrices[0].ask;
      }
    } catch (error) {
      if (timeout !== undefined) clearTimeout(timeout);
      console.warn(`Failed to fetch from ${url}: ${(error as Error).message}`);
    }
  }
  
  return 3340; // 默认值
} 