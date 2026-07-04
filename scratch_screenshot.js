const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  
  // Set localStorage to simulate login
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('customerId', '11');
  });
  
  await page.goto('http://localhost:3000/mypage/order', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Modify one of the orders' shipment directly in the DOM to test parsing
  // But wait, the shipment is fetched from DB. 
  // Let me just modify the DB row to test it.
  
  await browser.close();
})();
