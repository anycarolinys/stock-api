import { Request, Response } from "express";
import { SaleProductRequest } from "../../models/interfaces/product/SaleProductRequest";
import { SaleProductService } from "../../services/product/SaleProductService";

class SaleProductController {
  async handle(request: Request, response: Response) {
    const { user_id, product_id, quantity, name, cpf, email }: SaleProductRequest = request.body;
    const saleProductService = new SaleProductService();

    const saleProduct = await saleProductService.execute({
      product_id,
      quantity,
      user_id,
      cpf,
      email,
      name
    });
    return response.json(saleProduct);
  }
}

export { SaleProductController };
