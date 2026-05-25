import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';

import { db } from '@/infra/database/drizzle/connection';
import { imagem, resultadoIa } from '@/infra/database/drizzle/schema';
import type { Probabilities, ResultadoIa } from '@/modules/exam/resultado-ia';

import { ImagemBuilder } from './imagem-builder';

export class ResultadoIaBuilder {
  private readonly data: ResultadoIa;
  private readonly database: typeof db;

  private constructor() {
    this.database = db;

    const predictedClass = faker.helpers.arrayElement([0, 1]);
    const predictedLabel = predictedClass === 0 ? 'normal' : 'abnormal';
    const confidence = faker.number.float({ min: 0.5, max: 1, fractionDigits: 4 });
    const probabilities: Probabilities =
      predictedClass === 0 ? { normal: 0.9, abnormal: 0.1 } : { normal: 0.1, abnormal: 0.9 };

    this.data = {
      id: faker.string.uuid(),
      idImagem: faker.string.uuid(),
      predictedClass,
      predictedLabel,
      confidence,
      probabilities,
    };
  }

  public static aResultadoIa(): ResultadoIaBuilder {
    return new ResultadoIaBuilder();
  }

  public withId(id: string): this {
    this.data.id = id;
    return this;
  }

  public withIdImagem(idImagem: string): this {
    this.data.idImagem = idImagem;
    return this;
  }

  public withPredictedClass(predictedClass: number): this {
    this.data.predictedClass = predictedClass;
    return this;
  }

  public withPredictedLabel(predictedLabel: string): this {
    this.data.predictedLabel = predictedLabel;
    return this;
  }

  public withConfidence(confidence: number): this {
    this.data.confidence = confidence;
    return this;
  }

  public withProbabilities(probabilities: Probabilities): this {
    this.data.probabilities = probabilities;
    return this;
  }

  public async build(): Promise<ResultadoIa> {
    await this.ensureImagem();

    await this.database.insert(resultadoIa).values({
      idResultadoIa: this.data.id,
      idImagem: this.data.idImagem,
      predictedClass: this.data.predictedClass,
      predictedLabel: this.data.predictedLabel,
      confidence: this.data.confidence,
      probabilities: this.data.probabilities,
    });

    return this.data;
  }

  public getData(): ResultadoIa {
    return this.data;
  }

  private async ensureImagem(): Promise<void> {
    const existing = await this.database
      .select({ id: imagem.idImagem })
      .from(imagem)
      .where(eq(imagem.idImagem, this.data.idImagem))
      .limit(1);

    if (existing.length) return;

    const created = await ImagemBuilder.anImagem().build();
    this.data.idImagem = created.id;
  }
}
