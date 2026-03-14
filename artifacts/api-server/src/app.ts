import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const webBuildDir =
    process.env.WEB_BUILD_DIR ??
    path.join(process.cwd(), "artifacts", "mobile", "dist-web");

  app.use(express.static(webBuildDir));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(webBuildDir, "index.html"));
  });
}

export default app;
