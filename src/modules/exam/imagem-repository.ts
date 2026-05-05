import type { Imagem } from './imagem';

export type FindImagensInput = {
  examId: string;
};

export type ImagemRepository = {
  findMany(input: FindImagensInput): Promise<Imagem[]>;
  createMany(imagens: Imagem[]): Promise<Imagem[]>;
};
