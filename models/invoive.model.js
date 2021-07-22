const mongoose = require('mongoose');

// Create a new invoice
//  Add line items to the invoice. Line items may include hours of work at a certain rate, work-related expenses, materials, labor, etc.
//  Add notes to the invoice, including possibly how to pay it, where to send checks, etc.
//  Ability to update the status of the invoice
//  Send the invoice via email
//  View invoices including status (paid, outstanding, late, etc.)
// Extra credit features
//  Add a due date to an invoice
//  View late invoices, or even better, alert when an invoice is late
//  Tests
//  API Documentation
//  Data Validation

const invoiceSchema = mongoose.Schema({
	client: {
		name: String,
		email: String
	},
	number: {
		type: Number
	},
	date: {
		type: Date,
		default: Date.now
	},
	status: {
		type: String,
		default: 'Outstanding',
		enum: ['Outstanding', 'Paid', 'Late', 'Partial']
	},
	total: {
		type: Number,
		default: 0
	},
	paid: {
		type: Number,
		default: 0
	},
	lineItems: [{
		quantity: {
			type: Number,
			default: 1
		},
		rate: {
			type: Number,
			default: 0
		},
		description: {
			type: String,
			default: ''
		},
		total: {
			type: Number,
			default: 0
		}
	}],
	notes: {
		type: String,
		default: ''
	}
});

mongoose.model('invoice', invoiceSchema);