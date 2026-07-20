declare module 'serverless-http' {
  import { Application } from 'express';
  function serverless(app: Application): (event: any, context: any) => Promise<any>;
  export default serverless;
}
