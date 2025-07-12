import fs from 'fs';
import path from 'path';
const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));

console.log(tsconfig);

const baseUrl = tsconfig.compilerOptions.baseUrl;
const extensionsToProcess = ['.js', '.ts', '.tsx', '.jsx'];
const ignoreDirectories = ['node_modules', 'build', 'dist'];

const importRegex = /^import.*$/gm;
const prefix = '^import\\s';
const sortGroups = {
  react: new RegExp(`${prefix}.*react`),
  external: new RegExp(`${prefix}.*'([a-zA-Z]+)'`),
  services: new RegExp(`${prefix}.*services`),
  states: new RegExp(`${prefix}.*(state|recoil)`),
  hooks: new RegExp(`${prefix}.*hooks`),
  other: new RegExp(`${prefix}333`), // Collests all imports that don't match any other group
  sideEffect: new RegExp(`${prefix}['|"]`),
};

console.clear();

const filterFile = file => {
  const extension = path.extname(file);
  const directory = path.dirname(file);

  if (ignoreDirectories.includes(directory)) {
    return false;
  }

  return extensionsToProcess.includes(extension);
};

// Function to categorize imports into groups
const categorizeImports = (imports) => {
  const groups = Object.keys(sortGroups).reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});

  imports.forEach(importLine => {
    const line = importLine.trim();

    for (const group in sortGroups) {
      if (sortGroups[group].test(line)) {
        groups[group].push(line);
        return;
      }
    }

    // If no group matched, add to the external group
    groups.other.push(line);
  });

  // Sort each group by line length
  for (const group in groups) {
    groups[group] = groups[group].sort((a, b) => {
      let _a = a.split('}')[0];
      let _b = b.split('}')[0];

      return _a.length - _b.length;
    });
  }

  // console.log(groups);

  return groups;
};

// Function to sort imports by line length
const sortImportsByLength = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePathToLog = baseUrl.split('/').at(-1) + '/' + path.relative(baseUrl, filePath);

  // Get all the import statements from the file
  const imports = content.match(importRegex);

  if (imports) {
    const categorizedImports = categorizeImports(imports);
    const sortedImports = Object.keys(categorizedImports)
      .reduce((acc, key) => {
        let importsGroupString = categorizedImports[key].join('\n');
        return acc.push(importsGroupString) && acc;
      }, [])
      .join('\n\n');

    // Remove all import statements and double empty lines from the file
    let newContent = content.replace(importRegex, '');;

    // Insert the sorted import statements at the top of the file
    newContent = sortedImports + '\n\n' + newContent;
    newContent = newContent.replace(/\n{3,}/g, '\n\n');
    newContent = newContent.replace(/^\n{2,}/g, '');

    // Write the sorted content back to the file
    fs.writeFileSync(filePath, newContent, 'utf-8');

    console.info(`Sorted imports in: ${relativePathToLog}`);
  } else {
    // console.info(`No imports found in: ${relativePathToLog}`);
  }
};

// Function to scan a directory recursively
const scanDirectory = (directoryPath) => {
  const files = fs.readdirSync(directoryPath);

  files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      scanDirectory(filePath);
    } else if (filterFile(file)) {
      // Process JavaScript/TypeScript files
      sortImportsByLength(filePath);
    }
  });
};

// Get all JavaScript and TypeScript files in the project directory
const directoryPath = baseUrl; // Use the baseUrl from tsconfig.json
// const directoryPath = 'src/components/LeftDrawer/ContextMenu';

scanDirectory(directoryPath);
