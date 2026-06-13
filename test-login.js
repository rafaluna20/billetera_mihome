const fetch = require('node-fetch');

async function testLogin() {
  try {
    const res = await fetch("https://rel-odoo.ci5uw7.easypanel.host/api/wallet/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        params: {
          username: "admin",
          password: "cb93da363c7dd9d9183478c8d30ec711f3e0ed12",
          db: "rel"
        }
      })
    });
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

testLogin();
