const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const OTPAuth = require('otpauth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Đọc file Excel
function readExcel() {
  try {
    const filePath = path.join(__dirname, 'account.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    console.error('Lỗi đọc file Excel:', error);
    return [];
  }
}

// Lưu file Excel
function saveExcel(data) {
  try {
    const filePath = path.join(__dirname, 'account.xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts');
    XLSX.writeFile(workbook, filePath);
    return true;
  } catch (error) {
    console.error('Lỗi lưu file Excel:', error);
    return false;
  }
}

// API: Lấy tất cả tài khoản
app.get('/api/accounts', (req, res) => {
  const accounts = readExcel();
  res.json(accounts);
});

// API: Tìm kiếm tài khoản
app.get('/api/accounts/search', (req, res) => {
  const { q } = req.query;
  const accounts = readExcel();
  
  if (!q) {
    return res.json(accounts);
  }
  
  const searchTerm = q.toLowerCase();
  const filtered = accounts.filter(acc => 
    Object.values(acc).some(value => 
      String(value).toLowerCase().includes(searchTerm)
    )
  );
  
  res.json(filtered);
});

// API: Thêm tài khoản
app.post('/api/accounts', (req, res) => {
  const accounts = readExcel();
  accounts.push(req.body);
  
  if (saveExcel(accounts)) {
    res.json({ success: true, message: 'Đã thêm tài khoản' });
  } else {
    res.status(500).json({ success: false, message: 'Lỗi khi lưu' });
  }
});

// API: Import nhiều tài khoản
app.post('/api/accounts/import', (req, res) => {
  try {
    const importedAccounts = req.body;
    
    if (!Array.isArray(importedAccounts) || importedAccounts.length === 0) {
      return res.status(400).json({ success: false, message: 'Dữ liệu import không hợp lệ' });
    }

    const accounts = readExcel();
    const newAccounts = [...accounts, ...importedAccounts];
    
    if (saveExcel(newAccounts)) {
      res.json({ 
        success: true, 
        message: `Đã import ${importedAccounts.length} tài khoản`,
        count: importedAccounts.length 
      });
    } else {
      res.status(500).json({ success: false, message: 'Lỗi khi lưu' });
    }
  } catch (error) {
    console.error('Error importing accounts:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi import' });
  }
});

// API: Cập nhật tài khoản
app.put('/api/accounts/:index', (req, res) => {
  const { index } = req.params;
  const accounts = readExcel();
  
  if (index >= 0 && index < accounts.length) {
    accounts[index] = { ...accounts[index], ...req.body };
    
    if (saveExcel(accounts)) {
      res.json({ success: true, message: 'Đã cập nhật tài khoản' });
    } else {
      res.status(500).json({ success: false, message: 'Lỗi khi lưu' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
  }
});

// API: Xóa tài khoản
app.delete('/api/accounts/:index', (req, res) => {
  const { index } = req.params;
  const accounts = readExcel();
  
  if (index >= 0 && index < accounts.length) {
    accounts.splice(index, 1);
    
    if (saveExcel(accounts)) {
      res.json({ success: true, message: 'Đã xóa tài khoản' });
    } else {
      res.status(500).json({ success: false, message: 'Lỗi khi lưu' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
  }
});

// API: Sắp xếp lại tài khoản
app.post('/api/accounts/reorder', (req, res) => {
  const { fromIndex, toIndex } = req.body;
  const accounts = readExcel();
  
  if (fromIndex >= 0 && fromIndex < accounts.length && toIndex >= 0 && toIndex < accounts.length) {
    // Remove item from old position
    const [movedItem] = accounts.splice(fromIndex, 1);
    // Insert at new position
    accounts.splice(toIndex, 0, movedItem);
    
    if (saveExcel(accounts)) {
      res.json({ success: true, message: 'Đã sắp xếp lại tài khoản' });
    } else {
      res.status(500).json({ success: false, message: 'Lỗi khi lưu' });
    }
  } else {
    res.status(400).json({ success: false, message: 'Chỉ số không hợp lệ' });
  }
});

// API: Check proxy
app.post('/api/check-proxy', async (req, res) => {
  const { proxy, index } = req.body;
  
  if (!proxy) {
    return res.json({ status: 'failed', error: 'No proxy provided' });
  }

  try {
    const https = require('https');
    const http = require('http');
    
    // Parse proxy format: ip:port or ip:port:user:pass
    const parts = proxy.split(':');
    const proxyHost = parts[0];
    const proxyPort = parseInt(parts[1]);
    
    // Test proxy by making a request
    const startTime = Date.now();
    
    const options = {
      host: proxyHost,
      port: proxyPort,
      method: 'CONNECT',
      path: 'www.google.com:443'
    };

    const proxyReq = http.request(options);
    
    proxyReq.on('connect', (proxyRes, socket, head) => {
      const speed = Date.now() - startTime;
      socket.end();
      res.json({
        proxy,
        status: 'working',
        speed: speed
      });
    });

    proxyReq.on('error', (err) => {
      res.json({
        proxy,
        status: 'failed',
        error: err.message
      });
    });

    // Timeout after 5 seconds
    proxyReq.setTimeout(5000, () => {
      proxyReq.abort();
      res.json({
        proxy,
        status: 'failed',
        error: 'Timeout'
      });
    });

    proxyReq.end();

  } catch (error) {
    res.json({
      proxy,
      status: 'failed',
      error: error.message
    });
  }
});

// API: Generate 2FA code
app.post('/api/generate-2fa', (req, res) => {
  const { secret } = req.body;
  
  if (!secret) {
    return res.status(400).json({ error: 'Secret is required' });
  }

  try {
    // Remove spaces and convert to uppercase
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
    
    // Create TOTP instance
    const totp = new OTPAuth.TOTP({
      issuer: 'TikTok',
      label: 'Account',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: cleanSecret
    });

    // Generate token
    const token = totp.generate();
    
    // Calculate remaining time
    const now = Math.floor(Date.now() / 1000);
    const remaining = 30 - (now % 30);

    res.json({
      token,
      remaining,
      period: 30
    });
  } catch (error) {
    console.error('Error generating 2FA:', error);
    res.status(500).json({ error: 'Failed to generate 2FA code' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 Quản lý ${readExcel().length} tài khoản`);
});
