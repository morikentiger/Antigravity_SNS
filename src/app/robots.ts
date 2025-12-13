import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/messages/', '/profile/'],
        },
        sitemap: 'https://www.antigravity-sns.online/sitemap.xml',
    };
}
