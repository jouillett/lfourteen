const SECRET_KEY = "v9kP2xM5nL8jQ4wR7tY1bC6fH3zD0gS8mN5vX2kP9jL4cR7wT1bY6fH3zM0gS8";
fetch("http://capofcom.cafe24.com/l14_coordy/db_api.php", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secret_key: SECRET_KEY,
    query: "SELECT id, status, shipment, customer_id FROM orders ORDER BY id DESC LIMIT 5",
    params: []
  })
}).then(r => r.json()).then(console.log).catch(console.error);
