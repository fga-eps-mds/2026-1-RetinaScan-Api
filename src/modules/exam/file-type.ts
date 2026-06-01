export type DetectedFileType = 'dicom' | 'jpeg' | 'png' | 'unknown';

const DICM_OFFSET = 128;
const DICM_MARKER = 'DICM';

export function detectFileType(buffer: Buffer): DetectedFileType {
  if (
    buffer.length >= DICM_OFFSET + 4 &&
    buffer.toString('ascii', DICM_OFFSET, DICM_OFFSET + 4) === DICM_MARKER
  ) {
    return 'dicom';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }

  return 'unknown';
}
