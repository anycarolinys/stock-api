import { Request } from "express";

declare module "express" {
  export interface Request {
    token?: string; // Adicionando a propriedade 'token'
  }
}