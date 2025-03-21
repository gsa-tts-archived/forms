import { type PackageDownloadPattern } from '.';
import { PatternBuilder } from '../../pattern';

export class PackageDownload extends PatternBuilder<PackageDownloadPattern> {
  toPattern(): PackageDownloadPattern {
    return {
      id: this.id,
      type: 'package-download',
      data: this.data,
    };
  }
}
