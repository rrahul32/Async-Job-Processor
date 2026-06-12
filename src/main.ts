import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { VALIDATION_PIPE_OPTIONS } from './common/validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Validate every request body at the boundary: strip/reject unknown fields
  // and transform JSON into validated DTO instances. See VALIDATION_PIPE_OPTIONS.
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  // Listen for SIGINT/SIGTERM so providers' onModuleDestroy hooks run on
  // shutdown — e.g. PrismaService.$disconnect() releases DB connections
  // cleanly instead of leaking them. Foundation for graceful shutdown (task 12).
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Distributed Workflow Orchestration API')
    .setDescription(
      'API for submitting and monitoring asynchronous e-commerce workflows.',
    )
    .setVersion('1.0')
    .addTag('system')
    .addTag('orders')
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'Workflow Orchestration API Docs',
  });

  await app.listen(port);
}

void bootstrap();
