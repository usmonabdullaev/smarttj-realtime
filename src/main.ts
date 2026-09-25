import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const PORT = process.env.PORT ?? 3000;
const HOST = '0.0.0.0';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Загружаем спецификацию AsyncAPI из файла asyncapi.json
  const asyncApiSpecPath = join(process.cwd(), 'asyncapi.json');
  const asyncApiSpec = JSON.parse(readFileSync(asyncApiSpecPath, 'utf-8'));

  const httpAdapter = app.getHttpAdapter();

  // 1. JSON endpoint для спецификации AsyncAPI
  httpAdapter.get('/docs/asyncapi.json', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(asyncApiSpec);
  });

  // Локальная раздача статики @asyncapi/react-component (не зависит от внешних CDN)
  const reactComponentDir = join(
    process.cwd(),
    'node_modules/@asyncapi/react-component',
  );

  httpAdapter.get('/docs/asyncapi-ui.js', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(join(reactComponentDir, 'browser/standalone/index.js'));
  });

  httpAdapter.get('/docs/asyncapi-ui.css', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.sendFile(join(reactComponentDir, 'styles/default.min.css'));
  });

  // 2. Интерактивный официальный UI AsyncAPI
  httpAdapter.get('/docs/asyncapi', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>SmartTJ Realtime AsyncAPI Docs</title>
          <link rel="icon" type="image/png" href="https://www.asyncapi.com/favicon-32x32.png">
          <link rel="stylesheet" href="/docs/asyncapi-ui.css">
          <style>
            html, body { margin: 0; padding: 0; min-height: 100vh; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            #asyncapi { min-height: 100vh; }
            .loading { padding: 40px; text-align: center; color: #475569; font-size: 18px; }
          </style>
        </head>
        <body>
          <div id="asyncapi">
            <div class="loading">Загрузка документации AsyncAPI...</div>
          </div>
          <script src="/docs/asyncapi-ui.js"></script>
          <script>
            window.addEventListener('load', function() {
              if (typeof AsyncApiStandalone !== 'undefined') {
                AsyncApiStandalone.render({
                  schema: ${JSON.stringify(asyncApiSpec)},
                  config: {
                    show: {
                      sidebar: true
                    }
                  }
                }, document.getElementById('asyncapi'));
              } else {
                document.getElementById('asyncapi').innerHTML = '<div style="color:red;padding:20px;text-align:center;">Не удалось инициализировать AsyncAPI UI.</div>';
              }
            });
          </script>
        </body>
      </html>
    `);
  });

  // 3. Редирект с /docs на /docs/asyncapi для удобства
  httpAdapter.get('/docs', (_req: any, res: any) => {
    res.redirect('/docs/asyncapi');
  });

  await app.listen(PORT, HOST);
}
await bootstrap();

