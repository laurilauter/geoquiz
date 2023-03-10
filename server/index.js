import express from "express";
import session from "express-session";
import mongoose from "mongoose";

import userRouter from "./routes/userRoutes.js";
import sessionsRouter from "./routes/sessionsRoutes.js";
import gamePlanRouter from "./routes/gamePlanRoutes.js";
import gameRouter from "./routes/gameRoutes.js";

import MongoStore from "connect-mongo";
import cors from "cors";
import cookieParser from "cookie-parser";

import * as dotenv from "dotenv";
dotenv.config();
const port = process.env.PORT;
const secret = process.env.SESSION_SECRET;

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cookieParser());

//adjust client url for cors
let client_url = "http://localhost:5173";
if (process.env.NODE_ENV === "production") {
  client_url = "http://quizgame.eu-4.evennode.com/"; //for prod
}

console.log("process.env.NODE_ENV ", process.env.NODE_ENV);
console.log("client_url ", client_url);

const corsOptions = {
  origin: client_url,
  credentials: true,
};
app.use(cors(corsOptions));

mongoose.set("strictQuery", false);

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("Connected to MongoDB");
});

app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: false,
      secure: false,
      //maxAge: 10 * 60000, // 10 min
      maxAge: 7 * 24 * 3600 * 1000, //a week
      httpOnly: true,
    },
    rolling: true,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
    }),
  })
);

//Check if this works //should change cookie so it gets renewed
app.use(function (req, res, next) {
  req.session.nowInMinutes = Math.floor(Date.now() / 60e3);
  next();
});

app.set("trust proxy", 1); // trust first proxy in production

app.use("/user", userRouter);
app.use("/sessions", sessionsRouter);
app.use("/game-plan", gamePlanRouter);
app.use("/game", gameRouter);

//serving public files, img and such
app.use("/", express.static(path.join(__dirname, "../public")));
app.use("/", express.static(path.join(__dirname, "../dist")));

//serv static FE for all visitors
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// //serv static FE to JOIN the game //this FE page posts the users name to BE activeGame class
// app.get("/join", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/join.html"));
// });

app.listen(port, () => {
  console.log(`Server running at: http://localhost:${port}`);
});
