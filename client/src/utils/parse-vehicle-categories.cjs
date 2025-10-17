// Утилита для парсинга категорий транспортных средств из файла vehicles_hashes_with_category.txt

const fs = require('fs');
const path = require('path');

function parseVehicleCategories() {
  const filePath = path.join(__dirname, '..', 'vehicles_hashes_with_category.txt');
  console.log('Reading file:', filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File size:', content.length);
  
  const categories = {};
  let currentCategory = null;
  
  const lines = content.split('\n');
  console.log('Total lines:', lines.length);
  
  // Убираем отладочный вывод
  
  for (const line of lines) {
    // Ищем заголовки категорий (==CategoryName==)
    const trimmedLine = line.trim();
    if (trimmedLine.includes('==') && trimmedLine.startsWith('==') && trimmedLine.endsWith('==')) {
      currentCategory = trimmedLine.slice(2, -2);
      console.log(`Found category: ${currentCategory}`);
      continue;
    }
    
    // Отладочная информация для первых 50 строк
    if (lines.indexOf(line) < 50 && line.includes('==')) {
      console.log(`Line ${lines.indexOf(line)}: "${line}"`);
      console.log(`Starts with ==: ${line.startsWith('==')}`);
      console.log(`Ends with ==: ${line.endsWith('==')}`);
    }
    
    // Пропускаем строки без Image:
    if (!line.includes('Image:')) {
      continue;
    }
    
    // Ищем строки с информацией о транспортных средствах
    if (line.includes("'''Name:'''") && line.includes("'''Hash:'''")) {
      const nameMatch = line.match(/'''Name:''' <code>(\w+)<\/code>/);
      const hashMatch = line.match(/'''Hash:''' <span[^>]*>(0x[A-F0-9]+)<\/span>/);
      
      if (nameMatch && hashMatch && currentCategory) {
        const name = nameMatch[1];
        const hashHex = hashMatch[1];
        const hash = parseInt(hashHex, 16);
        
        if (!categories[currentCategory]) {
          categories[currentCategory] = [];
        }
        
        categories[currentCategory].push({
          name,
          hash,
          hashHex
        });
        console.log(`Found vehicle: ${name} in ${currentCategory}`);
      }
    }
  }
  
  return categories;
}

function generateVehicleCategories() {
  const categories = parseVehicleCategories();
  
  // Создаем маппинг имя -> категория
  const nameToCategory = {};
  const categoryList = [];
  
  for (const [categoryName, vehicles] of Object.entries(categories)) {
    categoryList.push({
      name: categoryName,
      count: vehicles.length,
      vehicles: vehicles.map(v => v.name)
    });
    
    for (const vehicle of vehicles) {
      nameToCategory[vehicle.name] = categoryName;
    }
  }
  
  return {
    categories: categoryList,
    nameToCategory,
    allVehicles: Object.values(categories).flat()
  };
}

if (require.main === module) {
  const result = generateVehicleCategories();
  console.log('Categories found:', result.categories.length);
  console.log('Total vehicles:', result.allVehicles.length);
  console.log('\nCategories:');
  result.categories.forEach(cat => {
    console.log(`- ${cat.name}: ${cat.count} vehicles`);
  });
  
  // Сохраняем результат в JSON файл
  const outputPath = path.join(__dirname, '..', 'data', 'vehicle-categories.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
}

module.exports = { parseVehicleCategories, generateVehicleCategories };
