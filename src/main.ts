import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
