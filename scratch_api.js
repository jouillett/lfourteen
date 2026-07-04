async function test() {
  // test our proxy endpoint
  const res = await fetch('http://localhost:3000/api/tracking?carrierId=kr.cjlogistics&trackId=3393507554');
  const json = await res.json();
  console.log("Proxy response:", JSON.stringify(json, null, 2));
  
  // test what the raw API returns  
  const res2 = await fetch('https://apis.tracker.delivery/carriers/kr.cjlogistics/tracks/3393507554');
  const json2 = await res2.json();
  console.log("Raw tracker response:", JSON.stringify(json2, null, 2));
}
test();
