
require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
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
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true});
    
    if (error) return res.status(400).json({ error: error.message });
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


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});