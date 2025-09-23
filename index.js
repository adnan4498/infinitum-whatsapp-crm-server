require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
const Contacts = require("./models/Contacts");

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

// --- CRUD ---

//Create Contact
app.post("/contacts", async (req, res) => {
    try { 
        const {userID, name, email, phone} = req.body;
        const contact = new Contacts({userID, name, email, phone})
        await contact.save();
        res.status(201).json(contact);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//Get All Contacts for a User
app.get("/contacts/:userId", async (req, res) => {
    try {
        const contacts = await Contacts.find({ userId: req.params.userId });
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Get Single Contact
app.get("/contact/:id", async (req, res) => {
    try {
        const contact = await Contacts.findById(req.params.id);
        if (!contact) return res.status(404).json({ error: "Contact not found" });
        res.json(contact);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Update Contact
app.put("/contact/:id", async (req, res) => {
    try {
        const contact = await Contacts.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!contact) return res.status(404).json({ error: "Contact not found" });
        res.json(contact);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//Delete Contact
app.delete("/contact/:id", async (req, res) => {
    try {
        const contact = await Contacts.findByIdAndDelete(req.params.id);
        if (!contact) return res.status(404).json({ error: "Contact not found" });
        res.json({ message: "Contact deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});