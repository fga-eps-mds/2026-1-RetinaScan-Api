import type { IAuthService } from '@/application/ports/services';
import type { IUsersRepository } from '@/application/ports/repositories';
import { BetterAuthService } from '@/infra/services/better-auth-service';
import { DrizzleUsersRepository } from '@/infra/database/repositories';
import { EnsureAdminExistsUseCase } from '@/application/use-cases';
import { asClass, createContainer, InjectionMode } from 'awilix';

export interface AppContainer {
  usersRepository: IUsersRepository;
  authService: IAuthService;
  ensureAdminExistsUseCase: EnsureAdminExistsUseCase;
}

export const container = createContainer<AppContainer>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

const repositories = {
  usersRepository: asClass(DrizzleUsersRepository).singleton(),
};

const services = {
  authService: asClass(BetterAuthService).singleton(),
};

const useCases = {
  ensureAdminExistsUseCase: asClass(EnsureAdminExistsUseCase).singleton(),
};

container.register({
  ...repositories,
  ...services,
  ...useCases,
});
