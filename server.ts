import express from "express";
import { createServer as createViteServer } from "vite";
import { Client, GatewayIntentBits } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- Discord Bot Setup ---
  const discordToken = process.env.DISCORD_BOT_TOKEN;
  
  if (discordToken) {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.MessageContent, // Privileged intent - requires manual enabling in Discord portal
      ],
    });

    client.on("ready", () => {
      console.log(`Discord Bot logged in as ${client.user?.tag}!`);
      console.log("Note: MessageContent intent is disabled by default. Enable it in the Discord Developer Portal to read message content.");
    });

    client.on("messageCreate", async (message) => {
      if (message.author.bot) return;

      // Without MessageContent intent, message.content will be empty unless the bot is mentioned
      const content = message.content.toLowerCase();
      if (content === "!ping" || message.mentions.has(client.user!)) {
        await message.reply("Pong from the Staff Manager Bot! 🏓");
      }
    });

    try {
      await client.login(discordToken);
    } catch (error) {
      console.error("Failed to login to Discord:", error);
    }
  } else {
    console.warn("DISCORD_BOT_TOKEN not found in environment. Discord bot will not start.");
  }

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", botActive: !!discordToken });
  });

  // Minecraft Plugin API
  app.use("/api/minecraft", (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== process.env.MINECRAFT_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });

  app.get("/api/minecraft/notes/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      // Find user by username
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("minecraftUsername", "==", username));
      const userSnap = await getDocs(userQuery);
      
      if (userSnap.empty) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const targetUid = userSnap.docs[0].id;
      
      // Get notes
      const notesRef = collection(db, "staff_notes");
      const notesQuery = query(notesRef, where("targetUid", "==", targetUid), orderBy("createdAt", "desc"));
      const notesSnap = await getDocs(notesQuery);
      
      const notes = notesSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          authorName: data.authorName,
          content: data.content,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        };
      });
      
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/minecraft/notes", express.json(), async (req, res) => {
    try {
      const { targetUsername, authorName, content } = req.body;
      
      if (!targetUsername || !authorName || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Find target user
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("minecraftUsername", "==", targetUsername));
      const userSnap = await getDocs(userQuery);
      
      if (userSnap.empty) {
        return res.status(404).json({ error: "Target user not found" });
      }
      
      const targetUid = userSnap.docs[0].id;

      // Add note
      const notesRef = collection(db, "staff_notes");
      await addDoc(notesRef, {
        targetUid,
        authorUid: "minecraft-plugin",
        authorName,
        content,
        createdAt: serverTimestamp()
      });
      
      res.json({ status: "success" });
    } catch (error) {
      console.error("Error adding note:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve Plugin Source Code
  app.get("/api/minecraft/source", async (req, res) => {
    try {
      const files = [
        "pom.xml",
        "src/main/resources/plugin.yml",
        "src/main/resources/config.yml",
        "src/main/java/store/snoozmnky/staffmanager/StaffManager.java",
        "src/main/java/store/snoozmnky/staffmanager/commands/StaffNotesCommand.java"
      ];
      
      let combinedSource = "// StaffManager Minecraft Plugin Source Code\n\n";
      
      for (const file of files) {
        const filePath = path.join(process.cwd(), "minecraft-plugin", file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");
          combinedSource += `// --- FILE: ${file} ---\n\n${content}\n\n`;
        }
      }
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", "attachment; filename=StaffManager-Source.txt");
      res.send(combinedSource);
    } catch (error) {
      console.error("Error serving plugin source:", error);
      res.status(500).send("Error serving source code.");
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
