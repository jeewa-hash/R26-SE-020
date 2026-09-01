import mongoose from "mongoose";

// Sessions are written by the Python diagnosis services, so retain their
// flexible document shape and expose them read-only through Seeker Service.
const serviceSessionSchema = new mongoose.Schema({}, {
  strict: false,
  collection: "service_sessions",
  versionKey: false,
});

export default mongoose.model("ServiceSession", serviceSessionSchema);
