import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BlogListPaginator from '@theme/BlogListPaginator';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import SearchMetadata from '@theme/SearchMetadata';
import {HtmlClassNameProvider, PageMetadata, ThemeClassNames} from '@docusaurus/theme-common';
import type {Props} from '@theme/BlogListPage';
import styles from './styles.module.css';

type Post = Props['items'][number]['content']['metadata'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
}

function PostRow({post}: {post: Post}): ReactNode {
  const author = post.authors[0];
  return (
    <Link to={post.permalink} className={styles.row}>
      <div className={styles.rowMain}>
        <Heading as="h2">{post.title}</Heading>
        <p>{post.description}</p>
        <div className={styles.meta}>
          {author?.imageURL && <img src={author.imageURL} alt="" className={styles.avatar} width={22} height={22} />}
          {author?.name && <b>{author.name}</b>}
          <span aria-hidden="true">·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {post.readingTime !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span>{Math.max(1, Math.ceil(post.readingTime))} min read</span>
            </>
          )}
          {post.tags.map((tag) => (
            <span key={tag.permalink} className={styles.tag}>
              {tag.label}
            </span>
          ))}
        </div>
      </div>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </Link>
  );
}

/** The blog index: one row per post, newest first. */
export default function BlogListPage(props: Props): ReactNode {
  const {metadata, items} = props;

  return (
    <HtmlClassNameProvider className={clsx(ThemeClassNames.wrapper.blogPages, ThemeClassNames.page.blogListPage)}>
      <PageMetadata title={metadata.blogTitle} description={metadata.blogDescription} />
      <SearchMetadata tag="blog_posts_list" />
      <BlogListPageStructuredData {...props} />
      <Layout>
        <main className={styles.page}>
          <div className={clsx('container', styles.inner)}>
            <Heading as="h1" className={styles.title}>
              News and updates from <em>the OpenATS team</em>
            </Heading>
            <p className={styles.lede}>
              Release notes, product announcements and guides to hiring with an open-source applicant tracking system.
            </p>

            <div className={styles.list}>
              {items.map(({content}) => (
                <PostRow key={content.metadata.permalink} post={content.metadata} />
              ))}
            </div>

            <BlogListPaginator metadata={metadata} />
          </div>
        </main>
      </Layout>
    </HtmlClassNameProvider>
  );
}
