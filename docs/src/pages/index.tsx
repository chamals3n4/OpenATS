import {useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {HugeiconsIcon, type IconSvgElement} from '@hugeicons/react';
import {
  BriefcaseBusinessIcon,
  CommandLineIcon,
  CoPresentIcon,
  Copy01Icon,
  Github01Icon,
  GithubIcon,
  Quiz03Icon,
  Search01Icon,
  TaskDone01Icon,
  TelegramIcon,
  Tick02Icon,
  UserMultiple02Icon,
  UsersRoundIcon,
} from '@hugeicons/core-free-icons';
import ProductTour from '@site/src/components/ProductTour';
import styles from './index.module.css';

const GITHUB = 'https://github.com/chamals3n4/OpenATS';
const DEMO = 'https://demo.openats.dev';

/** Docker's whale, in Docker's own blue. */
function DockerLogo(): ReactNode {
  return (
    <svg className={styles.icon} viewBox="0 0 340 268" aria-hidden="true">
      <path
        fill="#1D63ED"
        d="M334,110.1c-8.3-5.6-30.2-8-46.1-3.7-.9-15.8-9-29.2-24-40.8l-5.5-3.7-3.7,5.6c-7.2,11-10.3,25.7-9.2,39,.8,8.2,3.7,17.4,9.2,24.1-20.7,12-39.8,9.3-124.3,9.3H0c-.4,19.1,2.7,55.8,26,85.6,2.6,3.3,5.4,6.5,8.5,9.6,19,19,47.6,32.9,90.5,33,65.4,0,121.4-35.3,155.5-120.8,11.2.2,40.8,2,55.3-26,.4-.5,3.7-7.4,3.7-7.4l-5.5-3.7h0ZM85.2,92.7h-36.7v36.7h36.7v-36.7ZM132.6,92.7h-36.7v36.7h36.7v-36.7ZM179.9,92.7h-36.7v36.7h36.7v-36.7ZM227.3,92.7h-36.7v36.7h36.7v-36.7ZM37.8,92.7H1.1v36.7h36.7v-36.7ZM85.2,46.3h-36.7v36.7h36.7v-36.7ZM132.6,46.3h-36.7v36.7h36.7v-36.7ZM179.9,46.3h-36.7v36.7h36.7v-36.7ZM179.9,0h-36.7v36.7h36.7V0Z"
      />
    </svg>
  );
}

// The same icons as the app's sidebar and pages (hugeicons)
function Icon({icon}: {icon: IconSvgElement}): ReactNode {
  return <HugeiconsIcon icon={icon} className={styles.icon} strokeWidth={1.75} aria-hidden="true" />;
}

const features: [IconSvgElement, string, string][] = [
  [BriefcaseBusinessIcon, 'Hiring pipelines', 'Set the stages for each role and move candidates across a shared board. A move can send the next test or task by itself.'],
  [UsersRoundIcon, 'Candidate scores', 'Answers, assessments and interview scorecards add up to one score, with every part shown.'],
  [Quiz03Icon, 'Assessments', 'Timed tests with a server-side clock, graded automatically. Written answers wait for a person.'],
  [TaskDone01Icon, 'Take-home assignments', 'Send a brief and a hand-in form by private link, handed in once before the deadline.'],
  [CoPresentIcon, 'Interview scheduling', 'Candidates pick an open slot. The interviewer gets a calendar entry and a Meet link.'],
  [TelegramIcon, 'Offers', 'Send the offer letter, see when it is opened, and record the answer when it arrives.'],
  [UserMultiple02Icon, 'Hiring teams', 'Super admins see every job. Managers and interviewers see only the jobs they are on.'],
  [Search01Icon, 'CV search', 'CV text is read on your own server, with no outside service, and is fully searchable.'],
];


// Core first, then the parts around it
const stack = [
  ['TypeScript', 'typescript.svg', 'https://www.typescriptlang.org', 'Type safety across all code'],
  ['Next.js', 'nextdotjs.svg', 'https://nextjs.org', 'Frontend dashboard'],
  ['Express', 'express.svg', 'https://expressjs.com', 'Backend REST API'],
  ['PostgreSQL', 'postgresql.png', 'https://www.postgresql.org', 'Primary database, CV search'],
  ['Drizzle', 'drizzle.svg', 'https://orm.drizzle.team', 'Schema, queries, migrations'],
  ['Better Auth', 'betterauth.svg', 'https://www.better-auth.com', 'Authentication and RBAC'],
  ['Tailwind CSS', 'tailwindcss.svg', 'https://tailwindcss.com', 'Dashboard UI styling'],
  ['Socket.IO', 'socketdotio.svg', 'https://socket.io', 'Real-time updates and chat'],
  ['Redis', 'redis.svg', 'https://redis.io', 'Job queue state store'],
  ['BullMQ', 'bullmq.png', 'https://bullmq.io', 'CV processing in background'],
  ['TanStack Query', 'tanstackquery.svg', 'https://tanstack.com/query', 'Portal data fetching'],
  ['Docker', 'docker.svg', 'https://www.docker.com', 'Containerised setup'],
] as const;

// The image is a placeholder until it is published to the GitHub Container Registry
const QUICKSTART = {
  docker: {
    label: 'Docker',
    note: 'Needs Docker and a .env file filled in from .env.example.',
    lines: ['docker pull ghcr.io/chamals3n4/openats', 'docker run -d -p 3000:3000 \\', '  --env-file .env ghcr.io/chamals3n4/openats'],
  },
  source: {
    label: 'From source',
    note: 'Needs Node.js 22, pnpm and Docker for the local database.',
    lines: ['git clone https://github.com/chamals3n4/OpenATS.git', 'cd OpenATS && make setup', 'make dev'],
  },
};
type QuickstartTab = keyof typeof QUICKSTART;

function Quickstart(): ReactNode {
  const [tab, setTab] = useState<QuickstartTab>('docker');
  const [copied, setCopied] = useState(false);
  const {lines} = QUICKSTART[tab];

  const copy = () => {
    navigator.clipboard?.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={styles.quickstart}>
      <div className={styles.quickstartHead}>
        <p className={styles.quickstartTitle}>Get OpenATS on your own server</p>
        <span className={styles.quickstartMeta}>Apache 2.0</span>
      </div>
      <div className={styles.tabRow}>
      <div className={styles.tabs} role="tablist" aria-label="How to install">
        {(Object.keys(QUICKSTART) as QuickstartTab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? styles.tabActive : styles.tab}
            onClick={() => {
              setTab(key);
              setCopied(false);
            }}
          >
            {key === 'docker' ? <DockerLogo /> : <Icon icon={CommandLineIcon} />}
            {QUICKSTART[key].label}
          </button>
        ))}
      </div>
        <button type="button" className={styles.copy} onClick={copy} aria-label="Copy the commands">
          <Icon icon={copied ? Tick02Icon : Copy01Icon} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className={styles.commandBox} role="tabpanel">
        <pre>
          {lines.map((line) => (
            <code key={line}>
              {line.startsWith(' ') ? ' ' : <span className={styles.prompt}>$</span>} {line.trimStart()}
            </code>
          ))}
        </pre>
      </div>
      <p className={styles.quickstartNote}>{QUICKSTART[tab].note}</p>
      <div className={styles.or}>
        <span>or</span>
      </div>
      <div className={styles.altLinks}>
        <a href={DEMO}>Try the live demo ↗</a>
        <span aria-hidden="true">·</span>
        <Link to="/docs/getting-started/make-setup">Full setup guide →</Link>
      </div>
    </div>
  );
}

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'OpenATS',
      url: 'https://openats.dev',
      logo: 'https://openats.dev/img/brand/openats-logo.png',
      sameAs: [GITHUB],
    },
    {
      '@type': 'WebSite',
      name: 'OpenATS',
      url: 'https://openats.dev',
      description: 'An open-source applicant tracking system for clear, adaptable hiring.',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'OpenATS',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'An open-source applicant tracking system for managing jobs, candidates, interviews, and hiring decisions.',
      url: 'https://openats.dev',
      codeRepository: GITHUB,
      license: 'https://www.apache.org/licenses/LICENSE-2.0',
    },
  ],
};


export default function Home(): ReactNode {
  return (
    <Layout
      title="Open-Source Applicant Tracking System"
      description="OpenATS is an open-source applicant tracking system you host yourself: pipelines, assessments, interviews, offers and a careers page in one place."
    >
      <main className="openats-landing-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />

        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroGrid}>
              <div>
                <Heading as="h1" className={styles.title}>
                  Run your hiring with software <em>you control.</em>
                </Heading>
                <p className={styles.lede}>
                  OpenATS keeps jobs, candidates, assessments, interviews and offers in one place, on your own
                  servers. No per-seat pricing, and your candidates’ data never leaves your hands.
                </p>
                <div className={styles.actions}>
                  <Link className={styles.primary} to="/docs/getting-started/make-setup">
                    Get started
                  </Link>
                  <a
                    className={styles.secondary}
                    href={GITHUB}
                    target="_blank"
                    rel="noreferrer"
                    style={{display: 'inline-flex', alignItems: 'center', gap: '0.4rem'}}
                  >
                    <Icon icon={GithubIcon} />
                    View on GitHub
                  </a>
                  <a className={styles.secondary} href={DEMO}>
                    Live demo ↗
                  </a>
                </div>
              </div>
              <Quickstart />
            </div>
            <ProductTour />
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHead}>
              <Heading as="h2" className={styles.featuresTitle}>
                Everything your hiring team needs
              </Heading>
              <p>The core of a hiring process, built in. AI CV notes are optional and off by default.</p>
            </div>
            <div className={styles.featureGrid}>
              {features.map(([icon, title, text]) => (
                <article className={styles.feature} key={title}>
                  <span className={styles.featureIcon}>
                    <Icon icon={icon} />
                  </span>
                  <Heading as="h3">{title}</Heading>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={`${styles.sectionHead} ${styles.stackHead}`}>
              <div>
                <Heading as="h2" className={styles.featuresTitle}>
                  Built on a proven open-source stack
                </Heading>
                <p>Widely adopted tools your team already knows, so OpenATS is easy to run, maintain and extend.</p>
              </div>
              <Link className={styles.stackLink} to="/docs/developer/architecture">
                How it fits together →
              </Link>
            </div>
            <div className={styles.stackGrid}>
              {stack.map(([name, image, href, role]) => (
                <a className={styles.stackItem} href={href} target="_blank" rel="noreferrer" key={name}>
                  <img src={`/img/stack/${image}`} alt="" />
                  <span>
                    <b>{name}</b>
                    <small>{role}</small>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.closing}`}>
          <div className="container">
            <Heading as="h2">Start with the docs.</Heading>
            <p>Set it up locally in a few minutes, then shape it around the way your team hires.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} to="/docs/intro">
                Read the documentation
              </Link>
              <a className={styles.secondary} href={DEMO}>
                Try the live demo
              </a>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
