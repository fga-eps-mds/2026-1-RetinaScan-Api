import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';
import { db } from '@/infra/database/drizzle/connection';
import { exam, imagem } from '@/infra/database/drizzle/schema';
import { LateralidadeOlho, QualidadeImagem, type Imagem } from '@/modules/exam/imagem';
import { ExameBuilder } from './exame-builder';

export class ImagemBuilder {
  private readonly data: Imagem;
  private readonly database: typeof db;

  private constructor() {
    this.database = db;
    const id = faker.string.uuid();
    const idExame = faker.string.uuid();
    this.data = {
      id: faker.string.uuid(),
      idExame: faker.string.uuid(),
      lateralidadeOlho: LateralidadeOlho.OD,
      caminhoImg: `exams/${idExame}/${LateralidadeOlho.OD}-${id}.jpg`,
      qualidadeImg: QualidadeImagem.Pendente,
    };
  }

  public withId(id: string): this {
    this.data.id = id;
    return this;
  }

  public withIdExame(idExame: string): this {
    this.data.idExame = idExame;
    return this;
  }

  public withLateralidadeOlho(lateralidadeOlho: LateralidadeOlho): this {
    this.data.lateralidadeOlho = lateralidadeOlho;
    return this;
  }

  public withCaminhoImg(caminhoImg: string): this {
    this.data.caminhoImg = caminhoImg;
    return this;
  }

  public withQualidadeImg(qualidadeImg: string): this {
    this.data.qualidadeImg = qualidadeImg;
    return this;
  }

  public static anImagem(): ImagemBuilder {
    return new ImagemBuilder();
  }

  public async build(): Promise<Imagem> {
    await this.ensureExame();

    await this.database.insert(imagem).values({
      idImagem: this.data.id,
      idExame: this.data.idExame,
      lateralidadeOlho: this.data.lateralidadeOlho,
      caminhoImg: this.data.caminhoImg,
      qualidadeImg: this.data.qualidadeImg,
    });

    return this.data;
  }

  private async ensureExame(): Promise<void> {
    const existing = await this.database
      .select({ id: exam.idExame })
      .from(exam)
      .where(eq(exam.idExame, this.data.idExame))
      .limit(1);

    if (existing.length) return;

    const created = await ExameBuilder.anExame().build();
    this.data.idExame = created.id;
  }

  public getData() {
    return this.data;
  }
}
