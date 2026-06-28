import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverless from 'serverless-http';
import express from 'express';
import type { Handler } from 'serverless-http';
import { AppModule } from '../src/app.module';

let cachedHandler: Handler | undefined;

function getAllowedOrigins() {
  const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  return [
    ...configuredOrigins,
    'https://familia-maestre.vercel.app',
    'http://localhost:3000',
    'http://localhost:3002',
  ];
}

async function bootstrap() {
  if (cachedHandler) return cachedHandler;

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn', 'log'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true,
  });

  await app.init();
  cachedHandler = serverless(expressApp);
  return cachedHandler;
}

export default async function handler(event: any, context: any) {
  const server = await bootstrap();
  return server(event, context);
}
