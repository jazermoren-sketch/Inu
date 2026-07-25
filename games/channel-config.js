const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'game-channels.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return {}; }
}
function save(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

function get(guildId) { return load()[guildId] || []; }
function isAllowed(guildId, channelId) {
  const channels = get(guildId);
  return channels.length === 0 || channels.includes(channelId);
}
function set(guildId, channelIds) {
  const data = load();
  data[guildId] = [...new Set(channelIds)].slice(0, 25);
  save(data);
  return data[guildId];
}
function clear(guildId) {
  const data = load();
  delete data[guildId];
  save(data);
}

module.exports = { get, set, clear, isAllowed };
