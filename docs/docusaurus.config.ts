import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'OpenATS',
  tagline: 'An open-source applicant tracking system for clear, adaptable hiring.',
  favicon: 'img/favicon.png',

  stylesheets: [],

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

  plugins: [
    // Tailwind, used only by the product tour on the home page (src/components/ProductTour/app.css)
    () => ({
      name: 'tailwind',
      configurePostCss(postcssOptions) {
        postcssOptions.plugins.push(require('@tailwindcss/postcss'));
        return postcssOptions;
      },
    }),
  ],
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
          // Keep dependency READMEs out of the docs content glob. The copy
          // page plugin is installed in the workspace and ships Markdown files.
          exclude: ['**/node_modules/**'],
        },
        blog: {
          blogTitle: 'Blog',
          blogDescription: 'Release notes, announcements and guides from the OpenATS team.',
          blogSidebarCount: 0,
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
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
      {name: 'theme-color', content: '#1f6870'},
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
        {to: '/', label: 'Home', position: 'left', activeBaseRegex: '^/$'},
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        // Hidden for now: the pages are kept as src/pages/_managed-hosting.tsx and _pricing.tsx,
        // which Docusaurus does not build. Remove the underscore and these comments to bring them back.
        // {to: '/managed-hosting', label: 'Managed Hosting', position: 'left'},
        // {to: '/pricing', label: 'Pricing', position: 'left'},
        {to: '/blog', label: 'Blog', position: 'left'},
        {to: '/contact', label: 'Contact', position: 'left'},
        {type: 'custom-githubStar', position: 'right'},
      ],
    },
    prism: {
      // GitHub's theme with its bright cyan keys and pink strings swapped for the site's teal and a muted amber
      theme: {
        ...prismThemes.github,
        styles: prismThemes.github.styles.map((s) => {
          const color = {'#00a4db': '#1f6870', '#e3116c': '#b45309'}[s.style.color ?? ''];
          return color ? {...s, style: {...s.style, color}} : s;
        }),
      },
      // Dracula's colours on the site's neutral grey instead of its purple background
      darkTheme: {
        ...prismThemes.dracula,
        plain: {...prismThemes.dracula.plain, backgroundColor: '#171717'},
      },
      // Languages the docs use that Docusaurus does not bundle (`sh` is an alias of bash)
      additionalLanguages: ['bash', 'ini', 'http', 'sql', 'nginx'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
