import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import type { GeneratePdfReportUseCase } from '@/modules/exam/use-cases/generate-pdf-report-usecase';

export async function generatePdfReport(
  request: FastifyRequest<{ Params: { examId: string } }>,
  reply: FastifyReply,
) {
  const { examId } = request.params;
  const user = request.user;

  // Impede a geração de relatórios para requisições sem usuário autenticado.
  if (!user) {
    return reply.status(401).send({ message: 'Usuário não autenticado.' });
  }

  try {
    // Resolve o caso de uso responsável pela geração do relatório em PDF.
    const generatePdfReportUseCase: GeneratePdfReportUseCase = container.resolve(
      'generatePdfReportUseCase',
    );

    const pdfBuffer = await generatePdfReportUseCase.execute({
      examId,
      requester: { id: user.id, tipoPerfil: user.tipoPerfil },
    });

    // Retorna o arquivo PDF como resposta para download.
    return reply
      .status(200)
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="relatorio-exame-${examId}.pdf"`)
      .send(pdfBuffer);
  } catch (error) {
    request.log.error(error, `Erro ao gerar PDF para o exame ${examId}`);
    return reply.status(500).send({ message: 'Erro interno ao gerar o documento PDF.' });
  }
}
