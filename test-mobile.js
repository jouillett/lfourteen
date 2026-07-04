const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to mobile
  await page.setViewport({ width: 390, height: 844 });
  
  // Navigate to local server
  await page.goto('http://localhost:3000');
  
  // Wait for the button
  await page.waitForSelector('button::-p-text(구매하기)');
  
  // Get all buttons matching text
  const buttons = await page.$$('button::-p-text(구매하기)');
  console.log(`Found ${buttons.length} buttons`);
  
  // Click the visible one in MobileHome (the fixed bottom bar)
  // We can just click the first one that is visible
  for (const btn of buttons) {
    const isVisible = await btn.isIntersectingViewport();
    if (isVisible) {
      console.log('Clicking visible button...');
      await btn.click();
      break;
    }
  }
  
  // Wait a bit for animation/drawer to open
  await new Promise(r => setTimeout(r, 1000));
  
  // Take screenshot of popup (viewport only, so we see what the user sees)
  await page.screenshot({ path: 'mobile-popup.png', fullPage: false });
  
  await browser.close();
})();
