import mongoose from 'mongoose';
import bcrypt from 'bcrypt-nodejs';

// define the schema for our user model
const userSchema = mongoose.Schema({
    email        : String,
    username     : String,
    password     : String,
    information  : {
        fullname          : String,
        gender            : String,
        date_of_birth     : Date,
        place_of_birth    : String,
        first_language    : String,
        medical_condition : String,
    },
    records      : [{
        session_id        : {type: mongoose.Schema.Types.ObjectId, ref: 'Session'},
        path              : String,
        status            : String,
    }]
},
{ timestamps: true }
);

// methods ======================
// generating a hash
userSchema.methods.generateHash = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
// strange error when using this.password directly, instead passing second parameter userPassword as this.password
userSchema.methods.validPassword = (password, userPassword) => {
    return bcrypt.compareSync(password, userPassword);
};

// create the model for users and expose it to our app
// module.exports = mongoose.model('User', userSchema);

export default mongoose.model('User', userSchema);
