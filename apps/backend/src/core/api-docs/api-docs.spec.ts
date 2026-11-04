import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createApiDocument } from './api-docs';

@Controller('events')
class EventsStubController {
  @Get()
  list(): string[] {
    return [];
  }
}

describe('createApiDocument', () => {
  it('„Try it out“ calls /api/events, not /api/api/events (#229)', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EventsStubController],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');

    const document = createApiDocument(app, {
      name: 'HobbyHub',
      description: '',
      version: '0.1.0',
    });
    // Swagger UI calls <server url><path>; no server = the page's own origin
    const servers = (document.servers ?? []).map((server) => server.url);

    expect(Object.keys(document.paths)).toEqual(['/api/events']);
    expect(servers.filter((url) => url !== '/')).toEqual([]);
    await app.close();
  });
});
