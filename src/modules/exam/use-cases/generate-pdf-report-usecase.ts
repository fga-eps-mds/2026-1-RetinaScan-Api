import type {
  GetExamDetailsUseCase,
  GetExamDetailsUseCaseInput,
  GetExamDetailsUseCaseOutput,
} from './get-exam-details-usecase';
import type { PdfService } from '@/shared/services/pdf-service';

export class GeneratePdfReportUseCase {
  constructor(
    private readonly getExamDetailsUseCase: GetExamDetailsUseCase,
    private readonly pdfService: PdfService,
  ) {}

  async execute(input: GetExamDetailsUseCaseInput): Promise<Buffer> {
    const examDetails = await this.getExamDetailsUseCase.execute(input);

    const htmlString = this.buildHtmlReport(examDetails);

    const pdfBuffer = await this.pdfService.generateFromHtml(htmlString);

    return pdfBuffer;
  }

  private formatCpf(cpf?: string): string {
    if (!cpf) return 'Não informado';
    
    const cleaned = String(cpf).replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf; 
    
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  private formatDate(date?: string | Date): string {
    if (!date) return 'Não informado';
    
    const d = new Date(date);
    
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  private buildHtmlReport(data: GetExamDetailsUseCaseOutput): string {
    const pacienteNome = data.nomeCompleto || 'Não informado';
    const pacienteCpf = this.formatCpf(data.cpf);
    const pacienteNasc = this.formatDate(data.dtNascimento);
    const dataHora = new Date(data.dtHora).toLocaleString('pt-BR');
    const laudoTexto = data.laudoEspecialista?.texto || 'Laudo estruturado ainda não preenchido.';
    const prontuarioTexto = data.descricao || 'Nenhuma nota médica registrada.';
    const medicoNome = data.medico.nomeCompleto;

    const imagensHtml =
      data.imagens.length > 0
        ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          ${data.imagens
            .map(
              (img) => `
            <div style="page-break-inside: avoid;">
              <p style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">Olho: ${img.lateralidadeOlho === 'OD' ? 'Direito' : 'Esquerdo'}</p>
              <img src="${img.url}" style="width: 100%; height: auto; border: 1px solid #ccc; border-radius: 4px;" />
              ${
                img.resultadoIa
                  ? `
                <p style="font-size: 10px; color: #555; margin-top: 5px;">IA: ${img.resultadoIa.predictedLabel} (${(img.resultadoIa.confidence * 100).toFixed(1)}% de conf.)</p>`
                  : 'Resultado Indisponível'
              }
            </div>
          `,
            )
            .join('')}
        </div>
      `
        : '<p>Nenhuma imagem disponível.</p>';

    const comorbidadesHtml = data.comorbidades
      ? `<ul>${
          [
            data.comorbidades.diabetes
              ? `<li>Diabetes${data.comorbidades.diabetesControlado ? ' (Controlado)' : ''}</li>`
              : '',
            data.comorbidades.hipertensao
              ? `<li>Hipertensão${data.comorbidades.hipertensaoControlada ? ' (Controlada)' : ''}</li>`
              : '',
            data.comorbidades.altaMiopia ? '<li>Alta Miopia</li>' : '',
            data.comorbidades.catarata ? '<li>Catarata</li>' : '',
            data.comorbidades.glaucoma ? '<li>Glaucoma</li>' : '',
            data.comorbidades.usoHidroxicloroquina ? '<li>Uso de Hidroxicloroquina</li>' : '',
          ]
            .filter(Boolean)
            .join('') || '<li>Nenhuma comorbidade reportada.</li>'
        }</ul>`
      : '<p>Informações não disponíveis.</p>';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 13px; color: #000; line-height: 1.4; margin: 40px; }
          h1 { font-size: 22px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; }
          h2 { font-size: 14px; margin-top: 25px; margin-bottom: 10px; color: #000; border-bottom: 1px solid #ccc; text-transform: uppercase; }
          table { width: 100%; margin-bottom: 20px; border-spacing: 0; }
          td { padding: 4px 8px; vertical-align: top; }
          .label { font-weight: bold; width: 150px; }
        </style>
      </head>
      <body>
        <h1>Laudo de Exame - RetinaScan</h1>
        
        <h2>Dados do Paciente</h2>
        <table>
          <tr><td class="label">Nome:</td><td>${pacienteNome}</td></tr>
          <tr><td class="label">CPF:</td><td>${pacienteCpf}</td></tr>
          <tr><td class="label">Data de Nasc.:</td><td>${pacienteNasc}</td></tr>
        </table>

        <h2>Imagens do Exame</h2>
        ${imagensHtml}

        <h2>Detalhes do Exame</h2>
        <table>
          <tr><td class="label">ID Exame:</td><td>${data.id}</td></tr>
          <tr><td class="label">Data/Hora:</td><td>${dataHora}</td></tr>
          <tr><td class="label">Olho:</td><td>${data.olho || 'Não especificado'}</td></tr>
          <tr><td class="label">Status:</td><td>${data.status}</td></tr>
          <tr><td class="label">Médico:</td><td>${medicoNome}</td></tr>
        </table>

        <h2>Comorbidades</h2>
        ${comorbidadesHtml}

        <h2>Prontuário Médico</h2>
        <p>${prontuarioTexto}</p>

        <h2>Laudo do Especialista</h2>
        <p>${laudoTexto}</p>
      </body>
      </html>
    `;
  }
}