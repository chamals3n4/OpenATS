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
    {type: 'doc', id: 'intro', label: 'What Is OpenATS?'},
    {type: 'category', label: 'Get Started', items: ['getting-started/make-setup', {type: 'doc', id: 'getting-started/quick-start', label: 'Manual Setup'}, 'getting-started/environment-variables', 'getting-started/deployment', 'getting-started/troubleshooting', 'administration/authentication']},
    {
      type: 'category',
      label: 'Using OpenATS',
      link: {type: 'doc', id: 'using-openats/index'},
      items: [
        {type: 'category', label: 'Set Up Your Workspace', collapsed: false, items: ['using-openats/first-login-and-company-setup', 'using-openats/users-and-roles', 'using-openats/dashboard-overview']},
        {type: 'category', label: 'Prepare Your Hiring Tools', collapsed: false, items: ['using-openats/templates', 'using-openats/assessments', 'using-openats/assignments']},
        {type: 'category', label: 'Open a Job', collapsed: false, items: ['using-openats/manage-jobs', 'using-openats/hiring-pipeline', 'careers-page-integration']},
        {type: 'category', label: 'Assess Candidates', collapsed: false, items: ['using-openats/jobs-and-candidates', 'using-openats/candidate-scoring', 'using-openats/interviews']},
        {type: 'category', label: 'Make a Decision', collapsed: false, items: ['using-openats/offers', 'using-openats/rejecting-candidates', 'administration/deleting-candidate-data']},
      ],
    },
    {type: 'category', label: 'Developer Guide', items: ['developer/architecture', 'developer/development-guide', 'developer/testing', 'developer/contributing']},
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
