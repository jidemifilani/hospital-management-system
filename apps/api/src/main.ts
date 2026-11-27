import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "verbose"],
    rawBody: true,
  });

  const config = app.get(ConfigService);

  // PORT first, because that is what a managed host injects — Render,
  // Railway, Fly and Heroku all pick the port and expect the process to bind
  // it. A service that ignores it binds 4000, the platform's health check
  // finds nothing listening, and the deploy is rolled back with no error that
  // says why.
  const port = Number(process.env.PORT) || config.get<number>("API_PORT", 4000);
  const corsOrigins = config.get<string>("CORS_ORIGINS", "http://localhost:3000").split(",");

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Global prefix + versioning
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // Request logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger (dev only)
  if (config.get("NODE_ENV") !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("CareSync HMS API")
      .setDescription("Hospital Management System REST API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  const logger = new Logger("Bootstrap");
  await app.listen(port);
  logger.log(`CareSync HMS API running on http://localhost:${port}/api/v1`);
  if (config.get("NODE_ENV") !== "production") {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
