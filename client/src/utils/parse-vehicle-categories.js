// Утилита для парсинга категорий транспортных средств из файла vehicles_hashes_with_category.txt

const fs = require('fs');
const path = require('path');

function parseVehicleCategories() {
  const filePath = path.join(__dirname, '..', 'vehicles_hashes_with_category.txt');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const categories = {};
  let currentCategory = null;
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Ищем заголовки категорий (==CategoryName==)
    const categoryMatch = line.match(/^==(.+?)==$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1];
      continue;
    }
    
    // Пропускаем строки без галереи
    if (!line.includes('<gallery') && !line.includes('Image:')) {
      continue;
    }
    
    // Ищем строки с информацией о транспортных средствах
    const vehicleMatch = line.match(/Image:.*?'''Name:''' <code>(\w+)<\/code>.*?'''Hash:''' <span[^>]*>0x([A-F0-9]+)<\/span>/);
    if (vehicleMatch && currentCategory) {
      const [, name, hashHex] = vehicleMatch;
      const hash = parseInt(hashHex, 16);
      
      if (!categories[currentCategory]) {
        categories[currentCategory] = [];
      }
      
      categories[currentCategory].push({
        name,
        hash,
        hashHex: `0x${hashHex}`
      });
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
