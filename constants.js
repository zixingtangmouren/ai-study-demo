const path = require('path');

const filePtah = path.join(__dirname, 'docs/index.md');

const dbPath = path.join(__dirname, 'db/faiss');

module.exports = {
  filePtah,
  dbPath,
};
