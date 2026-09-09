import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    {type: 'category', label: 'Overview', items: ['intro', 'developer/architecture']},
    {type: 'category', label: 'Get started', items: ['getting-started/make-setup', {type: 'doc', id: 'getting-started/quick-start', label: 'Manual setup'}, 'administration/iam-setup']},
    {type: 'category', label: 'Using OpenATS', items: [{type: 'doc', id: 'using-openats/first-login-and-company-setup', label: 'Company setup'}, 'using-openats/manage-jobs', 'using-openats/hiring-pipeline', 'using-openats/jobs-and-candidates', 'using-openats/templates', 'using-openats/interviews', 'using-openats/assessments', 'using-openats/offers', 'using-openats/rejecting-candidates']},
    {type: 'doc', id: 'careers-page-integration', label: 'Careers page'},
    {type: 'category', label: 'Operations', items: ['operations/deployment']},
    {type: 'category', label: 'Developer guide', items: ['developer/testing', 'developer/contributing']},
  ],

  // But you can create a sidebar manually
  /*
  tutorialSidebar: [
    'intro',
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
   */
};

export default sidebars;
