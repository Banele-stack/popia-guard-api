import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a real secret.');
  }

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: [process.env.FRONTEND_URL ?? 'http://localhost:4010'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Lets the platform send SIGTERM on a redeploy and have in-flight requests
  // + the DB connection close cleanly, instead of the process being hard-killed.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 4011);
}
bootstrap();
