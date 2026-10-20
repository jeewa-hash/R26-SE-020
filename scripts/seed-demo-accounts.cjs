// Uses the same database as local authService. Existing accounts are never updated.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dependency = name => require(path.join(root, 'authService/node_modules', name));
dependency('dotenv').config({ path: path.join(root, 'authService/.env'), quiet: true });
const mongoose = dependency('mongoose');
const bcrypt = dependency('bcryptjs');
const Provider = require('../authService/models/Provider');
const Seeker = require('../authService/models/Seeker');

async function main() {
  if (!process.env.DEMO_ACCOUNT_PASSWORD) throw new Error('Set DEMO_ACCOUNT_PASSWORD.');
  if (!process.env.MONGO_URI) throw new Error('Configure authService/.env MONGO_URI.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const password = await bcrypt.hash(process.env.DEMO_ACCOUNT_PASSWORD, 10);
  const people = [
    ['Amal', 'Electrician'], ['Nimal', 'Electrician'], ['Kasun', 'Electrician'],
    ['Sunil', 'Plumber'], ['Kamal', 'Plumber'], ['Dinesh', 'Plumber'],
    ['Ayesha'], ['Sanduni'], ['Tharushi'],
  ];
  for (const [index, [name, category]] of people.entries()) {
    const isProvider = Boolean(category);
    const email = `${name}${isProvider ? 'Provider' : 'Seeker'}@workwave.com`;
    const Model = isProvider ? Provider : Seeker;
    const existing = await Model.findOne({ email: { $regex: `^${email.replace(/\./g, '\\.')}$`, $options: 'i' } });
    if (existing) {
      console.log(JSON.stringify({ email: existing.email, status: 'existing, unchanged' }));
      continue;
    }
    const common = {
      name, email, password, nicNumber: `DEMO-WORKWAVE-${String(index + 1).padStart(3, '0')}`,
      telephone: `07000000${String(index + 1).padStart(2, '0')}`, district: 'Colombo',
      location: { latitude: 6.9271 + index * 0.001, longitude: 79.8612 + index * 0.001 },
    };
    const account = await Model.create(isProvider ? {
      ...common, yearsExperience: [8, 5, 3, 10, 6, 4][index], fullName: `${name} ${category}`, role: 'ServiceProvider', category,
      bio: `Demo ${category.toLowerCase()} account for local WorkWave testing.`,
      gender: 'Male', address: `Demo address ${index + 1}, Colombo`,
      nicImage: 'seed://demo-account/no-identity-document',
      isVerified: true, adminNote: 'Synthetic demo account created for application testing.',
    } : { ...common, role: 'Seeker', isEmailVerified: true });
    if (!await bcrypt.compare(process.env.DEMO_ACCOUNT_PASSWORD, account.password)) throw new Error('Password verification failed.');
    console.log(JSON.stringify({ email, role: account.role, category, status: 'created', id: String(account._id) }));
  }
}
main().catch(error => { console.error(error.name, error.code || 'Account seed failed'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
