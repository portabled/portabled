function noprocess_memoryUsage(): { rss: number; heapTotal: number; heapUsed: number; } {
  return {
    rss: 13225984 + ((Math.random() * 3000) | 0),
    heapTotal: 7130752 + ((Math.random() * 3000) | 0),
    heapUsed: 2449612 + ((Math.random() * 3000) | 0)
  };
}