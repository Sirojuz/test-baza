const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongodb = require("./config/database");
const app = express();
const PORT = 3000;

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

mongodb();
app.listen(PORT, () => {
  console.log("Server is running", PORT);
});
