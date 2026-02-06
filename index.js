const express = require("express");
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongodb = require("./config/database");
const path = require("path");
const createSuperAdmin = require("./start/superAdmin");

const app = express();
const PORT = 3100;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(require("./router/test"));
app.use(require("./router/testOne"));
app.use(require("./router/result"));
app.use(require("./router/attempt"));
app.use(require("./router/user"));
app.use(require("./router/admin"));
app.use(require("./router/testWord"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

async function bootstrap() {
  await mongodb();
  await createSuperAdmin();

  app.listen(PORT, () => {
    console.log("Server is running", PORT);
  });
}

bootstrap().catch((e) => {
  console.error("BOOTSTRAP ERROR:", e.message);
  process.exit(1);
});
