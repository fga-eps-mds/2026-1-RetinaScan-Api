// Constrói um DICOM Part-10 mínimo, Explicit VR Little Endian.
// Gera um buffer in-memory para que testes não precisem de um .dcm binário commitado.

interface DicomFixtureInput {
  patientName?: string;
  patientSex?: string;
  patientBirthDate?: string; // YYYYMMDD
  laterality?: string; // 'R' | 'L'
  studyDescription?: string;
  studyDate?: string; // YYYYMMDD (0008,0020)
  rows?: number;
  columns?: number;
  samplesPerPixel?: number; // 0028,0002 (default 3)
  photometricInterpretation?: string; // 0028,0004 (default 'RGB')
  planarConfiguration?: number; // 0028,0006 (default 0)
  bitsAllocated?: number; // 0028,0100 (default 8)
  // Quando true, NÃO aloca/escreve o PixelData real (apenas um placeholder
  // mínimo). Use para testar guards de dimensão sem alocar memória absurda.
  skipPixelData?: boolean;
}

const EXPLICIT_VR_LE = '1.2.840.10008.1.2.1';

// VRs cujo header usa length de 16 bits (8 bytes total).
// Os demais (OB, OW, OF, SQ, UT, UN) usam o header longo de 12 bytes.
const SHORT_VRS = new Set([
  'AE', 'AS', 'AT', 'CS', 'DA', 'DS', 'DT', 'FL', 'FD', 'IS', 'LO', 'LT',
  'PN', 'SH', 'SL', 'SS', 'ST', 'TM', 'UI', 'UL', 'US',
]);

function padBuffer(data: Buffer, padByte = 0x00): Buffer {
  if (data.length % 2 === 0) return data;
  return Buffer.concat([data, Buffer.from([padByte])]);
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

function element(group: number, elem: number, vr: string, data: Buffer): Buffer {
  const head = Buffer.alloc(SHORT_VRS.has(vr) ? 8 : 12);
  head.writeUInt16LE(group, 0);
  head.writeUInt16LE(elem, 2);
  head.write(vr, 4, 'ascii');
  if (SHORT_VRS.has(vr)) {
    head.writeUInt16LE(data.length, 6);
  } else {
    // bytes 6-7 reservados (zero), length de 32 bits no offset 8
    head.writeUInt32LE(data.length, 8);
  }
  return Buffer.concat([head, data]);
}

function strEl(group: number, elem: number, vr: string, value: string): Buffer {
  // PN/LO/etc. podem conter caracteres multi-byte (acentos). Usar latin1
  // preserva o round-trip byte-a-byte com o dicom-parser (que devolve a
  // string como latin1/binary por padrão). Padding com 0x00 quando ímpar.
  // VRs de texto usam espaço (0x20) como padding; UI usa null (0x00).
  const padByte = vr === 'UI' ? 0x00 : 0x20;
  const raw = Buffer.from(value, 'latin1');
  return element(group, elem, vr, padBuffer(raw, padByte));
}

export function buildDicomFixture(input: DicomFixtureInput = {}): Buffer {
  const rows = input.rows ?? 2;
  const columns = input.columns ?? 2;
  const samplesPerPixel = input.samplesPerPixel ?? 3;
  const photometric = input.photometricInterpretation ?? 'RGB';
  const planarConfiguration = input.planarConfiguration ?? 0;
  const bitsAllocated = input.bitsAllocated ?? 8;

  const dataset: Buffer[] = [];

  // Group 0008
  if (input.studyDescription !== undefined) {
    dataset.push(strEl(0x0008, 0x1030, 'LO', input.studyDescription));
  }
  if (input.studyDate !== undefined) {
    dataset.push(strEl(0x0008, 0x0020, 'DA', input.studyDate));
  }

  // Group 0010 (Patient)
  if (input.patientName !== undefined) {
    dataset.push(strEl(0x0010, 0x0010, 'PN', input.patientName));
  }
  if (input.patientBirthDate !== undefined) {
    dataset.push(strEl(0x0010, 0x0030, 'DA', input.patientBirthDate));
  }
  if (input.patientSex !== undefined) {
    dataset.push(strEl(0x0010, 0x0040, 'CS', input.patientSex));
  }

  // Group 0020
  if (input.laterality !== undefined) {
    dataset.push(strEl(0x0020, 0x0062, 'CS', input.laterality));
  }

  // Group 0028 (Image Pixel) — ordenado por element number
  dataset.push(element(0x0028, 0x0002, 'US', u16(samplesPerPixel))); // SamplesPerPixel
  dataset.push(strEl(0x0028, 0x0004, 'CS', photometric)); // PhotometricInterpretation
  dataset.push(element(0x0028, 0x0006, 'US', u16(planarConfiguration))); // PlanarConfiguration
  dataset.push(element(0x0028, 0x0010, 'US', u16(rows))); // Rows
  dataset.push(element(0x0028, 0x0011, 'US', u16(columns))); // Columns
  dataset.push(element(0x0028, 0x0100, 'US', u16(bitsAllocated))); // BitsAllocated
  dataset.push(element(0x0028, 0x0101, 'US', u16(bitsAllocated))); // BitsStored
  dataset.push(element(0x0028, 0x0102, 'US', u16(bitsAllocated - 1))); // HighBit
  dataset.push(element(0x0028, 0x0103, 'US', u16(0))); // PixelRepresentation

  // PixelData — 8 bits alocados → VR OB (uncompressed, native).
  // skipPixelData gera um placeholder mínimo para testar guards de dimensão
  // sem alocar `rows * columns * channels` bytes.
  const pixel = input.skipPixelData
    ? Buffer.alloc(2)
    : Buffer.alloc(rows * columns * samplesPerPixel);
  for (let i = 0; i < pixel.length; i++) pixel[i] = (i * 37) % 256;
  dataset.push(element(0x7fe0, 0x0010, 'OB', pixel)); // PixelData

  const datasetBuf = Buffer.concat(dataset);

  // File Meta Information (group 0002) — sempre Explicit VR LE.
  const metaBody = Buffer.concat([
    element(0x0002, 0x0001, 'OB', Buffer.from([0x00, 0x01])), // FileMetaInformationVersion
    strEl(0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.77.1.5.1'), // MediaStorageSOPClassUID (OPT8 Photo)
    strEl(0x0002, 0x0003, 'UI', '1.2.826.0.1.3680043.8.498.1'), // MediaStorageSOPInstanceUID
    strEl(0x0002, 0x0010, 'UI', EXPLICIT_VR_LE), // TransferSyntaxUID
    strEl(0x0002, 0x0012, 'UI', '1.2.826.0.1.3680043.8.498'), // ImplementationClassUID
  ]);
  const groupLength = element(0x0002, 0x0000, 'UL', u32(metaBody.length));

  return Buffer.concat([
    Buffer.alloc(128, 0), // preamble
    Buffer.from('DICM', 'ascii'),
    groupLength,
    metaBody,
    datasetBuf,
  ]);
}
