export function openDaumPostcode(onSelect: (zipcode: string, address: string) => void) {
  const run = () => {
    new (window as any).daum.Postcode({
      oncomplete: function(data: any) {
        let addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        let extraAddr = '';
        if (data.userSelectedType === 'R') {
          if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) extraAddr += data.bname;
          if (data.buildingName !== '' && data.apartment === 'Y') {
            extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
          }
          if (extraAddr !== '') addr += ` (${extraAddr})`;
        }
        onSelect(data.zonecode, addr);
      }
    }).open();
  };

  if ((window as any).daum?.Postcode) {
    run();
  } else {
    if (!document.querySelector('script[src*="postcode.v2.js"]')) {
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      document.head.appendChild(script);
    }
    const interval = setInterval(() => {
      if ((window as any).daum?.Postcode) {
        clearInterval(interval);
        run();
      }
    }, 50);
  }
}
