const XLSX = require('./frontend/node_modules/xlsx');
const wb = XLSX.readFile('C:/Users/ashir/Downloads/companies.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log(`\n=== COMPANIES EXPORT (${data.length} rows) ===\n`);
console.log('Columns:', Object.keys(data[0]).join(' | '));
console.log('─'.repeat(120));

data.forEach((row, i) => {
  const company = String(row['Company'] || '').padEnd(28);
  const domain = String(row['Domain'] || '').padEnd(22);
  const industry = String(row['Industry'] || '').padEnd(18);
  const emp = String(row['Employees'] || '').padEnd(6);
  const funding = String(row['Funding Stage'] || '').padEnd(12);
  const country = String(row['Country'] || '').padEnd(6);
  const icp = String(row['ICP Score'] || '').padEnd(5);
  const signals = String(row['Signals'] || '').substring(0, 30);
  console.log(`${String(i+1).padStart(3)}. ${company} ${domain} ${industry} ${emp} ${funding} ${country} ${icp} ${signals}`);
});

console.log('\n─'.repeat(120));
console.log(`Total: ${data.length} companies exported`);
