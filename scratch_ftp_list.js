const ftp = require("basic-ftp");

async function listDir() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: "capofcom.cafe24.com",
            user: "capofcom",
            password: "rs686749**",
            secure: false
        });
        console.log("Listing absolute root (/):");
        const list = await client.list("/");
        for (const item of list) {
            console.log(item.type === 2 ? "[DIR] " + item.name : "[FILE] " + item.name);
        }
    } catch(err) {
        console.log("Error:", err);
    }
    client.close();
}

listDir();
