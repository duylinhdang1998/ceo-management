import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import * as express from "express";
import * as dotenv from "dotenv";
import { AppModule } from "./app.module";

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Raise JSON and URL-encoded body limits to support large htmlContent payloads (up to 70 MB HTML strings in JSON).
  // Multer handles multipart uploads separately and is not affected by these limits.
  app.use(express.json({ limit: "75mb" }));
  app.use(express.urlencoded({ limit: "75mb", extended: true }));

  // Security headers
  app.use(helmet());

  // CORS — allow configured origins
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? "http://localhost:5173"
  ).split(",");
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Global validation pipe — strips unknown fields, throws on invalid DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[API] Listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error("[API] Bootstrap failed:", err);
  process.exit(1);
});
