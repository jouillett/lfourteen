const CARRIERS = [
  { id: "kr.cjlogistics", name: "CJ대한통운" },
  { id: "kr.lotte", name: "롯데택배" },
  { id: "kr.hanjin", name: "한진택배" },
  { id: "kr.epost", name: "우체국택배" },
  { id: "kr.logen", name: "로젠택배" },
  { id: "kr.kdexp", name: "경동택배" },
  { id: "kr.daesin", name: "대신택배" },
  { id: "kr.ilyanglogis", name: "일양로지스" },
];

async function checkDeliveryDone(shipmentString: string) {
  if (!shipmentString || !shipmentString.includes('|')) return { isDone: false, deliveredAt: null };

  const [cName, tNum] = shipmentString.split('|');
  const carrierName = cName.trim();
  const trackId = tNum.trim().replace(/[^0-9a-zA-Z]/g, '');

  const found = CARRIERS.find(c => c.name.includes(carrierName) || carrierName.includes(c.name));
  if (!found || !trackId) return { isDone: false, deliveredAt: null, error: 'not found' };

  try {
    const apiUrl = `https://apis.tracker.delivery/carriers/${found.id}/tracks/${trackId}`;
    console.log("Fetching", apiUrl);
    const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error checking delivery:', error);
  }
}

checkDeliveryDone('롯데택배|260349855706');
