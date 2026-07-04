const http = require('http');

const data = JSON.stringify({
  customer_id: 2,
  product_id: 1,
  priced_id: 3,
  quantity: 1
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/cart/add',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
