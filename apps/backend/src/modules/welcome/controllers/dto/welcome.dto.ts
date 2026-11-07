export class WelcomeDto {
  message!: string;
  name!: string;
  description!: string;
  version!: string;
  healthCheck!: string;
  restApi!: string;
  // absent where the API docs are off (API_DOCS, N-9)
  swaggerDocs?: string;
  authEndpointsDocs?: string;
}
