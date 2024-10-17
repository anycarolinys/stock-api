import prismaClient from "../../prisma/index";
import { SaleProductRequest } from "../../models/interfaces/product/SaleProductRequest";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: "us-east-1" }); // Substitua pela sua região

async function publishToSNSTopic(topicArn : string, message : string, subject : string) {
  const params = {
    TopicArn: topicArn,
    Message: message, // Mensagem a ser enviada
    Subject: subject, // Assunto (para e-mails)
  };

  try {
    const data = await snsClient.send(new PublishCommand(params));
    console.log(`Mensagem enviada! ID da mensagem: ${data.MessageId}`);
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
  }
}


class SaleProductService {
  async execute({ user_id, name, cpf, email, quantity, product_id }: SaleProductRequest) {
    if (!product_id || !quantity || !user_id || !name || !cpf || !email) {
      throw new Error("Dados de entrada não foram passados corretamente!");
    }

    const queryUser = await prismaClient.user.findFirst({
      where: {
        id: user_id,
      },
    });

    if (!queryUser) {
      throw new Error("Usuário não encontrado!");
    }

    const queryProduct = await prismaClient.product.findFirst({
      where: {
        id: product_id,
      },
    });

    if (queryProduct?.amount >= quantity && quantity > 0) {
      const newAmount = queryProduct?.amount - quantity;
      const saveSale = await prismaClient.product.update({
        where: {
          id: product_id,
        },
        data: {
          amount: newAmount,
        },
      });

      const totalPrice = (Number(queryProduct.price) * quantity).toFixed(2);

      // Cria o registro na tabela de vendas
      const sale = await prismaClient.sale.create({
        data: {
          name,
          cpf,
          email,
          quantity,
          total_price  : totalPrice,
          product_id, // Relaciona a venda com o produto vendido
          user_id,    // Relaciona a venda com o usuário que efetuou a venda
        },
      });

      const topicArn = queryUser.topico;
      await publishToSNSTopic(
        topicArn, 
        `Venda efetuada com sucesso! \nCLIENTE: ${name}\nCPF: ${cpf}\nEMAIL: ${email}\nProduto: ${queryProduct.name}\nQuantidade: ${quantity}\nPreço total: R$ ${totalPrice}\nVendedor: ${queryUser.name}`, 
        `Notificação de Venda ID: ${sale.id}` // Agora, a interpolação está correta
      );

      return sale;
    } else {
      throw new Error("Não foi possível efetuar a venda!");
    }
  }
}

export { SaleProductService };
