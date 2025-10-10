export interface MinioFileInfo {
  /** Публичный URL, по которому доступен файл */
  url: string;

  /** MIME-тип файла (image/png, application/pdf и т.п.) */
  mime: string;

  /** Имя файла (например, invoice.pdf) */
  originalName?: string;

  /** Ключ объекта в MinIO (уникальный идентификатор внутри бакета) */
  objectKey: string;

  /** Размер файла в байтах */
  sizeBytes?: number;

  /** Ширина (если это изображение) */
  width?: number;

  /** Высота (если это изображение) */
  height?: number;

  /** Контрольная сумма, если вычисляется */
  checksum?: string;
}
