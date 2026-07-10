require("dotenv").config();
const app = require("./server");
const { startPolling } = require("./bot");

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API server started on port ${port}`));
startPolling();
