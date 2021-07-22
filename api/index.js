module.exports = function (app, io) {
	require('./invoice.api')(app, io);
};