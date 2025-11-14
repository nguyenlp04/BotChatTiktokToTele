const XLSX = require('xlsx');
const path = require('path');

// Đọc file Excel
const filePath = path.join(__dirname, 'account.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Chuyển đổi sang JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Cấu trúc file Excel:');
console.log('Số dòng:', data.length);
console.log('\nCác cột:');
if (data.length > 0) {
  Object.keys(data[0]).forEach(key => {
    console.log(`- ${key}`);
  });
  
  console.log('\nDữ liệu mẫu (3 dòng đầu):');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
}
