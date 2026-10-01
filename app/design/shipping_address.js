document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.warn("No userId found in localStorage");
    }

    const loadAddresses = () => {
        const fetchId = userId || 'test_user'; // fallback
        fetch('/api/address/list?customer_id=' + fetchId)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.addresses) {
                    const addressList = document.getElementById('address-list');
                    if (!addressList) return;
                    addressList.innerHTML = '';
                    data.addresses.forEach(addr => {
                        const isDefault = (addr.is_default == 1 || addr.is_default === true || addr.is_default === '1' || addr.is_default === '\x01');
                        const defaultBadge = isDefault ? `<span class="bg-surface-container-highest text-on-surface-variant text-[11px] px-2 py-0.5 rounded-sm">기본배송지</span>` : '';
                        
                        const actionHtml = isDefault 
                            ? `<span class="font-label-md text-label-md text-primary font-bold select-none">✔ 현재 선택</span>`
                            : `<button type="button" class="bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md px-3 py-1 rounded hover:bg-surface-container-high transition-colors" onclick="selectAddress(${addr.id}, event)">선택</button>`;
                            
                        const cardHtml = `
                            <div class="bg-surface border ${isDefault ? 'border-2 border-primary' : 'border-outline-variant hover:border-primary hover:shadow-md transition-all'} rounded-lg p-md flex flex-col gap-sm relative shadow-sm cursor-pointer" onclick="selectAddress(${addr.id}, event)">
                                <div class="flex justify-between items-start">
                                    <div class="flex items-center gap-xs">
                                        <span class="font-label-md text-label-md font-bold text-on-surface">${addr.recipient_name}</span>
                                        ${defaultBadge}
                                    </div>
                                    <div class="flex items-center gap-1">
                                        ${actionHtml}
                                    </div>
                                </div>
                                <div class="font-body-md text-body-md text-on-surface-variant">${[addr.recipient_mobile, addr.recipient_phone].filter(Boolean).join(" / ")}</div>
                                <div class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                                    [${addr.zip_code}] ${addr.address}<br>
                                    ${addr.detail_address || ''}
                                </div>
                                <div class="flex justify-end gap-xs mt-xs pt-xs border-t border-outline-variant/30">
                                    <button type="button" class="text-on-surface-variant hover:text-primary font-label-md text-label-md border border-outline-variant rounded px-3 py-1 hover:bg-surface-container transition-colors" onclick="event.stopPropagation(); window.location.href='address_edit.html?id=${addr.id}'">수정</button>
                                    <button type="button" class="text-on-surface-variant hover:text-error font-label-md text-label-md border border-outline-variant rounded px-3 py-1 hover:bg-surface-container transition-colors" onclick="event.stopPropagation(); deleteAddress(${addr.id})">삭제</button>
                                </div>
                            </div>
                        `;
                        addressList.innerHTML += cardHtml;
                    });
                }
            })
            .catch(err => console.error('Error fetching addresses:', err));
    };

    window.selectAddress = (id, event) => {
        if(event) event.stopPropagation();
        const fetchId = userId || 'test_user';
        fetch('/api/address/' + id + '/default', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: fetchId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (document.referrer && (document.referrer.includes('order.html') || document.referrer.includes('morder.html'))) {
                    window.location.href = document.referrer;
                } else {
                    window.location.href = 'order.html'; // fallback
                }
            } else {
                alert('배송지 선택에 실패했습니다.');
            }
        })
        .catch(err => console.error('Error selecting address:', err));
    };

    window.deleteAddress = (id) => {
        if(confirm('정말 삭제하시겠습니까?')) {
            const fetchId = userId || 'test_user';
            fetch('/api/address/' + id, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: fetchId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadAddresses();
                } else {
                    alert('삭제에 실패했습니다.');
                }
            })
            .catch(err => console.error('Error deleting address:', err));
        }
    };

    loadAddresses();
});
