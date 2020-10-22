const fs = require('fs');
const Papa = require('papaparse');
const pify = require('pify');

async function writeCsv(path, data) {
  const csv = Papa.unparse(data);
  await pify(fs.writeFile)(path, csv);
}

module.exports = {
  jsonSchema: {
    properties: {
      path: {},
      data: {},
    },
  },
  command: (input) => {
    return writeCsv(input.path, input.data);
  },
}