export type Imagem = {
  id: string;
  idExame: string;
  lateralidadeOlho: LateralidadeOlho;
  caminhoImg: string;
  qualidadeImg: string;
};

export const LateralidadeOlho = {
  OD: 'OD',
  OE: 'OE',
} as const;

export const QualidadeImagem = {
  Pendente: 'Pendente',
} as const;

export type LateralidadeOlho = keyof typeof LateralidadeOlho;
export type QualidadeImagem = keyof typeof QualidadeImagem;
