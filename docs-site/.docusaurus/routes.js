import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '53a'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'a0b'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'e79'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'd05'),
            routes: [
              {
                path: '/docs/api/openapi',
                component: ComponentCreator('/docs/api/openapi', '39f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture/authentication',
                component: ComponentCreator('/docs/architecture/authentication', 'b2b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture/core',
                component: ComponentCreator('/docs/architecture/core', '077'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture/infrastructure',
                component: ComponentCreator('/docs/architecture/infrastructure', '8bd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/concepts/theory',
                component: ComponentCreator('/docs/concepts/theory', '32d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '61d'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
