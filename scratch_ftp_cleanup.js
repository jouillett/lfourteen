const ftp = require("basic-ftp");

async function cleanup() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    
    try {
        await client.access({
            host: "capofcom.cafe24.com",
            user: "capofcom",
            password: "rs686749**",
            secure: false
        });
        
        console.log("Connected to FTP. Removing mistaken files...");

        // Remove node_modules
        try { await client.removeDir("node_modules"); } catch(e) {}
        
        // Remove .next
        try { await client.removeDir(".next"); } catch(e) {}
        
        // Remove public
        try { await client.removeDir("public"); } catch(e) {}

        // Remove files
        try { await client.remove("server.js"); } catch(e) {}
        try { await client.remove("package.json"); } catch(e) {}

        console.log("Cleanup completed.");

    } catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}

cleanup();
