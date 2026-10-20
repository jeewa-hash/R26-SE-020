// Sample experience values for the six explicitly seeded demo providers only.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
require(path.join(root, 'authService/node_modules/dotenv')).config({ path: path.join(root, 'authService/.env'), quiet: true });
const mongoose = require(path.join(root, 'authService/node_modules/mongoose'));
const Provider = require('../authService/models/Provider');
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  for (const [index, [name, yearsExperience]] of [['Amal', 8], ['Nimal', 5], ['Kasun', 3], ['Sunil', 10], ['Kamal', 6], ['Dinesh', 4]].entries()) {
    const provider = await Provider.findOneAndUpdate({
      email: `${name}Provider@workwave.com`, nicNumber: `DEMO-WORKWAVE-${String(index + 1).padStart(3, '0')}`,
    }, { $set: { yearsExperience } }, { new: true, runValidators: true });
    if (!provider || provider.yearsExperience !== yearsExperience) throw new Error(`Demo provider missing: ${name}`);
    console.log(`${provider.email}: ${provider.yearsExperience} years`);
  }
}
main().catch(error => { console.error(error.name, error.code || error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
