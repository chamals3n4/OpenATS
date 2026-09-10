import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const features = [
  ['Job management', 'Create roles, define requirements, and establish the hiring stages for every opening.'],
  ['Candidate tracking', 'Keep resumes, activity, notes, feedback, and progress together in one candidate record.'],
  ['Interview management', 'Coordinate schedules, collect structured feedback, and make every next step visible.'],
  ['Hiring team collaboration', 'Give hiring managers and interviewers the shared context they need to make decisions.'],
  ['AI resume parsing', 'Extract candidate details from resumes and surface useful signals for human review.'],
  ['Career pages', 'Publish open roles on a branded careers site that fits your organization.'],
] as const;

const technologies = [
  ['Next.js', 'nextdotjs.svg', 'https://nextjs.org'],
  ['Express', 'express.svg', 'https://expressjs.com'],
  ['PostgreSQL', 'postgresql.png', 'https://www.postgresql.org'],
  ['Redis', 'redis.svg', 'https://redis.io'],
  ['BullMQ', 'bullmq.png', 'https://bullmq.io'],
  ['Drizzle', 'drizzle.svg', 'https://orm.drizzle.team'],
  ['Socket.IO', 'socketdotio.svg', 'https://socket.io'],
  ['TypeScript', 'typescript.svg', 'https://www.typescriptlang.org'],
  ['WSO2 Identity Platform', 'wso2.webp', 'https://wso2.com/identity-and-access-management/'],
] as const;

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'OpenATS',
      url: 'https://openats.dev',
      logo: 'https://openats.dev/img/brand/openats-logo.png',
      sameAs: ['https://github.com/chamals3n4/OpenATS'],
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
      codeRepository: 'https://github.com/chamals3n4/OpenATS',
      license: 'https://www.apache.org/licenses/LICENSE-2.0',
    },
  ],
};

function Arrow(): ReactNode {
  return <span aria-hidden="true">→</span>;
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Open-source hiring infrastructure"
      description="OpenATS is an open-source applicant tracking system for teams that want a clear, adaptable hiring process."
    >
      <main className="openats-landing-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />
        <section className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <div className={styles.heroCopy}>
              <Heading as="h1">Hiring infrastructure<br/><em>you can own.</em></Heading>
              <p className={styles.lede}>OpenATS gives recruiting teams one clear place to plan roles, evaluate candidates, coordinate interviews, and make better decisions.</p>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} to="/docs/intro">Read the documentation <Arrow/></Link>
                <a className={styles.secondaryAction} href="https://demo.openats.dev">View live demo <span aria-hidden="true">↗</span></a>
              </div>
            </div>
          </div>
          <div className={styles.heroFoot}>
            <span>Structured hiring workflows</span><span>Shared candidate context</span><span>Built for accountable teams</span>
          </div>
        </section>

        <section className={styles.intro}>
          <div className={`container ${styles.introGrid}`}>
            <div>
              <Heading as="h2">Every decision has a <span className={styles.accent}>place.</span></Heading>
            </div>
            <div className={styles.introCopy}>
              <p>Hiring rarely breaks because a team lacks tools. It breaks when information is scattered and ownership is unclear. OpenATS connects the work around an open role so the people involved can move with context and confidence.</p>
              <Link className={styles.inlineLink} to="/docs/intro">Learn what OpenATS provides <Arrow/></Link>
            </div>
          </div>
        </section>

        <section className={styles.workflow}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div><Heading as="h2">From opening to <span className={styles.accent}>offer.</span></Heading></div>
              <p>OpenATS follows the work your team already does, while making the handoffs between people and stages easier to manage.</p>
            </div>
            <div className={styles.workflowGrid}>
              <article><span>01</span><Heading as="h3">Plan the role</Heading><p>Create a job, define its requirements, choose a pipeline, and invite the right people into the hiring team.</p></article>
              <article><span>02</span><Heading as="h3">Evaluate together</Heading><p>Track applicants, collect interview feedback, and keep assessments and notes connected to the candidate record.</p></article>
              <article><span>03</span><Heading as="h3">Decide with context</Heading><p>See each candidate’s full history before moving them forward, sending an offer, or closing the loop.</p></article>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div><Heading as="h2">The work, in <span className={styles.accent}>one place.</span></Heading></div>
              <p>Purposeful features for the core of a hiring operation. No disconnected point tools required.</p>
            </div>
            <div className={styles.featureGrid}>
              {features.map(([title, text]) => <article className={styles.feature} key={title}><Heading as="h3">{title}</Heading><p>{text}</p></article>)}
            </div>
          </div>
        </section>

        <section className={styles.principles}>
          <div className={`container ${styles.principlesGrid}`}>
            <div><Heading as="h2">A system your team can <span className={styles.accent}>understand.</span></Heading></div>
            <div className={styles.principleList}>
              <article><Heading as="h3">Clear ownership</Heading><p>Keep your process, candidate records, and decision history visible to the people responsible for hiring.</p></article>
              <article><Heading as="h3">Useful automation</Heading><p>Use background resume analysis to reduce manual work while people remain responsible for every hiring decision.</p></article>
              <article><Heading as="h3">Built to adapt</Heading><p>Start with a complete applicant tracking system and extend it when your process needs something specific.</p></article>
            </div>
          </div>
        </section>

        <section className={styles.technology}>
          <div className={`container ${styles.stackShowcase}`}>
            <div className={styles.centeredHeader}>
              <Heading as="h2">Built on proven <span className={styles.accent}>technology.</span></Heading>
              <p>OpenATS combines reliable open-source technologies for a fast, maintainable platform.</p>
            </div>
            <div className={styles.techGrid}>
              {technologies.map(([name, image, href]) => <a className={styles.techTile} href={href} target="_blank" rel="noreferrer" key={name}><img src={`/img/stack/${image}`} alt={`${name} logo`}/><span>{name}</span></a>)}
            </div>
            <Link to="/docs/developer/architecture" className={styles.inlineLink}>Explore the architecture <Arrow/></Link>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className={`container ${styles.finalInner}`}>
            <Heading as="h2">Build a hiring process<br/>your team can <span className={styles.accent}>trust.</span></Heading>
            <p>Read the guides, run OpenATS locally, and shape it around the way your organization hires.</p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} to="/docs/getting-started/make-setup">Get started <Arrow/></Link>
              <a className={styles.secondaryAction} href="https://github.com/chamals3n4/OpenATS">View on GitHub <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
