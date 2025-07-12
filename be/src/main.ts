import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from parent directory
config({ path: join(__dirname, '../../.env.local') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Enable CORS for frontend communication
  app.enableCors({
    origin: isDevelopment ? `http://localhost:${process.env.PORT}` : process.env.DOMAIN,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  const bePort = process.env.BE_PORT;
  await app.listen(bePort);
  console.log(`Application is running on: http://localhost:${bePort}`);
}
bootstrap();
