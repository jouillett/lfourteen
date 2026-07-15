const email = "jouillet@hanmail.net";
const password = "daffodil65**";

async function setup() {
    const res = await fetch("https://api.cron-job.org/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    const text = await res.text();
    console.log("Login response:", text);
}
setup();
