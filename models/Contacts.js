import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    userID: {type: String, required: true},
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    email: {type: String},
    phone: {type: String},
}, {timestamps: true});

export default mongoose.model("Contacts", contactSchema);