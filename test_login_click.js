const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('dialog', async dialog => {
    console.log('Dialog Message:', dialog.message());
    await dialog.accept();
  });

  await page.goto('http://localhost:3000/login');
  
  // type phone and password
  await page.type('#phone', '01012341234');
  await page.type('#password', 'password');
  
  // click login
  await page.click('button[type="submit"]');
  
  // wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
