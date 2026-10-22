import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import GithubStar from '@site/src/components/GithubStar';

// Navbar items of `type: 'custom-githubStar'` render the GitHub star button
export default {
  ...ComponentTypes,
  'custom-githubStar': GithubStar,
};
