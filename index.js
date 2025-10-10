require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
const contact = require("./models/contact");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

// MongoDB connection
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client with service_role key
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get("/", (req, res) => {
    res.send("server is running");
});

// Setup multer for file upload
const upload = multer({ dest: "uploads/" });

//==============
// AUTH CRUD
//==============

// Signup
app.post("/signup", async (req, res) => {
    console.log("Signup request received:", req.body);
    const { email, password, firstName, lastName} = req.body;
    if (!email || !password) {
        console.log("Missing email or password");
        return res.status(400).json({ error: "Email and password required" });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true,
        user_metadata: {first_name: firstName,last_name: lastName}
    });

    console.log("Supabase createUser result:", { data, error });

    if (error) {
        console.log("Signup error:", error.message);
        return res.status(400).json({ error: error.message });
    }
    console.log("Signup successful for:", email);
    res.json({ user: data.user, message: "Signup successful" });
});

// Signin
app.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ user: data.user, session: data.session });
});


app.get("/profile", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error) return res.status(403).json({ error: error.message });

    res.json({ message: "Protected route", user });
});

//==============
// CONTACT CRUD
//==============

//Create Contact
app.post("/contact", async (req, res) => {
    try { 
        const {name, email, phone} = req.body;
        const newContact = new contact({name, email, phone})
        await newContact.save();
        res.status(201).json(newContact);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//Get Single Contact
app.get("/contact/:name", async (req, res) => {
    try {
        const findContact = await contact.findOne({ name: req.params.name });
        if (!findContact) return res.status(404).json({ error: "Contact not found" });
        res.json(findContact);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Update Contact
app.put("/contact/:name", async (req, res) => {
    try {
        const updateContact = await contact.findOneAndUpdate({ name: req.params.name }, 
            req.body,
            { new: true, runValidators: true });
        if (!updateContact) return res.status(404).json({ error: "Contact not found" });
        res.json(updateContact);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//Delete Contact
app.delete("/contact/:name", async (req, res) => {
    try {
        const delContact = await contact.findOneAndDelete({ name: req.params.name });
        if (!delContact) return res.status(404).json({ error: "Contact not found" });
        res.json({ message: `Contact '${req.params.name}' deleted successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//CSV file processing
app.post("/upload-csv", upload.single("file"), async (req, res) => {
    try {
        const results = [];

        fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            try {
                //inserting all contacts into mongodb
                await contact.insertMany(results);
                //delete file after extracting data
                fs.unlinkSync(req.file.path);
                res.json({ message: "Contacts uploaded successfully!", count: results.length });
            } catch (err) {
            res.status(500).json({ error: err.message });
            }
        });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});




const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});