const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    auth0_id_token: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    accountNumber: {
        type: Number,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        required: true
    },
    transactions: {
        type: Array,
        default: []
    }
});

module.exports = mongoose.model('User', userSchema); 