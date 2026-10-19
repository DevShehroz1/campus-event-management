const app = require('./src/app');
const env = require('./src/config/env');

app.listen(env.port, () => {
    console.log(`CampusHub API running on http://localhost:${env.port}/api`);
});
