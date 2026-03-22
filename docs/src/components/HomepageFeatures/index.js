import Heading from "@theme/Heading";
import styles from "./styles.module.css";

const FeatureList = [
  {
    title: "Job & Requisition Management",
    description: (
      <>
        Create, manage, and publish job openings with structured details and
        requirements in one place.
      </>
    ),
  },
  {
    title: "Hiring Pipeline",
    description: (
      <>
        Organize your hiring process with customizable stages and track
        candidates through each step.
      </>
    ),
  },
  {
    title: "Built-in Assessments",
    description: (
      <>
        Create & Assign assessments to candidates at each stage and evaluate
        them consistently
      </>
    ),
  },
  {
    title: "Collaboration & Offers",
    description: (
      <>Share feedback, track decisions, and manage offers with your team</>
    ),
  },
  {
    title: "AI CV Parsing",
    description: (
      <>
        Automatically extract and organize candidate data from resumes using AI
      </>
    ),
  },
  {
    title: "Career Page Builder",
    description: (
      <>Build your own custom career page to match your brand and website</>
    ),
  },
];

function Feature({ title, description }) {
  return (
    <article className={styles.featureCard}>
      <div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </article>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionIntro}>
          <Heading as="h2">What is OpenATS?</Heading>
          <p>
            OpenATS is a modern open source applicant tracking system built to
            make hiring transparent, customizable, and accessible for teams
            everywhere.
          </p>
          <div className={styles.sectionImageWrap}>
            <img
              src="/img/whatis.png"
              alt="OpenATS pipeline preview"
              className={styles.sectionImage}
              loading="lazy"
            />
          </div>
        </div>
        <div className={styles.featuresGrid}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
