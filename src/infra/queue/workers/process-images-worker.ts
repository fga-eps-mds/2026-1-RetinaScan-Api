import { type Job } from 'bullmq';
import { env } from '@/env';
import { createHttpClient } from '@/infra/http';
import logger from '@/infra/logger';

export interface ProcessImagesJobData {
  examId: string;
  leftImageKey?: string;
  rightImageKey?: string;
}

interface _AnalyzeResponse {
  message: string;
  exam_id: string;
  task_id: string;
  status: string;
}

const _httpClient = createHttpClient({ baseURL: env.AI_SERVICE_URL });

export async function processImagesWorker(job: Job): Promise<void> {
  const data = job.data as ProcessImagesJobData;
  logger.info('Executing process images worker', { jobId: job.id, data });

  // TODO: Remover os comentários da implementação quando tivermos a API de análise de exames pronta
  return await Promise.resolve();

  // try {
  //   const { data: response } = await httpClient.post<AnalyzeResponse>('/api/exams/analyze', {
  //     exam_id: data.examId,
  //     left_image_key: data.leftImageKey,
  //     right_image_key: data.rightImageKey,
  //   });

  //   logger.info('AI workflow triggered', {
  //     examId: data.examId,
  //     taskId: response.task_id,
  //     status: response.status,
  //   });
  // } catch (error) {
  //   logger.error('Error executing process images worker', { jobId: job.id, data, error });

  //   if (axios.isAxiosError(error)) {
  //     const status = error.response?.status;
  //     if (status && status < 500) {
  //       throw new UnrecoverableError(`AI service returned ${status} for exam ${data.examId}`);
  //     }
  //   }

  //   throw error;
  // }
}
