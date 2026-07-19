import { Injectable } from '@nestjs/common';

@Injectable()
export class SlugService {
  async generateUniqueSlug(
    name: string,
    existsCallback: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    // Trim whitespace, lowercase, normalize unicode, replace spaces with hyphens, and strip unsupported characters
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD') // Normalize unicode
      .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Strip unsupported characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // De-duplicate hyphens
      .replace(/(^-|-$)/g, ''); // Trim hyphens from ends

    let slug = baseSlug || 'unnamed';
    let counter = 1;

    while (await existsCallback(slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }
}
