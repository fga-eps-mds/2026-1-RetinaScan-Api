import { type StorageService, Buckets } from '@/shared/services';
import type { UsuariosRepository } from '@/modules/users/repositories';
import { NotFoundError } from '@/shared/errors';

export interface UpdateUserImageInput {
  idUsuario: string;
  imageBuffer: Buffer;
  contentType: string;
}

export interface UpdateUserImageOutput {
  url: string;
}

export class UpdateUserImageUsecase {
  constructor(
    private readonly userRepository: UsuariosRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(input: UpdateUserImageInput): Promise<UpdateUserImageOutput> {
    const { idUsuario, imageBuffer, contentType } = input;

    const user = await this.getUser(idUsuario);

    const url = await this.storageService.upload(
      {
        key: `${idUsuario}-${Date.now()}`,
        buffer: imageBuffer,
        contentType,
      },
      Buckets.userImages,
    );

    await this.userRepository.update(user.id, { image: url });

    return { url };
  }

  private async getUser(id: string) {
    const user = await this.userRepository.findBy({ id });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return user;
  }
}
