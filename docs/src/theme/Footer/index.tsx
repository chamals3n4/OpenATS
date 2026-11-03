import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {HugeiconsIcon} from '@hugeicons/react';
import {CopyrightIcon, LicenseIcon} from '@hugeicons/core-free-icons';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const GITHUB = 'https://github.com/chamals3n4/OpenATS';
const BUILTLIST = 'https://builtlist.space/products/openats?utm_source=badge&utm_medium=embed';

// Column title, then [label, link]. Links starting with http open in a new tab.
const COLUMNS: [string, [string, string][]][] = [
  [
    'Product',
    [
      // Hidden for now, see the navbar items in docusaurus.config.ts
      // ['Managed hosting', '/managed-hosting'],
      // ['Pricing', '/pricing'],
      ['Blog', '/blog'],
      ['Live demo', 'https://demo.openats.dev'],
      ['Contact', '/contact'],
    ],
  ],
  [
    'Documentation',
    [
      ['Introduction', '/docs/intro'],
      ['Quick start', '/docs/getting-started/make-setup'],
      ['Deployment', '/docs/getting-started/deployment'],
      ['Architecture', '/docs/developer/architecture'],
    ],
  ],
  [
    'Open source',
    [
      ['GitHub', GITHUB],
      ['Contributing', `${GITHUB}/blob/main/CONTRIBUTING.md`],
      ['Releases', `${GITHUB}/releases`],
      ['Report an issue', `${GITHUB}/issues`],
    ],
  ],
];

function FooterLink({label, to}: {label: string; to: string}): ReactNode {
  return to.startsWith('http') ? (
    <a href={to} target="_blank" rel="noreferrer">
      {label}
    </a>
  ) : (
    <Link to={to}>{label}</Link>
  );
}

/** The site footer: the project on the left, links in columns, licence and copyright underneath. */
export default function Footer(): ReactNode {
  const logo = useBaseUrl('/img/brand/openats-logo.png');
  const logoDark = useBaseUrl('/img/brand/openats-logo-white.png');

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.about}>
            <Link to="/" className={styles.brand}>
              <img src={logo} alt="" className={styles.logoLight} width={40} height={40} />
              <img src={logoDark} alt="" className={styles.logoDark} width={40} height={40} />
              OpenATS
            </Link>
            <p>
              An open-source applicant tracking system you can host yourself for free.
            </p>
            {/* One badge per theme, switched like the logo above */}
            <a className={styles.badge} href={BUILTLIST} target="_blank" rel="noopener">
              <img
                src="https://builtlist.space/badges/featured-light.png"
                alt="Featured on BuiltList"
                className={styles.logoLight}
                width={200}
                height={58}
              />
              <img
                src="https://builtlist.space/badges/featured-dark.png"
                alt="Featured on BuiltList"
                className={styles.logoDark}
                width={200}
                height={55}
              />
            </a>
          </div>

          {COLUMNS.map(([title, links]) => (
            <nav key={title} className={styles.column} aria-label={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(([label, to]) => (
                  <li key={label}>
                    <FooterLink label={label} to={to} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className={styles.bottom}>
          <span className={styles.bottomItem}>
            <HugeiconsIcon icon={CopyrightIcon} size={16} strokeWidth={1.8} aria-label="Copyright" />
            {new Date().getFullYear()} OpenATS
          </span>
          <span className={styles.bottomItem}>
            <HugeiconsIcon icon={LicenseIcon} size={16} strokeWidth={1.8} aria-hidden />
            Released under the{' '}
            <a href={`${GITHUB}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              Apache 2.0 licence
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
