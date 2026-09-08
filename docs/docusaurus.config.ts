import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'An open-source hiring platform to streamline recruitment and hire faster.',
  tagline: 'An open-source applicant tracking system for clear, adaptable hiring.',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://openats.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'chamals3n4',
  projectName: 'OpenATS',

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/chamals3n4/OpenATS/tree/main/docs/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/chamals3n4/OpenATS/tree/main/docs/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/brand/openats-logo.png',
    metadata: [
      {name: 'keywords', content: 'open source applicant tracking system, ATS, recruitment software, hiring platform, candidate tracking, interview management'},
      {name: 'author', content: 'OpenATS contributors'},
      {name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'},
      {property: 'og:site_name', content: 'OpenATS'},
      {property: 'og:type', content: 'website'},
      {property: 'og:image:alt', content: 'OpenATS open-source hiring platform'},
      {name: 'twitter:card', content: 'summary_large_image'},
      {name: 'theme-color', content: '#198754'},
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'OpenATS',
      logo: {
        alt: 'OpenATS logo',
        src: 'img/brand/openats-logo.png',
        srcDark: 'img/brand/openats-logo-white.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
          className: 'navbar-docs-link',
        },
        {
          href: 'https://github.com/chamals3n4/OpenATS',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Get started',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/chamals3n4/OpenATS',
            },
            {
              label: 'Live demo',
              href: 'https://demo.openats.dev',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Contributing',
              href: 'https://github.com/chamals3n4/OpenATS/blob/main/CONTRIBUTING.md',
            },
            {
              label: 'Apache 2.0 License',
              href: 'https://github.com/chamals3n4/OpenATS/blob/main/LICENSE',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} OpenATS. Licensed under Apache 2.0.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
