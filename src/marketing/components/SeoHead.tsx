import { useEffect } from 'react';

type SeoHeadProps = {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: string;
  imagePath?: string;
};

const DEFAULT_SITE_NAME = 'AV TECH ESDEVENIMENTS';
const DEFAULT_BASE_URL = 'https://avtechesdeveniments.com';
const DEFAULT_IMAGE = '/og-image.png';

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

const SeoHead = ({
  title,
  description,
  canonicalPath,
  robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  imagePath = DEFAULT_IMAGE,
}: SeoHeadProps) => {
  useEffect(() => {
    const canonicalUrl = `${DEFAULT_BASE_URL}${canonicalPath}`;
    const imageUrl = imagePath.startsWith('http') ? imagePath : `${DEFAULT_BASE_URL}${imagePath}`;

    document.title = title;

    upsertMeta('meta[name="description"]', { name: 'description' }, description);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, robots);
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, imageUrl);
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, DEFAULT_SITE_NAME);
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, imageUrl);
    upsertMeta('meta[name="twitter:url"]', { name: 'twitter:url' }, canonicalUrl);
    upsertLink('canonical', canonicalUrl);
  }, [canonicalPath, description, imagePath, robots, title]);

  return null;
};

export default SeoHead;
