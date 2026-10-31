import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {HugeiconsIcon, type IconSvgElement} from '@hugeicons/react';
import {BookOpen01Icon, Clock01Icon, GithubIcon, Mail01Icon, PlayCircleIcon} from '@hugeicons/core-free-icons';
import {CONTACT_EMAIL, mailto} from '@site/src/components/Marketing/offer';
import ContactForm from '@site/src/components/Marketing/ContactForm';
import styles from '@site/src/components/Marketing/marketing.module.css';

const GITHUB = 'https://github.com/chamals3n4/OpenATS';
const DEMO = 'https://demo.openats.dev';

const ELSEWHERE: [IconSvgElement, string, string, string][] = [
  [GithubIcon, 'GitHub', 'Source code and issue tracker', GITHUB],
  [PlayCircleIcon, 'Live demo', 'Explore OpenATS with sample data', DEMO],
  [BookOpen01Icon, 'Documentation', 'Setup guides and feature reference', '/docs/intro'],
];

export default function Contact(): ReactNode {
  return (
    <Layout
      title="Contact"
      description="Contact the OpenATS team about self-hosting or moving your hiring from another tool."
    >
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <Heading as="h1" className={styles.title}>
              Contact <em>the OpenATS team</em>
            </Heading>
            <p className={`${styles.lede} ${styles.ledeWide}`}>
              Questions about self-hosting OpenATS or migrating from another ATS. Messages are answered by the team that
              builds OpenATS.
            </p>

            <div className={styles.contactGrid}>
              <div className={styles.formCard}>
                <ContactForm />
              </div>

              <aside className={styles.aside}>
                <a className={styles.contactCard} href={mailto('Hello OpenATS')}>
                  <span className={styles.cardIcon}>
                    <HugeiconsIcon icon={Mail01Icon} className={styles.icon} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span>
                    <b>Email us directly</b>
                    <small>{CONTACT_EMAIL}</small>
                  </span>
                </a>
                <div className={styles.contactCard}>
                  <span className={styles.cardIcon}>
                    <HugeiconsIcon icon={Clock01Icon} className={styles.icon} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span>
                    <b>Response time</b>
                    <small>Within one working day</small>
                  </span>
                </div>
                <p className={styles.asideLabel}>Resources</p>
                {ELSEWHERE.map(([icon, title, text, href]) => {
                  const body = (
                    <>
                      <span className={styles.cardIcon}>
                        <HugeiconsIcon icon={icon} className={styles.icon} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span>
                        <b>{title}</b>
                        <small>{text}</small>
                      </span>
                    </>
                  );
                  return href.startsWith('/') ? (
                    <Link key={title} className={styles.contactCard} to={href}>
                      {body}
                    </Link>
                  ) : (
                    <a key={title} className={styles.contactCard} href={href} target="_blank" rel="noreferrer">
                      {body}
                    </a>
                  );
                })}
              </aside>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
