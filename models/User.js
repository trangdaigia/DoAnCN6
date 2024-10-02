const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    isAdmin:{
        type: Boolean,
        default: false, 
    },
    mylist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Movie'
    }]
})

userSchema.plugin(passportLocalMongoose);
const User = mongoose.model('user', userSchema);

module.exports = User;  