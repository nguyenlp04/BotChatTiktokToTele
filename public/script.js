let accounts = [];
let filteredAccounts = [];
let twoFaInterval = null;
let sortColumn = null;
let sortDirection = 'asc'; // 'asc' or 'desc'

// Load accounts when page loads
window.addEventListener('DOMContentLoaded', () => {
    loadAccounts();
    setupEventListeners();
    // Start 2FA code refresh every second
    start2FARefresh();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (twoFaInterval) {
        clearInterval(twoFaInterval);
    }
});

function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterAccounts(query);
    });

    // Add account button
    document.getElementById('addBtn').addEventListener('click', () => {
        openAddModal();
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
        exportToExcel();
    });

    // Export template button
    document.getElementById('exportTemplateBtn').addEventListener('click', () => {
        exportTemplate();
    });

    // Import file input
    document.getElementById('importFile').addEventListener('change', (e) => {
        handleImport(e);
    });

    // Close modal buttons - Add event listeners to all close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            modal.classList.remove('active');
        });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Form submit handlers
    document.getElementById('addForm').addEventListener('submit', handleAddAccount);
    document.getElementById('editForm').addEventListener('submit', handleEditAccount);
    
    // Close action menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-menu')) {
            closeAllActionMenus();
        }
    });
}

async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts');
        accounts = await response.json();
        filteredAccounts = [...accounts];
        renderAccounts();
        updateStats();
    } catch (error) {
        console.error('Error loading accounts:', error);
        alert('Lỗi khi tải danh sách tài khoản');
    }
}

function filterAccounts(query) {
    if (!query) {
        filteredAccounts = [...accounts];
    } else {
        filteredAccounts = accounts.filter(account => {
            return Object.values(account).some(value => {
                if (value === null || value === undefined) return false;
                return value.toString().toLowerCase().includes(query);
            });
        });
    }
    renderAccounts();
}

function renderAccounts() {
    const tbody = document.getElementById('accountsBody');
    
    if (filteredAccounts.length === 0) {
        tbody.innerHTML = '<tr class="loading"><td colspan="13">Không có tài khoản nào</td></tr>';
        return;
    }

    tbody.innerHTML = filteredAccounts.map((account, index) => {
        const originalIndex = getOriginalIndex(account);
        const proxyStatus = account.ProxyStatus || 'unknown';
        const proxyIcon = proxyStatus === 'working' ? '🟢' : proxyStatus === 'failed' ? '🔴' : '⚪';
        const status = account.Status || 'Live';
        const statusClass = status === 'Live' ? 'status-live' : 'status-die';
        
        // 2FA code display
        let twoFaHtml = 'N/A';
        if (account['2FA Mail'] || account['2FA Shop']) {
            const secret = account['2FA Mail'] || account['2FA Shop'];
            twoFaHtml = `
                <div class="twofa-container">
                    <div class="twofa-code" id="twofa-${originalIndex}">------</div>
                    <div class="twofa-timer" id="timer-${originalIndex}">--s</div>
                    <div class="twofa-progress">
                        <div class="twofa-progress-bar" id="progress-${originalIndex}"></div>
                    </div>
                    <button class="copy-btn-inline" onclick="copy2FACode(${originalIndex})">📋</button>
                </div>
            `;
        }
        
        return `
        <tr draggable="true" data-index="${originalIndex}" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="drop(event)" ondragend="dragEnd(event)">
            <td class="drag-handle">⋮⋮</td>
            <td>${index + 1}</td>
            <td>
                <div class="cell-with-copy">
                    <span class="cell-content">${escapeHtml(account.Profile || '')}</span>
                </div>
            </td>
            <td>
                <div class="cell-with-copy">
                    <span class="cell-content">${escapeHtml(account['Shop Name'] || '')}</span>
                </div>
            </td>
            <td>
                <div class="cell-with-copy">
                    <span class="cell-content">${escapeHtml(account.Email || '')}</span>
                    ${account.Email ? `<button class="copy-btn-inline" onclick="copyText('${escapeHtml(account.Email)}', this)">📋</button>` : ''}
                </div>
            </td>
            <td>
                <div class="cell-with-copy">
                    <span class="cell-content">${escapeHtml(account['Pass Acc'] || '')}</span>
                    ${account['Pass Acc'] ? `<button class="copy-btn-inline" onclick="copyText('${escapeHtml(account['Pass Acc'])}', this)">📋</button>` : ''}
                </div>
            </td>
            <td>${twoFaHtml}</td>
            <td>
                <div class="editable-note" 
                     contenteditable="true" 
                     data-index="${originalIndex}"
                     data-original="${escapeHtml(account.Note || '')}"
                     onblur="handleNoteBlur(event, ${originalIndex})"
                     onfocus="handleNoteFocus(event, ${originalIndex})"
                     onkeydown="handleNoteKeydown(event, ${originalIndex})"
                >${escapeHtml(account.Note || '')}</div>
                <div class="note-actions" id="note-actions-${originalIndex}">
                    <button class="note-btn note-btn-save" onclick="saveNote(${originalIndex})">💾</button>
                    <button class="note-btn note-btn-cancel" onclick="cancelNoteEdit(${originalIndex})">✖</button>
                </div>
            </td>
            <td>${escapeHtml(account.Limit || '')}</td>
            <td>${escapeHtml(account.Score || '')}</td>
            <td>${escapeHtml(account.Tier || '')}</td>
            <td>
                <span class="status-badge ${statusClass}">${status}</span>
            </td>
            <td class="actions">
                <div class="action-menu">
                    <button class="action-menu-btn" onclick="toggleActionMenu(event, ${originalIndex})">⋮</button>
                    <div class="action-menu-dropdown" id="menu-${originalIndex}">
                        <button class="action-menu-item info" onclick="viewAccount(${originalIndex})">
                            <span>👁️</span>
                            <span>Chi tiết</span>
                        </button>
                        <button class="action-menu-item edit" onclick="editAccount(${originalIndex})">
                            <span>✏️</span>
                            <span>Sửa</span>
                        </button>
                        <button class="action-menu-item delete" onclick="deleteAccount(${originalIndex})">
                            <span>🗑️</span>
                            <span>Xóa</span>
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;
    }).join('');
    
    // Update filtered count
    document.getElementById('filteredAccounts').textContent = filteredAccounts.length;
    
    // Refresh 2FA codes
    update2FACodes();
}

function getOriginalIndex(account) {
    return accounts.findIndex(a => a === account);
}

function updateStats() {
    document.getElementById('totalAccounts').textContent = accounts.length;
}

function openAddModal() {
    document.getElementById('addForm').reset();
    document.getElementById('addModal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function viewAccount(index) {
    closeAllActionMenus();
    const account = accounts[index];
    const detailContent = document.getElementById('detailContent');
    
    const fields = [
        { label: 'Profile', key: 'Profile' },
        { label: 'Shop Name', key: 'Shop Name' },
        { label: 'ShopCode', key: 'ShopCode' },
        { label: 'Email', key: 'Email' },
        { label: 'Pass Acc', key: 'Pass Acc' },
        { label: 'Business Name', key: 'Business Name' },
        { label: 'EIN', key: 'EIN' },
        { label: 'Business Address', key: 'Business Address' },
        { label: 'Full Name', key: 'Full Name' },
        { label: 'SSN', key: 'SSN' },
        { label: 'Address', key: 'Address' },
        { label: 'Date Of Birth', key: 'Date Of Birth' },
        { label: 'Phone', key: 'Phone' },
        { label: 'Bank', key: 'Bank' },
        { label: 'Proxy', key: 'Proxy' },
        { label: '2FA Mail', key: '2FA Mail' },
        { label: '2FA Shop', key: '2FA Shop' },
        { label: 'Note', key: 'Note' },
        { label: 'Limit', key: 'Limit' },
        { label: 'Score', key: 'Score' },
        { label: 'Tier', key: 'Tier' },
        { label: 'Status', key: 'Status' }
    ];

    detailContent.innerHTML = fields.map(field => {
        const value = account[field.key];
        let displayValue = escapeHtml(value || 'N/A');
        
        // Special handling for Proxy - add check button
        if (field.key === 'Proxy' && value) {
            const proxyStatus = account.ProxyStatus || 'unknown';
            const proxyIcon = proxyStatus === 'working' ? '🟢' : proxyStatus === 'failed' ? '🔴' : '⚪';
            displayValue = `${proxyIcon} ${escapeHtml(value)}`;
        }
        
        return `
        <div class="detail-item">
            <strong>${field.label}</strong>
            <span>${displayValue}</span>
            ${value ? `<button class="copy-btn" onclick="copyToClipboard('${escapeHtml(value)}', this)">Copy</button>` : ''}
            ${field.key === 'Proxy' && value ? `<button class="copy-btn" style="background: #339af0; margin-left: 5px;" onclick="checkProxyFromDetail(${index})">Check Proxy</button>` : ''}
        </div>
    `;
    }).join('');

    document.getElementById('detailModal').classList.add('active');
}

function editAccount(index) {
    closeAllActionMenus();
    const account = accounts[index];
    
    // Fill form with account data
    document.getElementById('editIndex').value = index;
    document.getElementById('editProfile').value = account.Profile || '';
    document.getElementById('editShopName').value = account['Shop Name'] || '';
    document.getElementById('editShopCode').value = account.ShopCode || '';
    document.getElementById('editEmail').value = account.Email || '';
    document.getElementById('editPassAcc').value = account['Pass Acc'] || '';
    document.getElementById('editBusinessName').value = account['Business Name'] || '';
    document.getElementById('editEIN').value = account.EIN || '';
    document.getElementById('editBusinessAddress').value = account['Business Address'] || '';
    document.getElementById('editFullName').value = account['Full Name'] || '';
    document.getElementById('editSSN').value = account.SSN || '';
    document.getElementById('editAddress').value = account.Address || '';
    document.getElementById('editDateOfBirth').value = account['Date Of Birth'] || '';
    document.getElementById('editPhone').value = account.Phone || '';
    document.getElementById('editBank').value = account.Bank || '';
    document.getElementById('editProxy').value = account.Proxy || '';
    document.getElementById('edit2FAMail').value = account['2FA Mail'] || '';
    document.getElementById('edit2FAShop').value = account['2FA Shop'] || '';
    document.getElementById('editNote').value = account.Note || '';
    document.getElementById('editLimit').value = account.Limit || '';
    document.getElementById('editScore').value = account.Score || '';
    document.getElementById('editTier').value = account.Tier || '';
    document.getElementById('editStatus').value = account.Status || 'Live';

    document.getElementById('editModal').classList.add('active');
}

async function deleteAccount(index) {
    closeAllActionMenus();
    if (!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;

    try {
        const response = await fetch(`/api/accounts/${index}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadAccounts();
            alert('Đã xóa tài khoản thành công');
        } else {
            alert('Lỗi khi xóa tài khoản');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Lỗi khi xóa tài khoản');
    }
}

async function handleAddAccount(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newAccount = {
        'Profile': formData.get('profile'),
        'Shop Name': formData.get('shopName'),
        'ShopCode': formData.get('shopCode'),
        'Email': formData.get('email'),
        'Pass Acc': formData.get('passAcc'),
        'Business Name': formData.get('businessName'),
        'EIN': formData.get('ein'),
        'Business Address': formData.get('businessAddress'),
        'Full Name': formData.get('fullName'),
        'SSN': formData.get('ssn'),
        'Address': formData.get('address'),
        'Date Of Birth': formData.get('dateOfBirth'),
        'Phone': formData.get('phone'),
        'Bank': formData.get('bank'),
        'Proxy': formData.get('proxy'),
        '2FA Mail': formData.get('twoFaMail'),
        '2FA Shop': formData.get('twoFaShop'),
        'Note': formData.get('note'),
        'Limit': formData.get('limit'),
        'Score': formData.get('score'),
        'Tier': formData.get('tier'),
        'Status': formData.get('status')
    };

    try {
        const response = await fetch('/api/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newAccount)
        });

        if (response.ok) {
            closeAddModal();
            await loadAccounts();
            alert('Đã thêm tài khoản thành công');
        } else {
            alert('Lỗi khi thêm tài khoản');
        }
    } catch (error) {
        console.error('Error adding account:', error);
        alert('Lỗi khi thêm tài khoản');
    }
}

async function handleEditAccount(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const index = formData.get('index');
    
    const updatedAccount = {
        'Profile': formData.get('profile'),
        'Shop Name': formData.get('shopName'),
        'ShopCode': formData.get('shopCode'),
        'Email': formData.get('email'),
        'Pass Acc': formData.get('passAcc'),
        'Business Name': formData.get('businessName'),
        'EIN': formData.get('ein'),
        'Business Address': formData.get('businessAddress'),
        'Full Name': formData.get('fullName'),
        'SSN': formData.get('ssn'),
        'Address': formData.get('address'),
        'Date Of Birth': formData.get('dateOfBirth'),
        'Phone': formData.get('phone'),
        'Bank': formData.get('bank'),
        'Proxy': formData.get('proxy'),
        '2FA Mail': formData.get('twoFaMail'),
        '2FA Shop': formData.get('twoFaShop'),
        'Note': formData.get('note'),
        'Limit': formData.get('limit'),
        'Score': formData.get('score'),
        'Tier': formData.get('tier'),
        'Status': formData.get('status')
    };

    try {
        const response = await fetch(`/api/accounts/${index}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedAccount)
        });

        if (response.ok) {
            closeEditModal();
            await loadAccounts();
            alert('Đã cập nhật tài khoản thành công');
        } else {
            alert('Lỗi khi cập nhật tài khoản');
        }
    } catch (error) {
        console.error('Error updating account:', error);
        alert('Lỗi khi cập nhật tài khoản');
    }
}

async function exportToExcel() {
    try {
        const response = await fetch('/api/accounts');
        const data = await response.json();
        
        // Create CSV
        const headers = ['Profile', 'Shop Name', 'ShopCode', 'Email', 'Pass Acc', 'Business Name', 'EIN', 'Business Address', 'Full Name', 'SSN', 'Address', 'Date Of Birth', 'Phone', 'Bank', 'Proxy', '2FA Mail', '2FA Shop', 'Note', 'Status'];
        const csv = [
            headers.join(','),
            ...data.map(account => headers.map(h => `"${(account[h] || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `accounts_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    } catch (error) {
        console.error('Error exporting:', error);
        alert('Lỗi khi xuất file');
    }
}

function copyText(text, button) {
    // Prevent event bubbling to drag handlers
    event.stopPropagation();
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓';
        button.style.background = '#40c057';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#339af0';
        }, 1500);
    }).catch(err => {
        console.error('Copy failed:', err);
        alert('Lỗi khi copy');
    });
}

async function checkProxyFromDetail(index) {
    const account = accounts[index];
    if (!account.Proxy) {
        alert('Tài khoản này không có proxy');
        return;
    }

    try {
        const response = await fetch('/api/check-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                proxy: account.Proxy,
                index: index 
            })
        });

        const result = await response.json();
        
        if (result.status === 'working') {
            alert(`✅ Proxy hoạt động tốt!\nTốc độ: ${result.speed}ms`);
            accounts[index].ProxyStatus = 'working';
        } else {
            alert(`❌ Proxy không hoạt động!`);
            accounts[index].ProxyStatus = 'failed';
        }
        
        // Refresh detail view
        viewAccount(index);
    } catch (error) {
        console.error('Error checking proxy:', error);
        alert('Lỗi khi kiểm tra proxy');
    }
}

async function checkProxy(index) {
    const account = accounts[index];
    if (!account.Proxy) {
        alert('Tài khoản này không có proxy');
        return;
    }

    try {
        const response = await fetch('/api/check-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                proxy: account.Proxy,
                index: index 
            })
        });

        const result = await response.json();
        
        if (result.status === 'working') {
            alert(`✅ Proxy hoạt động tốt!\nTốc độ: ${result.speed}ms`);
            accounts[index].ProxyStatus = 'working';
        } else {
            alert(`❌ Proxy không hoạt động!`);
            accounts[index].ProxyStatus = 'failed';
        }
        
        renderAccounts();
    } catch (error) {
        console.error('Error checking proxy:', error);
        alert('Lỗi khi kiểm tra proxy');
    }
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Đã copy!';
        button.style.background = '#40c057';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#51cf66';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        alert('Lỗi khi copy');
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Drag and Drop functionality
let draggedElement = null;

function dragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function dragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.target.closest('tr');
    if (target && target !== draggedElement && target.hasAttribute('draggable')) {
        target.classList.add('drag-over');
    }
    
    return false;
}

function drop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const target = e.target.closest('tr');
    if (draggedElement !== target && target && target.hasAttribute('draggable')) {
        const draggedIndex = parseInt(draggedElement.dataset.index);
        const targetIndex = parseInt(target.dataset.index);
        
        // Swap positions in array
        swapAccounts(draggedIndex, targetIndex);
    }
    
    return false;
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    
    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

async function swapAccounts(fromIndex, toIndex) {
    try {
        const response = await fetch('/api/accounts/reorder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fromIndex, toIndex })
        });

        if (response.ok) {
            await loadAccounts();
        } else {
            alert('Lỗi khi sắp xếp lại tài khoản');
        }
    } catch (error) {
        console.error('Error reordering accounts:', error);
        alert('Lỗi khi sắp xếp lại tài khoản');
    }
}

// 2FA Functions
function start2FARefresh() {
    update2FACodes();
    twoFaInterval = setInterval(update2FACodes, 1000);
}

async function update2FACodes() {
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const secret = account['2FA Mail'] || account['2FA Shop'];
        
        if (secret) {
            const codeElement = document.getElementById(`twofa-${i}`);
            const timerElement = document.getElementById(`timer-${i}`);
            const progressElement = document.getElementById(`progress-${i}`);
            
            if (codeElement && timerElement && progressElement) {
                try {
                    const response = await fetch('/api/generate-2fa', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ secret })
                    });
                    
                    const data = await response.json();
                    
                    if (data.token) {
                        codeElement.textContent = data.token;
                        const remaining = data.remaining;
                        timerElement.textContent = `${remaining}s`;
                        
                        // Update progress bar
                        const percentage = (remaining / 30) * 100;
                        progressElement.style.width = `${percentage}%`;
                        
                        // Warning color when less than 10 seconds
                        if (remaining <= 10) {
                            timerElement.classList.add('warning');
                            progressElement.classList.add('warning');
                        } else {
                            timerElement.classList.remove('warning');
                            progressElement.classList.remove('warning');
                        }
                    }
                } catch (error) {
                    console.error('Error generating 2FA:', error);
                }
            }
        }
    }
}

function copy2FACode(index) {
    event.stopPropagation();
    
    const codeElement = document.getElementById(`twofa-${index}`);
    if (codeElement) {
        const code = codeElement.textContent;
        if (code && code !== '------') {
            navigator.clipboard.writeText(code).then(() => {
                // Visual feedback
                const originalColor = codeElement.style.color;
                codeElement.style.color = '#40c057';
                setTimeout(() => {
                    codeElement.style.color = originalColor;
                }, 1000);
            }).catch(err => {
                console.error('Copy failed:', err);
                alert('Lỗi khi copy mã 2FA');
            });
        }
    }
}

// Action Menu Functions
function toggleActionMenu(event, index) {
    event.stopPropagation();
    
    const menuId = `menu-${index}`;
    const menu = document.getElementById(menuId);
    
    // Close all other menus first
    closeAllActionMenus();
    
    // Toggle current menu
    if (menu) {
        menu.classList.toggle('show');
    }
}

function closeAllActionMenus() {
    document.querySelectorAll('.action-menu-dropdown').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Inline Note Editing Functions
function handleNoteFocus(event, index) {
    const element = event.target;
    element.classList.add('editing');
    
    // Show action buttons
    const actions = document.getElementById(`note-actions-${index}`);
    if (actions) {
        actions.classList.add('show');
    }
    
    // Store original value
    element.dataset.original = element.textContent;
}

function handleNoteBlur(event, index) {
    // Don't blur if clicking on save/cancel buttons
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && relatedTarget.closest(`#note-actions-${index}`)) {
        return;
    }
    
    // Auto-save on blur after a short delay
    setTimeout(() => {
        const actions = document.getElementById(`note-actions-${index}`);
        if (actions && actions.classList.contains('show')) {
            saveNote(index);
        }
    }, 200);
}

function handleNoteKeydown(event, index) {
    // Save on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        saveNote(index);
    }
    
    // Cancel on Escape
    if (event.key === 'Escape') {
        event.preventDefault();
        cancelNoteEdit(index);
    }
}

async function saveNote(index) {
    const noteElement = document.querySelector(`.editable-note[data-index="${index}"]`);
    if (!noteElement) return;
    
    const newNote = noteElement.textContent.trim();
    const originalNote = noteElement.dataset.original;
    
    // No change, just close
    if (newNote === originalNote) {
        cancelNoteEdit(index);
        return;
    }
    
    try {
        // Update account
        const account = accounts[index];
        const updatedAccount = { ...account, 'Note': newNote };
        
        const response = await fetch(`/api/accounts/${index}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedAccount)
        });

        if (response.ok) {
            // Update local data
            accounts[index].Note = newNote;
            noteElement.dataset.original = newNote;
            
            // Visual feedback
            noteElement.style.background = '#d3f9d8';
            setTimeout(() => {
                noteElement.style.background = '';
            }, 1000);
            
            // Hide buttons
            const actions = document.getElementById(`note-actions-${index}`);
            if (actions) {
                actions.classList.remove('show');
            }
            noteElement.classList.remove('editing');
        } else {
            alert('Lỗi khi lưu ghi chú');
            cancelNoteEdit(index);
        }
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Lỗi khi lưu ghi chú');
        cancelNoteEdit(index);
    }
}

function cancelNoteEdit(index) {
    const noteElement = document.querySelector(`.editable-note[data-index="${index}"]`);
    if (!noteElement) return;
    
    // Restore original value
    noteElement.textContent = noteElement.dataset.original;
    noteElement.classList.remove('editing');
    
    // Hide buttons
    const actions = document.getElementById(`note-actions-${index}`);
    if (actions) {
        actions.classList.remove('show');
    }
}

// Sort Table Function
function sortTable(column) {
    // Map display names to data field names
    const columnMap = {
        'Profile': 'Profile',
        'Shop Name': 'Shop Name',
        'Email': 'Email',
        'Note': 'Note',
        'Limit': 'Limit',
        'Score': 'Score',
        'Tier': 'Tier',
        'Status': 'Status'
    };
    
    const fieldName = columnMap[column];
    
    // Toggle sort direction if clicking same column
    if (sortColumn === fieldName) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = fieldName;
        sortDirection = 'asc';
    }
    
    // Sort the filtered accounts array
    filteredAccounts.sort((a, b) => {
        let aValue = a[fieldName] || '';
        let bValue = b[fieldName] || '';
        
        // Convert to string for comparison
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
        
        if (sortDirection === 'asc') {
            return aValue.localeCompare(bValue, 'vi');
        } else {
            return bValue.localeCompare(aValue, 'vi');
        }
    });
    
    // Update sort icons
    document.querySelectorAll('thead th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    const clickedHeader = Array.from(document.querySelectorAll('thead th.sortable')).find(
        th => th.textContent.trim().startsWith(column)
    );
    
    if (clickedHeader) {
        clickedHeader.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
    
    // Re-render the table
    renderAccounts();
}

// Export Template Function
function exportTemplate() {
    const templateData = [{
        'Profile': 'Example Profile',
        'Shop Name': 'Example Shop',
        'ShopCode': 'SHOP001',
        'Email': 'example@email.com',
        'Pass Acc': 'password123',
        'Business Name': 'Example Business',
        'EIN': '12-3456789',
        'Business Address': '123 Main St',
        'Full Name': 'John Doe',
        'SSN': '123-45-6789',
        'Address': '456 Home St',
        'Date Of Birth': '01/01/1990',
        'Phone': '+1234567890',
        'Bank': 'Example Bank',
        'Proxy': 'ip:port:user:pass',
        '2FA Mail': 'JBSWY3DPEHPK3PXP',
        '2FA Shop': 'JBSWY3DPEHPK3PXP',
        'Note': 'Example note',
        'Limit': '1000',
        'Score': '95',
        'Tier': 'Gold',
        'Status': 'Live'
    }];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Download file
    XLSX.writeFile(wb, 'template_account.xlsx');
}

// Import Excel Function
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset input để có thể import lại cùng file
    event.target.value = '';

    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const importedData = XLSX.utils.sheet_to_json(firstSheet);

            if (importedData.length === 0) {
                alert('File Excel trống hoặc không đúng định dạng!');
                return;
            }

            // Confirm before importing
            const confirm = window.confirm(
                `Bạn có muốn import ${importedData.length} tài khoản?\n\n` +
                `Chọn OK để THÊM vào danh sách hiện tại.\n` +
                `Chọn Cancel để hủy.`
            );

            if (!confirm) return;

            // Send to server
            const response = await fetch('/api/accounts/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(importedData)
            });

            if (response.ok) {
                await loadAccounts();
                alert(`Đã import thành công ${importedData.length} tài khoản!`);
            } else {
                const error = await response.json();
                alert('Lỗi khi import: ' + (error.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error importing:', error);
            alert('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
        }
    };

    reader.readAsArrayBuffer(file);
}




