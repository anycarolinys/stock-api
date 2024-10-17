import prismaClient from "../../prisma";
import { hash } from "bcryptjs";
import { CreateUserRequest } from "../../models/interfaces/user/CreateUserRequest";
import { SNSClient, CreateTopicCommand, SubscribeCommand } from "@aws-sdk/client-sns";

// Criação do cliente SNS
const snsClient = new SNSClient({ region: "us-east-1" }); // Substitua pela sua região

// Função para criar um nome de tópico válido a partir do email
function createValidTopicName(email: string): string {
    // Substituir caracteres inválidos e limitar o comprimento do nome
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 256);
    return sanitizedEmail;
}

// Função para criar um novo tópico SNS e associar um email a ele
async function createSNSTopicForEmail(email: string): Promise<string> {
  // Criando um nome de tópico a partir do email
  const topicName = createValidTopicName(email);
  
  // Parâmetros para criar o tópico
  const createTopicParams = { Name: topicName };
  
  try {
    // Criando o tópico SNS
    const createTopicResponse = await snsClient.send(new CreateTopicCommand(createTopicParams));
    const topicArn = createTopicResponse.TopicArn!;
    
    // Inscrevendo o email ao tópico
    const subscribeParams = {
      TopicArn: topicArn,
      Protocol: 'email',
      Endpoint: email,  // Email que receberá as notificações
    };
    
    await snsClient.send(new SubscribeCommand(subscribeParams));
    
    return topicArn;
  } catch (err) {
    console.error("Erro ao criar o tópico ou inscrever o email:", err);
    throw err;
  }
}

class CreateUserService {
  async execute({ name, email, password }: CreateUserRequest) {
    if (!email) {
      throw new Error("Email incorrect");
    }

    const userAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email: email,
      },
    });

    if (userAlreadyExists) {
      throw new Error("Email already exists");
    }

    const topico = await createSNSTopicForEmail(email);

    // Encriptando a nossa senha do usuário
    const passwordHash = await hash(password, 8);

    // Criando nosso usuário
    const user = prismaClient.user.create({
      data: {
        name: name,
        email: email,
        topico: topico,
        password: passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return user;
  }
}

export { CreateUserService };
