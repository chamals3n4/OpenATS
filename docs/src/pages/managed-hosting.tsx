import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {HugeiconsIcon, type IconSvgElement} from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  CloudServerIcon,
  CustomerSupportIcon,
  DatabaseBackupIcon,
  DatabaseIcon,
  FileExportIcon,
  FolderLockIcon,
  Globe02Icon,
  Mail01Icon,
  RefreshIcon,
  UserIcon,
  UserGroupIcon,
  CreditCardIcon,
} from '@hugeicons/core-free-icons';
import {CLOUD_PRICE, FREE_TIER} from '@site/src/components/Marketing/offer';
import Faq from '@site/src/components/Marketing/Faq';
import styles from '@site/src/components/Marketing/marketing.module.css';

// What the hero's status card shows: the jobs we do for each workspace
const STATUS: [string, string][] = [
  ['Database backup', 'Completed nightly'],
  ['Application version', 'Latest release installed'],
  ['Email delivery', 'Domain verified and monitored'],
  ['TLS certificate', 'Valid, renewed automatically'],
];

const HANDLED: [IconSvgElement, string, string][] = [
  [CloudServerIcon, 'Hosting and updates', 'The application, database and background worker are run for you, and every release is installed.'],
  [DatabaseBackupIcon, 'Nightly backups', 'Your database is backed up every night, so data can be restored when it is needed.'],
  [Mail01Icon, 'Email delivery', 'Candidate emails are sent from your own domain, with delivery configured and monitored.'],
  [FolderLockIcon, 'Private CV storage', 'CVs are kept in private storage and are only available to the job’s hiring team.'],
  [FileExportIcon, 'Data portability', 'The same open-source application. Request a copy of your data and self-host at any time.'],
  [CustomerSupportIcon, 'Direct support', 'Support requests are answered by the engineers who build OpenATS.'],
];

// Who does the work: self-hosted (you) against Cloud (us)
const COMPARE: [IconSvgElement, string, string, string][] = [
  [CloudServerIcon, 'Server hosting', 'You', 'Done for you'],
  [RefreshIcon, 'Software updates', 'You', 'Done for you'],
  [DatabaseIcon, 'Nightly backups', 'You', 'Done for you'],
  [Globe02Icon, 'Email and file storage', 'You', 'Done for you'],
  [UserGroupIcon, 'Users and candidates', 'Unlimited', 'Unlimited'],
  [CreditCardIcon, 'Price', 'Free, plus your own server costs', `Free for ${FREE_TIER.jobs} jobs, then ${CLOUD_PRICE.amount}/month`],
];

const FAQ: [string, string][] = [
  ['Is it the same as the open-source version?', 'Yes. Cloud runs the same code that is on GitHub, with every feature. We only take the running of it off your hands.'],
  ['Is there a free plan?', `Yes. Free gives you ${FREE_TIER.jobs} active jobs with every core feature, no card required. Pro removes the job limit and adds support from our team.`],
  ['Do you charge per user?', 'No. One flat monthly price covers your whole hiring team and every candidate.'],
  ['Can I move to my own servers later?', 'Yes. We give you a full copy of your database and files, and the self-hosting guide covers the rest.'],
  ['How long does setup take?', 'Most workspaces are ready within one working day. Your first administrator receives a sign-in link by email.'],
];

function Who({value}: {value: string}): ReactNode {
  if (value === 'Done for you') {
    return (
      <span className={styles.pillManaged}>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className={styles.pillIcon} strokeWidth={2} aria-hidden="true" />
        Managed for you
      </span>
    );
  }
  if (value === 'You') {
    return (
      <span className={styles.pillYou}>
        <HugeiconsIcon icon={UserIcon} className={styles.pillIcon} strokeWidth={1.75} aria-hidden="true" />
        Your responsibility
      </span>
    );
  }
  return value;
}

export default function Managed(): ReactNode {
  return (
    <Layout
      title="OpenATS Cloud"
      description="OpenATS Cloud: the open-source applicant tracking system, hosted, updated and backed up for you. Free for 2 jobs."
    >
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroGrid}>
              <div>
                <Heading as="h1" className={styles.title}>
                  Fully managed <em>OpenATS platform.</em>
                </Heading>
                <p className={styles.lede}>
                  We host, update and back up OpenATS for you. It is the same open-source application, with the
                  infrastructure, email delivery and storage run by the team that builds it.
                </p>
                <div className={styles.actions}>
                  <Link className={styles.primary} to="/contact">
                    Start free
                  </Link>
                  <Link className={styles.secondary} to="/pricing">
                    See pricing
                  </Link>
                </div>
                <p className={styles.heroNote}>
                  <b>Free plan:</b> {FREE_TIER.jobs} active jobs, every core feature, no card required.
                </p>
              </div>

              <div className={styles.status} aria-label="What we look after in every workspace">
                <div className={styles.statusHead}>
                  <span className={styles.statusDot} />
                  <b>Managed service</b>
                  <span className={styles.statusTag}>Operational</span>
                </div>
                <ul className={styles.statusList}>
                  {STATUS.map(([label, detail]) => (
                    <li key={label}>
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} className={styles.cellIcon} strokeWidth={2} aria-hidden="true" />
                      <span>
                        <b>{label}</b>
                        <small>{detail}</small>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={styles.statusFoot}>Monitored by the OpenATS team for every Cloud workspace.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHead}>
              <Heading as="h2">What OpenATS Cloud manages</Heading>
              <p>Infrastructure, maintenance and support, handled by the team that builds OpenATS.</p>
            </div>
            <div className={styles.grid3}>
              {HANDLED.map(([icon, title, text]) => (
                <article className={styles.card} key={title}>
                  <span className={styles.cardIcon}>
                    <HugeiconsIcon icon={icon} className={styles.icon} strokeWidth={1.75} aria-hidden="true" />
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
            <div className={styles.sectionHead}>
              <Heading as="h2">Self-hosted vs. OpenATS Cloud</Heading>
              <p>The same application and features. The difference is who operates it.</p>
            </div>
            <table className={`${styles.table} ${styles.tableAccent}`}>
              <thead>
                <tr>
                  <th />
                  <th>Self-hosted</th>
                  <th className={styles.thFeatured}>OpenATS Cloud</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([icon, row, self, cloud]) => (
                  <tr key={row}>
                    <th scope="row">
                      <span className={styles.rowLabel}>
                        <span className={styles.rowIconBox}>
                          <HugeiconsIcon icon={icon} className={styles.rowIcon} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        {row}
                      </span>
                    </th>
                    <td>
                      <Who value={self} />
                    </td>
                    <td className={styles.tdFeatured}>
                      <Who value={cloud} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={`${styles.sectionHead} ${styles.sectionHeadCenter}`}>
              <Heading as="h2">Frequently asked questions</Heading>
            </div>
            <Faq items={FAQ} />
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.band}>
              <div>
                <Heading as="h2">Move your hiring to OpenATS Cloud</Heading>
                <p>Start on the Free plan with {FREE_TIER.jobs} active jobs. No card is required.</p>
              </div>
              <div className={styles.actions}>
                <Link className={styles.primary} to="/contact">
                  Start free
                </Link>
                <Link className={styles.secondary} to="/docs/getting-started/make-setup">
                  Host it yourself
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
