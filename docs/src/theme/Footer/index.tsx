import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import GithubStar from '@site/src/components/GithubStar';
import {CONTACT_EMAIL} from '@site/src/components/Marketing/offer';
import styles from './styles.module.css';

const GITHUB = 'https://github.com/chamals3n4/OpenATS';

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
              <img src={logo} alt="" className={styles.logoLight} width={34} height={34} />
              <img src={logoDark} alt="" className={styles.logoDark} width={34} height={34} />
              OpenATS
            </Link>
            <p>
              An open-source applicant tracking system you can host yourself for free.
            </p>
            <div className={styles.aboutActions}>
              <GithubStar />
              <a className={styles.mail} href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </div>
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
          <span>© {new Date().getFullYear()} OpenATS</span>
          <span>
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
