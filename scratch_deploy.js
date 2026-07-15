const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        await client.access({
            host: "capofcom.cafe24.com",
            user: "capofcom",
            password: "rs686749**",
            secure: false
        });
        
        console.log("Connected to FTP.");
        
        // Next.js standalone root directory
        const standaloneDir = path.join(__dirname, ".next", "standalone");
        const staticDir = path.join(__dirname, ".next", "static");
        const publicDir = path.join(__dirname, "public");

        // 1. Upload standalone files to root
        console.log("Uploading standalone files to root...");
        await client.uploadFromDir(standaloneDir, "/");
        
        // 2. Ensure .next/static exists remotely and upload
        console.log("Uploading static assets...");
        await client.ensureDir("/.next/static");
        await client.uploadFromDir(staticDir, "/.next/static");
        
        // 3. Ensure public exists remotely and upload
        console.log("Uploading public assets...");
        await client.cd("/");
        await client.ensureDir("/public");
        await client.uploadFromDir(publicDir, "/public");

        console.log("Deploy completed successfully!");

    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}

deploy();
