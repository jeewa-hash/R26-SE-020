const fs = require('fs'),
  path = require('path');
// Validate literal icon names, conditional names and icon configuration records.
// Runtime-only names supplied by a server still need to follow the same glyph families.
const base = path.resolve(__dirname, '../..');
let totalIssues = 0;
const parser = require(path.join(base, 'Frontend/Seeker_Mobile_App/node_modules/@babel/parser'));
const traverse = require(path.join(base, 'Frontend/Seeker_Mobile_App/node_modules/@babel/traverse')).default;
function strings(n) {
  if (!n) return [];
  if (n.type === 'StringLiteral') return [n.value];
  if (n.type === 'ConditionalExpression') return [...strings(n.consequent), ...strings(n.alternate)];
  if (n.type === 'LogicalExpression') return [...strings(n.left), ...strings(n.right)];
  return [];
}
for (const app of ['Seeker_Mobile_App', 'ServiceProviderFrontend']) {
  const root = path.join(base, 'Frontend', app),
    maps = {};
  const issues = [];
  const glyphDir = path.join(root, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps');
  for (const file of fs.readdirSync(glyphDir)) {
    if (file.endsWith('.json')) maps[file.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(glyphDir, file)));
  }
  function check(file, node, family, name, kind) {
    if (maps[family] && !(name in maps[family])) issues.push({
      file: path.relative(root, file),
      line: node.loc.start.line,
      family,
      name,
      kind
    });
  }
  function walk(dir) {
    for (const e of fs.readdirSync(dir, {
      withFileTypes: true
    })) {
      if (e.name.startsWith('.') || ['node_modules', 'android', 'ios', 'dist'].includes(e.name)) continue;
      const file = path.join(dir, e.name);
      if (e.isDirectory()) walk(file);else if (/\.(jsx?|tsx?)$/.test(file) && !file.endsWith('.test.js')) {
        const code = fs.readFileSync(file, 'utf8');
        let ast;
        try {
          ast = parser.parse(code, {
            sourceType: 'unambiguous',
            plugins: ['jsx', 'typescript']
          });
        } catch {
          continue;
        }
        const imports = {};
        traverse(ast, {
          ImportDeclaration(p) {
            if (p.node.source.value === '@expo/vector-icons') for (const sp of p.node.specifiers) if (sp.type === 'ImportSpecifier') imports[sp.local.name] = sp.imported.name;
          }
        });
        const families = [...new Set(Object.values(imports))];
        traverse(ast, {
          JSXOpeningElement(p) {
            const localName = p.node.name.name;
            const family = imports[localName] || ({
              ActionButton: 'MaterialIcons',
              EmptyJobsState: 'MaterialIcons',
              StatusBadge: 'MaterialIcons',
              InfoRow: 'MaterialIcons'
            }[localName] && p.scope.getBinding(localName)?.path?.parent?.source?.value?.includes('components/') ? 'MaterialIcons' : null);
            if (!family) return;
            const attr = p.node.attributes.find(a => a.name?.name === (imports[localName] ? 'name' : 'icon'));
            if (!attr) return;
            const expr = attr.value?.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value;
            for (const name of strings(expr)) check(file, attr, family, name, 'jsx');
          },
          ObjectExpression(p) {
            const fields = Object.fromEntries(p.node.properties.filter(x => x.type === 'ObjectProperty' && x.key).map(x => [x.key.name || x.key.value, x.value]));
            const family = fields.iconFamily?.value || {
              ion: 'Ionicons',
              material: 'MaterialIcons'
            }[fields.iconType?.value] || (families.length === 1 ? families[0] : null);
            if (family) for (const key of ['icon', 'iconName', 'activeIcon']) for (const name of strings(fields[key])) check(file, fields[key], family, name, 'data');
          },
          AssignmentExpression(p) {
            if (families.length === 1 && /icon(Name)?$/i.test(p.node.left.name || '')) for (const name of strings(p.node.right)) check(file, p.node, families[0], name, 'assignment');
          }
        });
      }
    }
  }
  walk(root);
  totalIssues += issues.length;
  console.log(app + ': ' + (issues.length ? JSON.stringify(issues, null, 2) : 'all checked icon names are valid'));
}
if (totalIssues) process.exitCode = 1;
