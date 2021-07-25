const mongoose = require('mongoose');
const Invoice = mongoose.model('invoice');
const pdfmake = require('../pdfmake/pdfmake');
const moment = require('moment');
const vfs = require('../pdfmake/vfs_fonts');
const nodemailer = require('nodemailer');
pdfmake.vfs = vfs.pdfMake.vfs;

// Using nodemailer
var smtpTransport = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'tester11332@gmail.com',
		pass: 'Password112233'
	}
});

setInterval(() => {
	Invoice.find({
		status: { $ne: 'Paid' }
	}).then(invoices => {
		invoices.forEach(invoice => {
			if (moment(invoice.due_date).isSameOrBefore(moment())) {
				Invoice.findByIdAndUpdate(invoice._id, {
					status: 'Late'
				}).then(() => {
					console.log('Late: ' + invoice.name);
					smtpTransport.sendMail({
						to: invoice.client.email,
						subject: 'Invoice ' + invoice.name + ' is overdue',
						text: 'Hi,\n\n' +
							'This is an automated message to notify you that invoice ' + invoice.client.name + ' is overdue.\n\n' +
							'Kind regards,\n' +
							'The team'
					});
				});
			}
		});
	});
}, 1800000);

module.exports = function (app, io) {
	// app is ExpressJS Router
	// io is Socket.io

	// Invoice API

	// Create Invoice
	app.post('/api/invoice/create', function (req, res) {

		// Create a new invoice
		if (req.body.lineItems) {
			req.body.lineItems.forEach(function (lineItem) {
				lineItem.total = lineItem.quantity * lineItem.rate;
			});
		}
		var invoice = new Invoice({
			client: req.body.client,
			date: req.body.date,
			status: req.body.status,
			lineItems: req.body.lineItems,
			notes: req.body.notes,
			total: req.body.lineItems.reduce((previousValue, currentValue) => (previousValue + currentValue.total), 0)
		});

		// Save the invoice to MongoDB
		invoice.save(function (err) {
			if (err) {
				res.status(400).json({
					status: false,
					error: err
				});
			} else {
				res.status(200).json({
					status: true,
					message: 'Invoice created!',
					invoice: invoice
				});
			}
		});
	});

	// Update Invoice
	app.post('/api/invoice/update', function (req, res) {
		if (req.body.lineItems) {
			req.body.lineItems.forEach(function (lineItem) {
				lineItem.total = lineItem.quantity * lineItem.rate;
			});
			req.body.total = req.body.lineItems.reduce((previousValue, currentValue) => (previousValue + currentValue.total), 0);
		}
		Invoice.findOneAndUpdate({
			_id: req.body.id
		}, req.body,
			function (err, invoice) {
				if (err) {
					res.status(400).json({
						status: false,
						error: err
					});
				} else {

					res.status(200).json({
						status: true,
						message: 'Invoice updated!',
						invoice: invoice
					});
				}
			});
	});

	// Delete Invoice
	app.post('/api/invoice/delete', function (req, res) {
		Invoice.remove({
			_id: req.body.id
		}, function (err) {
			if (err) {
				res.status(400).json({
					status: false,
					error: err
				});
			}
			else {
				res.status(200).json({
					status: true,
					message: 'Invoice deleted!'
				});
			}
		});
	});

	// Get Invoice
	app.get('/api/invoice/get', function (req, res) {
		Invoice.find({}, function (err, invoices) {
			if (err) {
				res.status(400).json({
					status: false,
					error: err
				});
			} else {
				res.status(200).json({
					status: true,
					invoice: invoices
				});
			}
		});
	});

	// Get Invoice by ID
	app.get('/api/invoice/get/:id', function (req, res) {
		Invoice.findOne({
			_id: req.params.id
		}, function (err, invoice) {
			if (err) {
				res.status(400).json({
					status: false,
					error: err
				});
			} else {
				res.status(200).json({
					status: true,
					invoice: invoice
				});
			}
		});
	});

	// Update Status Of Invoice (paid, outstanding, late, paid-late, partially-paid)
	app.post('/api/invoice/update/status', function (req, res) {
		Invoice.findOneAndUpdate({
			_id: req.body.id
		}, {
			status: req.body.status
		},
			function (err, invoice) {
				if (err) {
					res.status(400).json({
						status: false,
						error: err
					});
				} else {
					res.status(200).json({
						status: true,
						message: 'Invoice updated!',
						invoice: invoice
					});
				}
			});
	});

	// Send the invoice via email
	app.post('/api/invoice/send', function (req, res) {
		Invoice.findOne({
			_id: req.body.id
		}, function (err, invoice) {
			if (err) {
				res.status(400).json({
					status: false,
					error: err
				});
			} else {
				// Use pdfmake to generate pdf of invoice and attach it to email
				// Add table of listItems
				// dd is pdfmake doc definition

				var itemsPrint = [];

				(invoice.lineItems || []).forEach(function (item) {
					itemsPrint.push(
						[
							{
								text: item.description,
								border: [false, false, false, true],
								margin: [0, 5, 0, 5],
								alignment: 'left',
							},
							{
								border: [false, false, false, true],
								text: item.quantity,
								fillColor: '#f5f5f5',
								alignment: 'right',
								margin: [0, 5, 0, 5],
							},
							{
								border: [false, false, false, true],
								text: item.rate,
								fillColor: '#f5f5f5',
								alignment: 'right',
								margin: [0, 5, 0, 5],
							},
							{
								border: [false, false, false, true],
								text: item.total,
								fillColor: '#f5f5f5',
								alignment: 'right',
								margin: [0, 5, 0, 5],
							},
						]
					);
				});

				var dd = {
					content: [
						{
							columns: [
								{
									image:
										'data:image/png;base64,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',
									width: 150,
								},
								[
									{
										text: 'Invoice',
										color: '#333333',
										width: '*',
										fontSize: 28,
										bold: true,
										alignment: 'right',
										margin: [0, 0, 0, 15],
									},
									{
										stack: [
											{
												columns: [
													{
														text: 'Invoice No.',
														color: '#aaaaab',
														bold: true,
														width: '*',
														fontSize: 12,
														alignment: 'right',
													},
													{
														text: invoice.number,
														bold: true,
														color: '#333333',
														fontSize: 12,
														alignment: 'right',
														width: 100,
													},
												],
											},
											{
												columns: [
													{
														text: 'Date Issued',
														color: '#aaaaab',
														bold: true,
														width: '*',
														fontSize: 12,
														alignment: 'right',
													},
													{
														text: moment(invoice.date).format('DD/MM/YYYY'),
														bold: true,
														color: '#333333',
														fontSize: 12,
														alignment: 'right',
														width: 100,
													},
												],
											},
											{
												columns: [
													{
														text: 'Status',
														color: '#aaaaab',
														bold: true,
														fontSize: 12,
														alignment: 'right',
														width: '*',
													},
													{
														text: invoice.status,
														bold: true,
														fontSize: 14,
														alignment: 'right',
														width: 100,
														textTransform: 'uppercase'
													},
												],
											},
										],
									},
								],
							],
						},
						'\n\n',
						{
							layout: {
								defaultBorder: false,
								hLineWidth: function (i, node) {
									return 1;
								},
								vLineWidth: function (i, node) {
									return 1;
								},
								hLineColor: function (i, node) {
									if (i === 1 || i === 0) {
										return '#bfdde8';
									}
									return '#eaeaea';
								},
								vLineColor: function (i, node) {
									return '#eaeaea';
								},
								hLineStyle: function (i, node) {
									// if (i === 0 || i === node.table.body.length) {
									return null;
									//}
								},
								// vLineStyle: function (i, node) { return {dash: { length: 10, space: 4 }}; },
								paddingLeft: function (i, node) {
									return 10;
								},
								paddingRight: function (i, node) {
									return 10;
								},
								paddingTop: function (i, node) {
									return 2;
								},
								paddingBottom: function (i, node) {
									return 2;
								},
								fillColor: function (rowIndex, node, columnIndex) {
									return '#fff';
								},
							},
							table: {
								headerRows: 1,
								widths: ['*', 50, 50, '*'],
								body: [
									[
										{
											text: 'Item Description',
											fillColor: '#eaf2f5',
											border: [false, true, false, true],
											margin: [0, 5, 0, 5],
										},
										{
											text: 'Quantity',
											fillColor: '#eaf2f5',
											border: [false, true, false, true],
											margin: [0, 5, 0, 5],
										},
										{
											text: 'Rate',
											fillColor: '#eaf2f5',
											border: [false, true, false, true],
											margin: [0, 5, 0, 5],
											textTransform: 'uppercase',
										},
										{
											text: 'Item Total',
											border: [false, true, false, true],
											alignment: 'right',
											fillColor: '#eaf2f5',
											margin: [0, 5, 0, 5],
											textTransform: 'uppercase',
										},
									],
									...itemsPrint
								],
							},
						},
						'\n',
						'\n\n',
						{
							layout: {
								defaultBorder: false,
								hLineWidth: function (i, node) {
									return 1;
								},
								vLineWidth: function (i, node) {
									return 1;
								},
								hLineColor: function (i, node) {
									return '#eaeaea';
								},
								vLineColor: function (i, node) {
									return '#eaeaea';
								},
								hLineStyle: function (i, node) {
									// if (i === 0 || i === node.table.body.length) {
									return null;
									//}
								},
								// vLineStyle: function (i, node) { return {dash: { length: 10, space: 4 }}; },
								paddingLeft: function (i, node) {
									return 10;
								},
								paddingRight: function (i, node) {
									return 10;
								},
								paddingTop: function (i, node) {
									return 3;
								},
								paddingBottom: function (i, node) {
									return 3;
								},
								fillColor: function (rowIndex, node, columnIndex) {
									return '#fff';
								},
							},
							table: {
								headerRows: 1,
								widths: ['*', 'auto'],
								body: [
									[
										{
											text: 'Total Amount',
											bold: true,
											fontSize: 10,
											alignment: 'right',
											border: [false, false, false, true],
											margin: [0, 5, 0, 5],
										},
										{
											text: 'INR ' + invoice.total,
											bold: true,
											fontSize: 10,
											alignment: 'right',
											border: [false, false, false, true],
											fillColor: '#f5f5f5',
											margin: [0, 5, 0, 5],
										},
									],
									[
										{
											text: 'Total Paid',
											bold: true,
											fontSize: 10,
											alignment: 'right',
											border: [false, false, false, true],
											margin: [0, 5, 0, 5],
										},
										{
											text: 'INR ' + invoice.paid,
											bold: true,
											fontSize: 10,
											alignment: 'right',
											border: [false, false, false, true],
											fillColor: '#f5f5f5',
											margin: [0, 5, 0, 5],
										},
									],
									[
										{
											text: 'Total Due',
											bold: true,
											fontSize: 20,
											alignment: 'right',
											border: [false, false, false, true],
											margin: [0, 5, 0, 5],
										},
										{
											text: 'INR ' + (invoice.total - invoice.paid),
											bold: true,
											fontSize: 20,
											alignment: 'right',
											border: [false, false, false, true],
											fillColor: '#f5f5f5',
											margin: [0, 5, 0, 5],
										},
									],
								],
							},
						},
						'\n\n',
						{
							text: 'NOTES',
							style: 'notesTitle',
						},
						{
							text: invoice.notes,
							style: 'notesText',
						},
					],
					styles: {
						notesTitle: {
							fontSize: 10,
							bold: true,
							margin: [0, 50, 0, 3],
						},
						notesText: {
							fontSize: 10,
						},
					},
					defaultStyle: {
						columnGap: 20,
						//font: 'Quicksand',
					},
				};

				pdfmake.createPdf(dd).getBase64((data) => {
					// Send pdf to client via email
					// Send email
					var mailOptions = {
						to: invoice.client.email,
						from: 'tester11332@gmail.com',
						subject: 'Invoice for ' + invoice.client.name,
						text: 'Please find attached invoice for ' + invoice.client.name,
						attachments: [{
							filename: 'invoice.pdf',
							path: 'data:application/pdf;base64,' + data
						}]
					};
					smtpTransport.sendMail(mailOptions, function (err) {
						if (err) {
							res.status(500).json({
								status: false,
								error: err
							});
						} else {
							res.status(200).json({
								status: true,
								message: 'Invoice sent!'
							});
						}
					});
				});
			}
		});
	});

	// Get Invoice By Status
	app.get('/api/invoice/status/:status', function (req, res) {
		Invoice.find({
			status: req.params.status
		}, function (err, invoices) {
			if (err) {
				res.status(400).json({
					status: false,
					error: err
				});
			}
			res.status(200).json({
				status: true,
				invoices: invoices
			});
		});
	});

	// Pay for invoice
	app.post('/api/invoice/pay', function (req, res) {
		Invoice.findById(req.body.id, function (err, invoice) {
			if (err) {
				res.status(400).json({
					status: false,
					error: err
				});
			}
			else if (invoice.status === 'Paid') {
				res.status(400).json({
					status: false,
					error: 'Invoice already paid!'
				});
			} else {
				invoice.paid += req.body.amount;
				if (invoice.total == invoice.paid) {
					invoice.status = 'Paid';
				} else if (invoice.paid != 0) {
					invoice.status = 'Partial';
				}
				invoice.save(function (err) {
					if (err) {
						res.status(400).json({
							status: false,
							error: err
						});
					}
					res.status(200).json({
						status: true,
						message: 'Invoice paid!'
					});
				});
			}
		});
	});
}
