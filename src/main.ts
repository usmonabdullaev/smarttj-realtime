import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const PORT = process.env.PORT ?? 3000;
const HOST = '0.0.0.0';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(PORT, HOST);
}
await bootstrap();
