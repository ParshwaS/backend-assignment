const express = require('express');
const app = express();
const socket = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');
const port = process.env.PORT || 3000;
app.use(express.json());
require('./models');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, 'api'));

const server = app.listen(port, () => {
  console.log('Listening on port %d', port);
});

const io = socket(server);

require('./api')(app, io);