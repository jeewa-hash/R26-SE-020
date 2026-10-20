// Populate only the requested demo seekers' posts; reruns leave matching posts unchanged.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const authDependency = name => require(path.join(root, 'authService/node_modules', name));
const authEnv = authDependency('dotenv').config({ path: path.join(root, 'authService/.env'), quiet: true }).parsed;
const seekerEnv = authDependency('dotenv').parse(require('node:fs').readFileSync(path.join(root, 'Seeker_Service/.env')));
const authMongoose = authDependency('mongoose');
const Seeker = require('../authService/models/Seeker');

async function main() {
  const date = process.argv[2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date))) throw new Error('Supply demo date YYYY-MM-DD.');
  const followingDay = new Date(`${date}T00:00:00Z`); followingDay.setUTCDate(followingDay.getUTCDate() + 1);
  const nextDate = followingDay.toISOString().slice(0, 10);
  const { default: mongoose } = await import(pathToFileURL(path.join(root, 'Seeker_Service/node_modules/mongoose/index.js')).href);
  const { default: Post } = await import(pathToFileURL(path.join(root, 'Seeker_Service/models/Post.js')).href);
  try {
    await authMongoose.connect(authEnv.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    await mongoose.connect(seekerEnv.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    const rows = [
      ['Ayesha', 'Install a ceiling fan in the living room', 'Electrical', date, '09:00', '11:00', false, '4000–6000', 'Borella', 6.9147, 79.8778,
        'Install one new ceiling fan at an existing wired ceiling point. The fan and mounting accessories are supplied. Please include mounting, connection, and a functional test in your quotation.', ['electrical', 'ceiling fan', 'installation']],
      ['Sanduni', 'Replace two faulty wall sockets', 'Electrical', date, '10:30', '12:00', true, '3000–5000', 'Rajagiriya', 6.9097, 79.8960,
        'Replace two loose wall sockets in the study and inspect their connections. Replacement sockets are supplied. Please quote labour and any additional materials separately. The requested start can move to the afternoon if your earlier job overlaps.', ['electrical', 'socket replacement', 'repair']],
      ['Tharushi', 'Install two LED light fittings', 'Electrical', date, '14:00', '16:00', true, '3500–5500', 'Nugegoda', 6.8649, 79.8997,
        'Install two supplied LED light fittings using existing ceiling wiring in the dining room and hallway. Include connection checks and testing. Please send your estimated duration and labour quotation; an afternoon start is preferred.', ['electrical', 'lighting', 'installation']],
      ['Ayesha', 'Replace a leaking kitchen mixer tap', 'Plumbing', date, '13:00', '15:00', false, '3500–5500', 'Borella', 6.9147, 79.8778,
        'Remove the leaking kitchen mixer tap and install a supplied replacement. Check the flexible hoses, reconnect the water supply, and test for leaks. The isolation valve is accessible. Please include any extra hose costs separately.', ['plumbing', 'tap replacement', 'leak repair']],
      ['Sanduni', 'Repair a bathroom basin drain leak', 'Plumbing', date, '14:00', '16:00', true, '3000–5000', 'Rajagiriya', 6.9097, 79.8960,
        'Water leaks from the waste pipe beneath one bathroom basin. Inspect the trap and joints, replace damaged seals or fittings, and test drainage. Please quote labour and parts separately. A later start is acceptable if your previous booking runs into this window.', ['plumbing', 'basin', 'drain leak']],
      ['Tharushi', 'Replace a toilet cistern inlet valve', 'Plumbing', nextDate, '09:00', '11:00', true, '4000–6500', 'Nugegoda', 6.8649, 79.8997,
        'The toilet cistern fills slowly and continues running. Inspect and replace the inlet valve, adjust the water level, and test flushing. Please include a compatible replacement valve in your quotation. A morning appointment is preferred.', ['plumbing', 'cistern', 'inlet valve']],
    ];
    // Resolve all owners before creating any posts.
    const owners = new Map();
    for (const name of ['Ayesha', 'Sanduni', 'Tharushi']) {
      const owner = await Seeker.findOne({ email: `${name}Seeker@workwave.com` }).lean();
      if (!owner) throw new Error(`Demo seeker missing: ${name}`);
      owners.set(name, owner);
    }
    for (const [name, title, category, day, startTime, endTime, flexible, budget, city, lat, lng, details, tags] of rows) {
      const owner = owners.get(name);
      const filter = { seekerId: owner._id.toString(), title, 'preferredSchedule.date': day };
      const existing = await Post.findOne(filter);
      const post = existing || await Post.create({
        seekerId: owner._id.toString(), userId: owner._id.toString(), title,
        description: `${details}\nPreferred visit: ${day}, ${startTime}–${endTime} (Sri Lanka time). Budget: LKR ${budget}. Demo request.`,
        category, tags, urgency: 'medium', language: 'en', budget: `LKR ${budget}`,
        poster: { name: owner.name, district: owner.district, telephone: owner.telephone },
        location: { address: `Demo residence, ${city}, Colombo`, district: 'Colombo', city, lat, lng },
        preferredSchedule: { date: day, startTime, endTime, flexible },
      });
      console.log(JSON.stringify({ owner: owner.email, title, date: day, time: `${startTime}–${endTime}`, id: String(post._id), status: existing ? 'existing' : 'created' }));
    }
  } finally { await Promise.all([authMongoose.disconnect(), mongoose.disconnect()]); }
}
main().catch(error => { console.error(error.name, error.code || error.message); process.exitCode = 1; });
