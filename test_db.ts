import pool from './lib/db'; 
async function test() { 
  const conn = await pool.getConnection(); 
  const [r1] = await conn.query('DESCRIBE orders'); 
  const [r2] = await conn.query('DESCRIBE points'); 
  console.log(r1, r2); 
  conn.release(); 
  process.exit(0); 
} 
test();
