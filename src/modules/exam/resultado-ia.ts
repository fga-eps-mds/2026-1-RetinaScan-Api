export type Probabilities = Record<string, number>;

export type ResultadoIa = {
  id: string;
  idImagem: string;
  predictedClass: number;
  predictedLabel: string;
  confidence: number;
  probabilities: Probabilities;
};
