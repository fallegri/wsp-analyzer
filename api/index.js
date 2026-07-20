const serverless = require('serverless-http');
const app = require('../dist/index').default;
module.exports = serverless(app);
