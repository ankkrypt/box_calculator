const mongoose = require("mongoose");
const dns = require("node:dns");
const config = require("./env");

/* Atlas SRV lookups fail on some Windows/ISP resolvers (c-ares gets
   ECONNREFUSED). Pinning public resolvers fixes it for every process that
   connects — server, seeders, one-off scripts. */
dns.setServers(["8.8.8.8", "1.1.1.1"]);

/* Single Mongo connection. Mongoose buffers queries until connected. */
async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri);
  console.log(`[db] Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
