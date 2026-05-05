import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();
const PORT = process.env.PORT || 5005;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`ServiceCoordinationService running on port ${PORT}`));
});
